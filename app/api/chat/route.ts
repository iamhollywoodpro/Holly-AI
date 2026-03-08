import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getRelevantMemories, extractMemories } from '@/lib/memory-service';
import { detectMode, getSystemPromptForMode, HOLLY_MODES } from '@/lib/holly-modes';
import { getOrCreateUser } from '@/lib/user-manager';
import { ModelRouter } from '@/lib/ai/router';
import { RAGService } from '@/lib/ai/rag-service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { mcpManager } from '@/lib/mcp/mcp-client';
import path from 'path';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (e) {
      console.log('[Chat API] Auth failed, bypassing if in dev mode.');
    }

    if (!userId && process.env.NODE_ENV === 'development') {
      userId = 'local-dev-user';
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    console.log('[Chat API] User ID:', userId);

    // 2. VALIDATE API KEY
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
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
    let userName = 'User';

    if (userId) {
      const user = await getOrCreateUser(userId);
      dbUserId = user.id;
      userName = user.name || 'User';
    }

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

    // 5. PREPARE MESSAGES
    const messages = [
      { role: 'system', content: hollySystemPrompt },
      ...userMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // 6. MULTI-MODEL ROUTING
    const routing = ModelRouter.route(latestUserMessage);
    console.log('[Chat API] 🛤️ Route assigned:', routing.model, `(${routing.reason})`);

    // 6a. CONNECT MCP
    try {
      const mockServerPath = path.resolve(process.cwd(), 'scripts', 'mock-mcp-server.js');
      await mcpManager.connectStdio('mock-server', 'node', [mockServerPath]);
    } catch (e) {
      console.warn('[Chat API] Failed to connect to mock MCP server', e);
    }
    const mcpTools = await mcpManager.getAllTools();
    const groqTools = mcpTools.length > 0 ? mcpTools.map(t => ({
      type: 'function',
      function: {
        name: `mcp_${t.serverId}_${t.name}`,
        description: t.description,
        parameters: t.inputSchema || { type: 'object', properties: {} }
      }
    })) : undefined;

    // 7. STREAM RESPONSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // If the router selects web-llm or local-qwen, signal the frontend and end the backend stream early.
          if (routing.model === 'web-llm' || routing.model === 'local-qwen-7b') {
            console.log(`[Chat API] 🌐 ${routing.model} requested - signaling frontend`);
            const signalData = `data: ${JSON.stringify({ type: 'signal', content: routing.model })}\n\n`;
            controller.enqueue(new TextEncoder().encode(signalData));
            controller.close();
            return;
          }

          sendStatus(controller, '🤔 Thinking...');
          let fullResponse = '';

          if (routing.model === 'google-gemini-2.0') {
            // Use Gemini with RAG
            sendStatus(controller, '🔍 Searching knowledge base...');
            const searchResults = await RAGService.queryCodebase(latestUserMessage);
            const ragContext = RAGService.formatContext(searchResults);

            if (searchResults.length > 0) {
              messages[0].content += `\n\n## Additional Codebase Context\n${ragContext}`;
            }

            sendStatus(controller, '💭 Gemini is responding...');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            // Format Gemini messages
            const geminiMessages = messages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : msg.role,
              parts: [{ text: msg.content }],
            }));

            const result = await model.generateContentStream({
              contents: geminiMessages as any,
              generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.7,
              },
            });

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                fullResponse += text;
                sendText(controller, text);
              }
            }
          } else {
            // Use Groq (Default) - Recursive wrapper for tools
            let toolCallActive = true;
            while (toolCallActive) {
              const completion = await groq.chat.completions.create({
                messages: messages as any,
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 4096,
                tools: groqTools as any,
                tool_choice: 'auto',
                stream: true,
              });

              let isToolCall = false;
              let toolName = '';
              let toolArgs = '';
              let toolCallId = '';

              for await (const chunk of completion) {
                const delta = chunk.choices[0]?.delta;

                // Content chunk
                const content = delta?.content || '';
                if (content && !isToolCall) {
                  fullResponse += content;
                  sendText(controller, content);
                }

                // Tool call chunk logic
                if (delta?.tool_calls && delta.tool_calls.length > 0) {
                  isToolCall = true;
                  const tool = delta.tool_calls[0];
                  if (tool.id) toolCallId = tool.id;
                  if (tool.function?.name) toolName = tool.function.name;
                  if (tool.function?.arguments) toolArgs += tool.function.arguments;
                }
              }

              if (isToolCall && toolName) {
                sendStatus(controller, `🔧 Using tool ${toolName}...`);
                try {
                  const argsParsed = JSON.parse(toolArgs || '{}');
                  console.log(`[Chat API] Executing ${toolName} with`, argsParsed);

                  // Extract serverId and underlying tool name
                  const matches = toolName.match(/^mcp_([^_]+)_(.+)$/);
                  if (matches) {
                    const serverId = matches[1];
                    const realToolName = matches[2];
                    const result = await mcpManager.callTool(serverId, realToolName, argsParsed);

                    messages.push({
                      role: 'assistant', content: null, tool_calls: [
                        { id: toolCallId, type: 'function', function: { name: toolName, arguments: toolArgs } }
                      ]
                    } as any);

                    messages.push({ role: 'tool', tool_call_id: toolCallId, name: toolName, content: JSON.stringify(result) } as any);
                  } else {
                    toolCallActive = false; // unknown tool
                  }
                } catch (err) {
                  console.error('[Chat API] Tool execution failed', err);
                  toolCallActive = false;
                }
              } else {
                toolCallActive = false;
              }
            }
          }

          console.log('[Chat API] ✅ Stream complete');

          // 8. SAVE TO DATABASE
          if (dbUserId && conversationId) {
            try {
              // Save user message
              const userMessage = await prisma.message.create({
                data: {
                  conversationId,
                  role: 'user',
                  content: latestUserMessage,
                  userId: dbUserId,
                },
              });

              // Save assistant message
              await prisma.message.create({
                data: {
                  conversationId,
                  role: 'assistant',
                  content: fullResponse,
                  userId: dbUserId,
                },
              });

              // Update conversation stats
              await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                  messageCount: { increment: 2 },
                  lastMessagePreview: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
                },
              });

              console.log('[Chat API] 💾 Messages saved');

              // Extract memories in background
              extractMemories(conversationId, [
                ...messages.slice(1),
                { role: 'assistant', content: fullResponse },
              ]).catch(err => console.error('[Chat API] Memory extraction failed:', err));
            } catch (dbError) {
              console.error('[Chat API] ⚠️ Database save failed:', dbError);
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
