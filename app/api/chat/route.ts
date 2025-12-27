import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getRelevantMemories, extractMemories } from '@/lib/memory-service';
import { detectMode, getSystemPromptForMode, HOLLY_MODES } from '@/lib/holly-modes';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// HOLLY's system prompt will be dynamically generated per user

/**
 * Helper to send status updates via SSE
 */
function sendStatus(controller: ReadableStreamDefaultController, status: string) {
  const data = `data: ${JSON.stringify({ type: 'status', content: status })}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

/**
 * Helper to send text chunks via SSE
 */
function sendText(controller: ReadableStreamDefaultController, text: string) {
  const data = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

export async function POST(req: NextRequest) {
  console.log('[Chat API] ========== NEW REQUEST ==========');
  
  try {
    // 1. AUTH
    const { userId } = await auth();
    console.log('[Chat API] User ID:', userId || 'anonymous');

    // 2. VALIDATE API KEY
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] ❌ GROQ_API_KEY missing');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 3. PARSE REQUEST
    const body = await req.json();
    const { messages: userMessages, conversationId, files } = body;

    if (!userMessages || !Array.isArray(userMessages)) {
      console.error('[Chat API] Invalid messages format');
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    console.log('[Chat API] Processing', userMessages.length, 'messages');

    // 4. GET OR CREATE USER IN DATABASE
    let dbUserId = null;
    if (userId) {
      let user = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (!user) {
        console.log('[Chat API] 🆕 Creating new user in database');
        user = await prisma.user.create({
          data: {
            clerkUserId: userId,
            email: '',
            name: 'User',
          },
        });
      }
      dbUserId = user.id;
    }

    // 5. GET HOLLY'S PERSONALITY (with user's name, mode, and memories)
    const userName = dbUserId ? (
      await prisma.user.findUnique({ where: { id: dbUserId }, select: { name: true } })
    )?.name || 'Hollywood' : 'Hollywood';
    
    // Detect which mode to use based on latest user message
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const detectedMode = detectMode(latestUserMessage);
    const currentMode = HOLLY_MODES[detectedMode];
    
    console.log('[Chat API] 🎯 Mode detected:', currentMode.name);
    
    // Retrieve relevant memories
    const memoryContext = dbUserId ? await getRelevantMemories(dbUserId) : '';
    
    // Get system prompt for detected mode
    let hollySystemPrompt = getSystemPromptForMode(detectedMode, userName);
    
    // Append memory context if available
    if (memoryContext) {
      hollySystemPrompt += `\n\n## Your Memories\nHere's what you remember about ${userName}:\n${memoryContext}`;
    }
    
    // 6. PREPARE MESSAGES
    const messages = [
      { role: 'system', content: hollySystemPrompt },
      ...userMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    console.log('[Chat API] ✅ Starting Groq stream with HOLLY personality');

    // 7. STREAM RESPONSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendStatus(controller, '🤔 Thinking...');

          // Detect task type and select best model
          const userMessage = userMessages[userMessages.length - 1].content;
          const taskType = detectTaskType(userMessage);
          const modelInfo = getModelInfo(taskType);
          
          console.log(`[Chat API] Task type: ${taskType}`);
          console.log(`[Chat API] Using model: ${modelInfo.model} (${modelInfo.provider})`);

          let fullResponse = '';

          // Route to appropriate model
          if (modelInfo.provider === 'groq') {
            // Use Groq with streaming (llama-3.3-70b)
            const completion = await groq.chat.completions.create({
              messages: messages as any,
              model: modelInfo.model,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true,
            });

            sendStatus(controller, '💭 Responding...');

            // Stream the response
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                sendText(controller, content);
              }
            }
          } else {
            // Use Bytez (GLM models) - no streaming support yet
            sendStatus(controller, `🧠 Using ${modelInfo.model}...`);
            
            const response = await routeToModel(messages, taskType, false);
            fullResponse = response;
            
            // Send full response at once
            sendText(controller, fullResponse);
          }

          console.log('[Chat API] ✅ Stream complete');

          // 7. SAVE TO DATABASE
          if (dbUserId && conversationId) {
            try {
              // Save user message
              const userMessage = await prisma.message.create({
                data: {
                  conversationId,
                  role: 'user',
                  content: userMessages[userMessages.length - 1].content,
                  userId: dbUserId,
                },
              });

              // Save files attached to user message
              if (files && Array.isArray(files) && files.length > 0) {
                for (const file of files) {
                  await prisma.fileUpload.create({
                    data: {
                      userId: dbUserId,
                      conversationId,
                      messageId: userMessage.id,
                      fileName: file.fileName,
                      fileSize: file.fileSize,
                      fileType: file.fileType,
                      blobUrl: file.blobUrl,
                      storagePath: file.storagePath || file.blobUrl,
                      publicUrl: file.publicUrl || file.blobUrl,
                      mimeType: file.mimeType,
                      metadata: file.metadata || {},
                    },
                  });
                }
                console.log('[Chat API] 📎 Saved', files.length, 'file(s) to database');
              }

              // Save assistant message
              await prisma.message.create({
                data: {
                  conversationId,
                  role: 'assistant',
                  content: fullResponse,
                  userId: dbUserId,
                },
              });

              console.log('[Chat API] 💾 Messages saved to database');

              // Extract memories asynchronously (don't await - let it run in background)
              extractMemories(conversationId, [
                ...messages.slice(1), // Skip system prompt
                { role: 'assistant', content: fullResponse },
              ]).catch(err => console.error('[Chat API] Memory extraction failed:', err));
            } catch (dbError) {
              console.error('[Chat API] ⚠️ Database save failed:', dbError);
              // Don't fail the request if database save fails
            }
          }

          // Send done signal
          const doneData = `data: ${JSON.stringify({ type: 'done' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(doneData));
          controller.close();

        } catch (error) {
          console.error('[Chat API] ❌ Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorData = `data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Chat API] ❌ Request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
