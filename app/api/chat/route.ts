/**
 * HOLLY Chat API Route — Phase 4A: Expanded MCP Tool Suite
 *
 * Phase 1:  Live HollyIdentity injection, AutoConsciousness, real MCP server,
 *           topic-intersection memory scoring.
 * Phase 2:  Emotion engine, Taste engine, Evolution trigger wired.
 * Phase 3:  LLM-based message analyser, Identity evolver, cron jobs.
 * Phase 4A: MCP server expanded to 15 tools across 5 groups:
 *           GitHub (read+write), Web Intelligence, Code Execution,
 *           Memory/Knowledge, Creative/Utility.
 *           Tool awareness block injected into system prompt.
 */

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
import { getIdentityContext } from '@/lib/identity/identity-context';
import { recordExchange, extractTopics } from '@/lib/consciousness/post-response-hook';

// ─── runtime ──────────────────────────────────────────────────────────────────
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── singletons ───────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Phase 1E: connect MCP once at module load (not per request)
mcpManager.ensureHollyTools().catch(err =>
  console.warn('[Chat] MCP init warning:', err.message)
);

// ─── SSE helpers ──────────────────────────────────────────────────────────────
function sendStatus(c: ReadableStreamDefaultController, s: string) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'status', content: s })}\n\n`));
}
function sendText(c: ReadableStreamDefaultController, t: string) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', content: t })}\n\n`));
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log('[Chat API] ========== NEW REQUEST ==========');

  try {
    // 1. AUTH ──────────────────────────────────────────────────────────────────
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch {
      console.log('[Chat API] Auth failed, bypassing if in dev mode.');
    }

    if (!userId && process.env.NODE_ENV === 'development') {
      userId = 'local-dev-user';
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    // 2. VALIDATE API KEY ──────────────────────────────────────────────────────
    if (!process.env.GROQ_API_KEY) {
      console.error('[Chat API] ❌ GROQ_API_KEY missing');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 3. PARSE REQUEST ─────────────────────────────────────────────────────────
    const body = await req.json();
    const { messages: userMessages, conversationId } = body;

    if (!userMessages || !Array.isArray(userMessages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const latestUserMessage: string = userMessages[userMessages.length - 1]?.content || '';
    console.log('[Chat API] Processing', userMessages.length, 'messages');

    // 4. USER RECORD ───────────────────────────────────────────────────────────
    let dbUserId: string | null = null;
    let userName = 'User';
    try {
      const user = await getOrCreateUser(userId);
      dbUserId = user.id;
      userName = user.name || 'User';
    } catch (e) {
      console.warn('[Chat API] Could not load user:', e);
    }

    // 5. MODE DETECTION ────────────────────────────────────────────────────────
    const detectedMode = detectMode(latestUserMessage);
    const currentMode = HOLLY_MODES[detectedMode];
    console.log('[Chat API] 🎯 Mode:', currentMode.name);

    // 6. TOPIC EXTRACTION (Phase 1F) ───────────────────────────────────────────
    const currentTopics = extractTopics(latestUserMessage);

    // 7. PARALLEL CONTEXT FETCH ───────────────────────────────────────────────
    // Run memory retrieval and identity load concurrently
    const [memoryContext, identityCtx] = await Promise.all([
      dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
      dbUserId ? getIdentityContext(dbUserId) : Promise.resolve({ promptBlock: '', tasteDirectives: '', raw: { identity: null, goals: [], emotionalState: null, taste: null } }),
    ]);

    // 8. BUILD SYSTEM PROMPT ───────────────────────────────────────────────────
    let hollySystemPrompt = getSystemPromptForMode(detectedMode, userName);

    // Phase 1C: inject live identity state
    if (identityCtx.promptBlock) {
      hollySystemPrompt += identityCtx.promptBlock;
    }

    // Phase 2C: inject taste-driven style directives
    if (identityCtx.tasteDirectives) {
      hollySystemPrompt += identityCtx.tasteDirectives;
    }

    // Phase 1F: topic-scored memory context
    if (memoryContext) {
      hollySystemPrompt += `\n\n## Your Memories\nHere's what you remember about ${userName}:\n${memoryContext}`;
    }

    // Phase 4A: inject tool awareness so HOLLY knows what she can do
    const mcpToolsForPrompt = await mcpManager.getAllTools();
    if (mcpToolsForPrompt.length > 0) {
      const toolSummary = mcpToolsForPrompt
        .map(t => `  \u2022 **${t.name}** \u2013 ${t.description.split('.')[0]}`)
        .join('\n');
      hollySystemPrompt += `\n\n## Your Active Tools (${mcpToolsForPrompt.length} tools)\nUse these proactively \u2014 don't just describe how to do something if you can actually do it:\n${toolSummary}`;
    }

    // 9. PREPARE MESSAGES ──────────────────────────────────────────────────────
    const messages: any[] = [
      { role: 'system', content: hollySystemPrompt },
      ...userMessages.map((msg: any) => ({ role: msg.role, content: msg.content })),
    ];

    // 10. MODEL ROUTING ────────────────────────────────────────────────────────
    const routing = ModelRouter.route(latestUserMessage);
    console.log('[Chat API] 🛤️ Route:', routing.model, `(${routing.reason})`);

    // 11. MCP TOOLS ────────────────────────────────────────────────────────────
    // Tools are loaded from the already-connected singleton — no per-request spawn
    // (mcpToolsForPrompt already fetched above; re-use it here)
    const mcpTools = mcpToolsForPrompt;
    if (mcpTools.length > 0) {
      console.log(`[Chat API] 🔧 ${mcpTools.length} MCP tools:`, mcpTools.map(t => t.name).join(', '));
    }
    const groqTools =
      mcpTools.length > 0
        ? mcpTools.map(t => ({
            type: 'function',
            function: {
              name: `mcp_${t.serverId}_${t.name}`,
              description: t.description,
              parameters: t.inputSchema || { type: 'object', properties: {} },
            },
          }))
        : undefined;

    // 12. STREAM RESPONSE ──────────────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Local model signal
          if (routing.model === 'web-llm' || routing.model === 'local-qwen-7b') {
            console.log(`[Chat API] 🌐 ${routing.model} – signaling frontend`);
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'signal', content: routing.model })}\n\n`
              )
            );
            controller.close();
            return;
          }

          sendStatus(controller, '🤔 Thinking...');
          let fullResponse = '';

          // ── Ollama path (Phase 4B — local LLM) ────────────────────────────
          if (routing.model === 'ollama') {
            const ollamaModel = (routing as any).ollamaModel || undefined;
            sendStatus(controller, `🦙 Thinking locally (${ollamaModel || 'ollama'})...`);
            try {
              const ollamaMessages = messages.map((m: any) => ({
                role: m.role as 'system' | 'user' | 'assistant',
                content: m.content || '',
              }));
              for await (const token of ollamaService.chatStream(ollamaMessages, {
                model: ollamaModel,
                temperature: 0.7,
                maxTokens: 4096,
              })) {
                fullResponse += token;
                sendText(controller, token);
              }
            } catch (ollamaErr: any) {
              // Ollama failed — fall back to Groq gracefully
              console.warn('[Chat] Ollama stream failed, falling back to Groq:', ollamaErr.message);
              sendStatus(controller, '⚡ Switching to cloud model...');
              const fallback = await groq.chat.completions.create({
                messages: messages as any,
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 4096,
                stream: true,
              });
              for await (const chunk of fallback) {
                const text = chunk.choices[0]?.delta?.content || '';
                if (text) { fullResponse += text; sendText(controller, text); }
              }
            }

          // ── Gemini path ────────────────────────────────────────────────────
          } else if (routing.model === 'google-gemini-2.0') {
            sendStatus(controller, '🔍 Searching knowledge base...');
            const searchResults = await RAGService.queryCodebase(latestUserMessage);
            if (searchResults.length > 0) {
              messages[0].content += `\n\n## Additional Codebase Context\n${RAGService.formatContext(searchResults)}`;
            }

            sendStatus(controller, '💭 Gemini is responding...');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const geminiMessages = messages.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : msg.role,
              parts: [{ text: msg.content }],
            }));

            const result = await model.generateContentStream({
              contents: geminiMessages as any,
              generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
            });

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) { fullResponse += text; sendText(controller, text); }
            }

          // ── Groq path (default) ────────────────────────────────────────────
          } else {
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
                const content = delta?.content || '';
                if (content && !isToolCall) { fullResponse += content; sendText(controller, content); }

                if (delta?.tool_calls?.length) {
                  isToolCall = true;
                  const tool = delta.tool_calls[0];
                  if (tool.id) toolCallId = tool.id;
                  if (tool.function?.name) toolName = tool.function.name;
                  if (tool.function?.arguments) toolArgs += tool.function.arguments;
                }
              }

              if (isToolCall && toolName) {
                sendStatus(controller, `🔧 Using ${toolName}...`);
                try {
                  const argsParsed = JSON.parse(toolArgs || '{}');
                  const matches = toolName.match(/^mcp_([^_]+)_(.+)$/);
                  if (matches) {
                    const [, serverId, realToolName] = matches;
                    const result = await mcpManager.callTool(serverId, realToolName, argsParsed);
                    messages.push({
                      role: 'assistant',
                      content: null,
                      tool_calls: [{ id: toolCallId, type: 'function', function: { name: toolName, arguments: toolArgs } }],
                    } as any);
                    messages.push({ role: 'tool', tool_call_id: toolCallId, name: toolName, content: JSON.stringify(result) } as any);
                  } else {
                    toolCallActive = false;
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

          // 13. SAVE TO DATABASE ───────────────────────────────────────────────
          if (dbUserId && conversationId) {
            try {
              await prisma.message.create({
                data: { conversationId, role: 'user', content: latestUserMessage, userId: dbUserId },
              });
              await prisma.message.create({
                data: { conversationId, role: 'assistant', content: fullResponse, userId: dbUserId },
              });
              await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                  messageCount: { increment: 2 },
                  lastMessagePreview: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
                },
              });
              console.log('[Chat API] 💾 Messages saved');
            } catch (dbErr) {
              console.error('[Chat API] ⚠️ DB save failed:', dbErr);
            }
          }

          // 14. BACKGROUND WORK (fire-and-forget) ────────────────────────────
          if (dbUserId && conversationId && fullResponse) {
            // Extract LLM memories
            extractMemories(conversationId, [
              ...messages.slice(1).filter(m => m.role !== 'tool'),
              { role: 'assistant', content: fullResponse },
            ]).catch(err => console.error('[Chat API] Memory extraction failed:', err));

            // Phase 1D: record exchange in consciousness system
            void recordExchange({
              userId: dbUserId,
              conversationId,
              userMessage: latestUserMessage,
              assistantResponse: fullResponse,
              detectedMode,
              topics: currentTopics,
            });
          }

          // Done signal
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();

        } catch (error) {
          console.error('[Chat API] ❌ Stream error:', error);
          const msg = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`)
          );
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
