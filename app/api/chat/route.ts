/**
 * HOLLY Chat API Route — Phase 8A: Smart Free-Model Router
 *
 * Phase 1:  Live HollyIdentity injection, AutoConsciousness, real MCP server,
 *           topic-intersection memory scoring.
 * Phase 2:  Emotion engine, Taste engine, Evolution trigger wired.
 * Phase 3:  LLM-based message analyser, Identity evolver, cron jobs.
 * Phase 4A: MCP server expanded to 15 tools across 5 groups.
 * Phase 6A: Partner directives (Dev/Life/Creative) + top LearningPatterns.
 * Phase 8A: Smart free-model router — Kimi K2.5 (Cloudflare), Qwen3-235B
 *           (NVIDIA NIM), Gemini 2.5 Flash, Groq Llama-3.3, OpenRouter free
 *           pool, Ollama local — task-aware routing + cascade fallback.
 *
 * Routing matrix:
 *   speed       → Groq Llama-3.3-70B (300+ tok/s)
 *   coding      → Kimi K2.5 (CF) → Qwen3-235B (NVIDIA) → Groq
 *   reasoning   → Qwen3-235B (NVIDIA) → DeepSeek-R1 → Kimi K2.5
 *   long_context→ Gemini 2.5 Flash (1M ctx) → Kimi K2.5
 *   vision      → Gemini 2.5 Flash → OpenRouter
 *   creative    → OpenRouter free pool → Groq → Gemini
 *   agent       → Kimi K2.5 (tool-calling) → Qwen3-235B → Groq
 *   local       → Ollama (unlimited, zero cost)
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getRelevantMemories, extractMemories } from '@/lib/memory-service';
import { detectMode, getSystemPromptForMode, HOLLY_MODES } from '@/lib/holly-modes';
import { getOrCreateUser } from '@/lib/user-manager';
import { mcpManager } from '@/lib/mcp/mcp-client';
import { getIdentityContext } from '@/lib/identity/identity-context';
import { recordExchange, extractTopics } from '@/lib/consciousness/post-response-hook';
import { smartRoute, classifyTask } from '@/src/lib/ai/smart-router';
import { cascade } from '@/src/lib/ai/cascade';
import type { ChatMessage } from '@/src/lib/ai/providers/free-providers';

// ─── runtime ──────────────────────────────────────────────────────────────────
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Groq client (still used for tool-calling which needs its native function API)
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

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

    // 2. PARSE REQUEST ─────────────────────────────────────────────────────────
    const body = await req.json();
    const { messages: userMessages, conversationId } = body;

    if (!userMessages || !Array.isArray(userMessages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const latestUserMessage: string = userMessages[userMessages.length - 1]?.content || '';
    console.log('[Chat API] Processing', userMessages.length, 'messages');

    // 3. USER RECORD ───────────────────────────────────────────────────────────
    let dbUserId: string | null = null;
    let userName = 'User';
    try {
      const user = await getOrCreateUser(userId);
      dbUserId = user.id;
      userName = user.name || 'User';
    } catch (e) {
      console.warn('[Chat API] Could not load user:', e);
    }

    // 4. MODE DETECTION ────────────────────────────────────────────────────────
    const detectedMode = detectMode(latestUserMessage);
    const currentMode  = HOLLY_MODES[detectedMode];
    console.log('[Chat API] 🎯 Mode:', currentMode.name);

    // 5. TOPIC EXTRACTION ──────────────────────────────────────────────────────
    const currentTopics = extractTopics(latestUserMessage);

    // 6. PARALLEL CONTEXT FETCH ────────────────────────────────────────────────
    const [memoryContext, identityCtx] = await Promise.all([
      dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
      dbUserId
        ? getIdentityContext(dbUserId)
        : Promise.resolve({
            promptBlock: '', tasteDirectives: '', partnerDirectives: '',
            raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
          }),
    ]);

    // 7. BUILD SYSTEM PROMPT ───────────────────────────────────────────────────
    let hollySystemPrompt = getSystemPromptForMode(detectedMode, userName);

    if (identityCtx.promptBlock)     hollySystemPrompt += identityCtx.promptBlock;
    if (identityCtx.tasteDirectives) hollySystemPrompt += identityCtx.tasteDirectives;

    if (identityCtx.partnerDirectives) {
      hollySystemPrompt += identityCtx.partnerDirectives;
      const tier     = identityCtx.raw.partner?.tier;
      const patterns = identityCtx.raw.patterns?.length ?? 0;
      console.log(`[Chat API] 🤝 Partner: ${tier || 'none'} | 📚 Patterns: ${patterns}`);
    }

    if (memoryContext) {
      hollySystemPrompt += `\n\n## Your Memories\nHere's what you remember about ${userName}:\n${memoryContext}`;
    }

    // 8. MCP TOOLS ─────────────────────────────────────────────────────────────
    const mcpTools = await mcpManager.getAllTools();
    if (mcpTools.length > 0) {
      const toolSummary = mcpTools
        .map(t => `  • **${t.name}** – ${t.description.split('.')[0]}`)
        .join('\n');
      hollySystemPrompt += `\n\n## Your Active Tools (${mcpTools.length} tools)\nUse these proactively:\n${toolSummary}`;
      console.log(`[Chat API] 🔧 ${mcpTools.length} MCP tools loaded`);
    }

    // 9. PREPARE MESSAGES ──────────────────────────────────────────────────────
    const messages: any[] = [
      { role: 'system', content: hollySystemPrompt },
      ...userMessages.map((msg: any) => ({ role: msg.role, content: msg.content })),
    ];

    // 10. SMART MODEL ROUTING (Phase 8A) ───────────────────────────────────────
    const taskType = classifyTask(latestUserMessage);
    const routing  = smartRoute(latestUserMessage, { forceTask: taskType });
    console.log(`[Chat API] 🛤️  Task: ${taskType} → ${routing.primary.displayName}`);
    console.log(`[Chat API] 📋 Waterfall: ${routing.waterfall.map(s => s.displayName).join(' → ')}`);

    // 11. MCP tool specs (Groq-format; used when Groq is in waterfall) ─────────
    const groqTools =
      mcpTools.length > 0
        ? mcpTools.map(t => ({
            type: 'function',
            function: {
              name:        `mcp_${t.serverId}_${t.name}`,
              description: t.description,
              parameters:  t.inputSchema || { type: 'object', properties: {} },
            },
          }))
        : undefined;

    // 12. STREAM RESPONSE ──────────────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const taskEmojis: Record<string, string> = {
            speed: '⚡', coding: '💻', reasoning: '🧠',
            long_context: '📄', vision: '👁️', creative: '✨',
            agent: '🤖', local: '🔒',
          };
          sendStatus(controller, `${taskEmojis[taskType] ?? '🤔'} ${routing.reason}...`);

          let fullResponse = '';
          let activeModel  = routing.primary.displayName;

          // Normalise messages for cascade adapters (strip tool-call entries)
          const cascadeMessages: ChatMessage[] = messages
            .filter((m: any) => ['system', 'user', 'assistant'].includes(m.role) && m.content)
            .map((m: any) => ({
              role:    m.role as 'system' | 'user' | 'assistant',
              content: String(m.content),
            }));

          // ── Determine waterfall ──────────────────────────────────────────────
          // If MCP tools are available, prefer Groq first (only provider with
          // native function-calling); keep rest as text-only fallback.
          let waterfall = routing.waterfall;
          if (groqTools && groqTools.length > 0 && groqClient) {
            const groqSpec = waterfall.find(s => s.provider === 'groq') ?? {
              provider:    'groq'  as const,
              model:       'llama-3.3-70b-versatile',
              displayName: 'Llama 3.3 70B (Groq)',
              contextK:    128,
              streaming:   true,
            };
            waterfall = [groqSpec, ...waterfall.filter(s => s.provider !== 'groq')];
          }

          // ── Tool-call loop (Groq only) + text cascade ────────────────────────
          let toolLoops       = 0;
          const MAX_TOOL_LOOPS = 5;
          let pendingMessages  = [...cascadeMessages];

          while (toolLoops < MAX_TOOL_LOOPS) {
            toolLoops++;
            const firstSpec   = waterfall[0];
            const useGroqTools = firstSpec?.provider === 'groq' &&
                                 groqTools && groqTools.length > 0 &&
                                 groqClient;

            if (useGroqTools && groqClient) {
              // ── Groq with function-calling ──────────────────────────────────
              let isToolCall = false;
              let toolName   = '';
              let toolArgs   = '';
              let toolCallId = '';

              try {
                const completion = await groqClient.chat.completions.create({
                  messages:    pendingMessages as any,
                  model:       'llama-3.3-70b-versatile',
                  temperature: 0.7,
                  max_tokens:  4096,
                  tools:       groqTools as any,
                  tool_choice: 'auto',
                  stream:      true,
                });

                for await (const chunk of completion) {
                  const delta   = chunk.choices[0]?.delta;
                  const content = delta?.content || '';
                  if (content && !isToolCall) {
                    fullResponse += content;
                    sendText(controller, content);
                  }
                  if (delta?.tool_calls?.length) {
                    isToolCall = true;
                    const tool = delta.tool_calls[0];
                    if (tool.id)               toolCallId = tool.id;
                    if (tool.function?.name)   toolName   = tool.function.name;
                    if (tool.function?.arguments) toolArgs += tool.function.arguments;
                  }
                }
              } catch (groqErr: any) {
                // Groq failed — cascade to rest of waterfall (text-only)
                console.warn('[Chat] Groq failed, cascading:', groqErr.message);
                sendStatus(controller, '🔄 Switching model...');
                const fallbackWaterfall = waterfall.filter(s => s.provider !== 'groq');
                for await (const token of cascade(fallbackWaterfall, pendingMessages, {
                  temperature: 0.7, maxTokens: 4096, sessionId: conversationId,
                  onModelSelected: (s, i) => {
                    activeModel = s.displayName;
                    if (i > 0) sendStatus(controller, `🔄 Trying ${s.displayName}...`);
                  },
                  onModelFailed: (s, e) => console.warn(`[Chat] ${s.displayName} failed: ${e.message}`),
                })) {
                  fullResponse += token;
                  sendText(controller, token);
                }
                break;
              }

              // Handle tool call
              if (isToolCall && toolName) {
                sendStatus(controller, `🔧 Using ${toolName}...`);
                try {
                  const argsParsed = JSON.parse(toolArgs || '{}');
                  const toolMatch  = toolName.match(/^mcp_([^_]+)_(.+)$/);
                  if (toolMatch) {
                    const [, serverId, realToolName] = toolMatch;
                    const result = await mcpManager.callTool(serverId, realToolName, argsParsed);
                    // Inject tool result as user message for next loop (compatible with all providers)
                    pendingMessages.push({
                      role:    'assistant',
                      content: `I'll use the ${toolName} tool now.`,
                    });
                    pendingMessages.push({
                      role:    'user',
                      content: `Tool result for ${toolName}:\n${JSON.stringify(result, null, 2)}`,
                    });
                  } else {
                    break;
                  }
                } catch (toolErr) {
                  console.error('[Chat API] Tool execution failed', toolErr);
                  break;
                }
              } else {
                break; // no more tool calls
              }

            } else {
              // ── Pure text cascade (no tool-calling) ──────────────────────────
              for await (const token of cascade(waterfall, pendingMessages, {
                temperature: 0.7, maxTokens: 4096, sessionId: conversationId,
                onModelSelected: (s, attempt) => {
                  activeModel = s.displayName;
                  if (attempt > 0) sendStatus(controller, `🔄 Trying ${s.displayName}...`);
                },
                onModelFailed: (s, e) => console.warn(`[Chat] ${s.displayName} failed: ${e.message}`),
              })) {
                fullResponse += token;
                sendText(controller, token);
              }
              break;
            }
          }

          console.log(`[Chat API] ✅ Completed via ${activeModel}`);

          // 13. SAVE TO DATABASE ──────────────────────────────────────────────────
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
                  messageCount:      { increment: 2 },
                  lastMessagePreview: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
                },
              });
              console.log('[Chat API] 💾 Messages saved');
            } catch (dbErr) {
              console.error('[Chat API] ⚠️ DB save failed:', dbErr);
            }
          }

          // 14. BACKGROUND WORK (fire-and-forget) ───────────────────────────────
          if (dbUserId && conversationId && fullResponse) {
            extractMemories(conversationId, [
              ...messages.slice(1).filter((m: any) => m.role !== 'tool'),
              { role: 'assistant', content: fullResponse },
            ]).catch(err => console.error('[Chat API] Memory extraction failed:', err));

            void recordExchange({
              userId:            dbUserId,
              conversationId,
              userMessage:       latestUserMessage,
              assistantResponse: fullResponse,
              detectedMode,
              topics:            currentTopics,
            });
          }

          // Done
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
        'Connection':    'keep-alive',
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
