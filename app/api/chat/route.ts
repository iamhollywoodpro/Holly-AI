import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { getHollySystemPrompt } from '@/lib/ai/holly-system-prompt';
import { executeTool, toolDefinitions } from '@/lib/tools/executor';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  tools: [{ functionDeclarations: toolDefinitions as any }]
});

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

/**
 * Helper to send tool execution updates
 */
function sendToolExecution(
  controller: ReadableStreamDefaultController,
  toolName: string,
  status: 'start' | 'complete' | 'error',
  result?: any
) {
  const data = `data: ${JSON.stringify({
    type: 'tool',
    toolName,
    status,
    result
  })}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

export async function POST(req: NextRequest) {
  console.log('[Chat API] ========== NEW REQUEST ==========');
  
  try {
    // 1. AUTH
    const { userId } = await auth();
    console.log('[Chat API] User ID:', userId || 'anonymous');

    // 2. VALIDATE API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] ❌ GEMINI_API_KEY missing');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 3. PARSE REQUEST
    const body = await req.json();
    const { messages: userMessages, conversationId } = body;

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

    // 5. PREPARE MESSAGES WITH SYSTEM PROMPT
    const systemPrompt = await getHollySystemPrompt(dbUserId);
    
    // Convert messages to Gemini format
    const history = userMessages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = userMessages[userMessages.length - 1].content;

    // 6. CREATE STREAMING RESPONSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendStatus(controller, '🤔 Thinking...');

          // Start chat with history
          const chat = model.startChat({
            history,
            systemInstruction: {
              parts: [{ text: systemPrompt }],
              role: 'user'
            }
          });

          let fullResponse = '';
          let iteration = 0;
          const maxIterations = 10;

          while (iteration < maxIterations) {
            iteration++;
            console.log(`[Chat API] Iteration ${iteration}`);

            // Send message and get streaming response
            const result = await chat.sendMessageStream(lastMessage);

            let functionCalls: any[] = [];
            let textResponse = '';

            // Process streaming chunks
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                textResponse += chunkText;
                sendText(controller, chunkText);
              }

              // Check for function calls
              const functionCall = chunk.functionCalls();
              if (functionCall && functionCall.length > 0) {
                functionCalls.push(...functionCall);
              }
            }

            fullResponse += textResponse;

            // If no function calls, we're done
            if (functionCalls.length === 0) {
              console.log('[Chat API] No function calls, finishing');
              break;
            }

            // Execute function calls
            console.log(`[Chat API] Executing ${functionCalls.length} function calls`);
            
            const functionResponses = [];
            
            for (const call of functionCalls) {
              const toolName = call.name;
              const toolArgs = call.args;

              console.log(`[Chat API] 🔧 Executing: ${toolName}`, toolArgs);
              
              // Send status update
              const statusEmoji = {
                github_read_file: '📖',
                github_write_file: '💾',
                github_list_files: '📁',
                bash_execute: '💻',
                file_read: '📄',
                file_write: '✏️',
                file_list: '📂'
              }[toolName] || '🔧';

              sendStatus(controller, `${statusEmoji} ${toolName}...`);
              sendToolExecution(controller, toolName, 'start');

              // Execute the tool
              const toolResult = await executeTool(toolName, toolArgs);

              if (toolResult.success) {
                sendStatus(controller, `✅ ${toolName} complete`);
                sendToolExecution(controller, toolName, 'complete', toolResult.data);
              } else {
                sendStatus(controller, `❌ ${toolName} failed: ${toolResult.error}`);
                sendToolExecution(controller, toolName, 'error', toolResult.error);
              }

              // Add function response
              functionResponses.push({
                name: toolName,
                response: toolResult
              });

              console.log(`[Chat API] Tool result:`, toolResult);
            }

            // Send function responses back to model
            sendStatus(controller, '🤔 Processing results...');
            
            // Format function responses for Gemini API
            const formattedResponses = functionResponses.map(fr => ({
              functionResponse: {
                name: fr.name,
                response: fr.response
              }
            }));
            
            const followUpResult = await chat.sendMessageStream(formattedResponses);

            // Process follow-up response
            for await (const chunk of followUpResult.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                fullResponse += chunkText;
                sendText(controller, chunkText);
              }
            }

            // Check if there are more function calls
            const finalChunk = await followUpResult.response;
            const moreFunctionCalls = finalChunk.functionCalls();
            
            if (!moreFunctionCalls || moreFunctionCalls.length === 0) {
              console.log('[Chat API] No more function calls, finishing');
              break;
            }
          }

          // Save conversation to database
          if (dbUserId && conversationId && fullResponse) {
            try {
              await prisma.message.create({
                data: {
                  conversationId,
                  userId: dbUserId,
                  role: 'assistant',
                  content: fullResponse,
                },
              });
            } catch (dbError) {
              console.error('[Chat API] Database error:', dbError);
            }
          }

          console.log('[Chat API] Stream completed');
          controller.close();
        } catch (error: any) {
          console.error('[Chat API] Stream error:', error);
          sendStatus(controller, `❌ Error: ${error.message}`);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
