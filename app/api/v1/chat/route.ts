/**
 * POST /api/v1/chat — Phase 8A: Smart Free-Model Router on Public API
 *
 * Same cascade routing as the internal /api/chat route — Kimi K2.5, Qwen3-235B,
 * Gemini 2.5 Flash, Groq Llama-3.3, OpenRouter free pool, Ollama local — all
 * task-aware with automatic fallback if a provider is rate-limited.
 *
 * Authentication: Bearer API key (holly_xxxx) or x-api-key header.
 * Rate limits:    per-key RPM / RPD sliding window (stored in ApiKeyUsage).
 * Scope required: "chat"
 *
 * Request body:
 *   {
 *     messages: Array<{ role: "user" | "assistant", content: string }>,
 *     stream?:  boolean   (default true),
 *     model?:   string    (force a MODEL_CATALOGUE key, e.g. "cf:kimi-k2.5"),
 *     task?:    TaskType  (override task classification),
 *   }
 *
 * Streaming response (text/event-stream):
 *   data: { type: "status",  content: "⚡ Fast chat → Llama 3.3 70B (Groq)..." }
 *   data: { type: "text",    content: "..." }
 *   data: { type: "done",    usage: { tokens_in, tokens_out }, rate_limit: {...}, model: "..." }
 *
 * Non-streaming (stream=false):
 *   { ok: true, message: "...", model: "...", task: "...", usage: {...}, rate_limit: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { detectMode, getSystemPromptForMode } from '@/lib/holly-modes';
import { getRelevantMemories } from '@/lib/memory-service';
import { getIdentityContext } from '@/lib/identity/identity-context';
import { extractTopics } from '@/lib/consciousness/post-response-hook';
import { mcpManager } from '@/lib/mcp/mcp-client';
import { guardApiKey, isGuardSuccess } from '@/src/lib/api-v1/guard';
import { logUsage } from '@/src/lib/api-keys';
import { smartRoute, classifyTask, type TaskType } from '@/src/lib/ai/smart-router';
import { cascade, cascadeCollect } from '@/src/lib/ai/cascade';
import type { ChatMessage } from '@/src/lib/ai/providers/free-providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ensure MCP tools are loaded once at module startup
mcpManager.ensureHollyTools().catch(e =>
  console.warn('[v1/chat] MCP init warning:', e.message),
);

// ─── SSE helper ───────────────────────────────────────────────────────────────

function enc(c: ReadableStreamDefaultController, obj: object) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  // 1. API-key guard
  const guard = await guardApiKey(req);
  if (!isGuardSuccess(guard)) return guard;

  if (!guard.apiKey.scopes.includes('chat') && !guard.apiKey.scopes.includes('*')) {
    return NextResponse.json(
      { error: 'This key does not have the "chat" scope.' },
      { status: 403 },
    );
  }

  // 2. Parse body
  let body: { messages?: unknown; stream?: boolean; model?: string; task?: TaskType };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { error: 'messages must be a non-empty array of { role, content } objects' },
      { status: 400 },
    );
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of rawMessages) {
    if (
      typeof m !== 'object' || !m ||
      !['user', 'assistant'].includes((m as { role: string }).role) ||
      typeof (m as { content: string }).content !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Each message must have role ("user" | "assistant") and content (string)' },
        { status: 400 },
      );
    }
    messages.push(m as { role: 'user' | 'assistant'; content: string });
  }

  const wantStream    = body.stream !== false;
  const latestUserMsg = messages[messages.length - 1]?.content ?? '';

  // 3. Load user context (same pipeline as internal route)
  let dbUserId: string | null = null;
  let userName = 'API User';
  try {
    const user = await prisma.user.findUnique({ where: { id: guard.userId } });
    dbUserId = user?.id ?? null;
    userName = user?.name ?? 'API User';
  } catch {}

  // 4. Build system prompt
  const detectedMode  = detectMode(latestUserMsg);
  const currentTopics = extractTopics(latestUserMsg);

  const [memoryContext, identityCtx] = await Promise.all([
    dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
    dbUserId
      ? getIdentityContext(dbUserId)
      : Promise.resolve({
          promptBlock: '', tasteDirectives: '', partnerDirectives: '',
          raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
        }),
  ]);

  let systemPrompt = getSystemPromptForMode(detectedMode, userName);
  if (identityCtx.promptBlock)       systemPrompt += identityCtx.promptBlock;
  if (identityCtx.tasteDirectives)   systemPrompt += identityCtx.tasteDirectives;
  if (identityCtx.partnerDirectives) systemPrompt += identityCtx.partnerDirectives;
  if (memoryContext)
    systemPrompt += `\n\n## Memories\n${memoryContext}`;

  const mcpTools = await mcpManager.getAllTools();
  if (mcpTools.length > 0) {
    const toolSummary = mcpTools.map(t => `  • **${t.name}** – ${t.description.split('.')[0]}`).join('\n');
    systemPrompt += `\n\n## Active Tools (${mcpTools.length})\n${toolSummary}`;
  }
  systemPrompt += `\n\n## API Access\nYou are responding via the HOLLY Public API. Be concise and structured.`;

  // 5. Smart routing
  const taskType = body.task ?? classifyTask(latestUserMsg);
  const routing  = smartRoute(latestUserMsg, {
    forceTask:  taskType,
    forceModel: body.model,
  });

  console.log(`[v1/chat] 🛤️  Task: ${taskType} → ${routing.primary.displayName}`);
  console.log(`[v1/chat] 📋 Waterfall: ${routing.waterfall.map(s => s.displayName).join(' → ')}`);

  // 6. Prepare cascade messages
  const cascadeMessages: ChatMessage[] = [
    { role: 'system',    content: systemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const taskEmojis: Record<string, string> = {
    speed: '⚡', coding: '💻', reasoning: '🧠',
    long_context: '📄', vision: '👁️', creative: '✨',
    agent: '🤖', local: '🔒',
  };

  // 7. Stream or collect
  if (wantStream) {
    let statusCode   = 200;
    let tokensIn     = 0;
    let tokensOut    = 0;
    let activeModel  = routing.primary.displayName;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          enc(controller, {
            type:    'status',
            content: `${taskEmojis[taskType] ?? '🤔'} ${routing.reason}...`,
          });

          let fullText = '';

          for await (const token of cascade(routing.waterfall, cascadeMessages, {
            temperature: 0.7,
            maxTokens:   2048,
            onModelSelected: (spec, attempt) => {
              activeModel = spec.displayName;
              if (attempt > 0) enc(controller, { type: 'status', content: `🔄 Trying ${spec.displayName}...` });
            },
            onModelFailed: (spec, err) =>
              console.warn(`[v1/chat] ${spec.displayName} failed: ${err.message}`),
          })) {
            fullText += token;
            enc(controller, { type: 'text', content: token });
          }

          // Estimate token counts
          tokensIn  = Math.ceil(systemPrompt.length / 4);
          tokensOut = Math.ceil(fullText.length / 4);

          enc(controller, {
            type:  'done',
            model: activeModel,
            task:  taskType,
            usage: { tokens_in: tokensIn, tokens_out: tokensOut },
            rate_limit: { remaining_rpm: guard.remainingRpm, remaining_rpd: guard.remainingRpd },
          });
          controller.close();

          logUsage(
            guard.apiKey.id, '/api/v1/chat', 'POST',
            statusCode, Date.now() - startMs, tokensIn, tokensOut,
          ).catch(() => {});

        } catch (err: unknown) {
          statusCode = 500;
          enc(controller, { type: 'error', content: String(err) });
          controller.close();
          logUsage(guard.apiKey.id, '/api/v1/chat', 'POST', 500, Date.now() - startMs).catch(() => {});
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-RateLimit-Remaining-RPM': String(guard.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(guard.remainingRpd),
        'X-HOLLY-Task':  taskType,
        'X-HOLLY-Model': routing.primary.displayName,
      },
    });

  } else {
    // Non-streaming
    try {
      const { text, model: usedSpec } = await cascadeCollect(routing.waterfall, cascadeMessages, {
        temperature: 0.7,
        maxTokens:   2048,
      });

      const tokensIn  = Math.ceil(systemPrompt.length / 4);
      const tokensOut = Math.ceil(text.length / 4);
      const durationMs = Date.now() - startMs;

      logUsage(guard.apiKey.id, '/api/v1/chat', 'POST', 200, durationMs, tokensIn, tokensOut).catch(() => {});

      return NextResponse.json(
        {
          ok:      true,
          message: text,
          model:   usedSpec.displayName,
          task:    taskType,
          usage:   { tokens_in: tokensIn, tokens_out: tokensOut },
          rate_limit: { remaining_rpm: guard.remainingRpm, remaining_rpd: guard.remainingRpd },
        },
        {
          headers: {
            'X-RateLimit-Remaining-RPM': String(guard.remainingRpm),
            'X-RateLimit-Remaining-RPD': String(guard.remainingRpd),
            'X-HOLLY-Task':  taskType,
            'X-HOLLY-Model': usedSpec.displayName,
          },
        },
      );
    } catch (err) {
      logUsage(guard.apiKey.id, '/api/v1/chat', 'POST', 500, Date.now() - startMs).catch(() => {});
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }
}

// ─── GET — endpoint info / health ─────────────────────────────────────────────

export async function GET() {
  const { getConfiguredProviders } = await import('@/src/lib/ai/cascade');
  const configured = getConfiguredProviders();

  return NextResponse.json({
    endpoint:    'POST /api/v1/chat',
    version:     'v1',
    phase:       '8A',
    auth:        'Bearer holly_xxxx  or  x-api-key: holly_xxxx',
    scopes:      ['chat'],
    limits:      "see your key's rpmLimit / rpdLimit",
    docs:        'https://holly-ai.dev/docs/api',
    stream:      'Pass stream=true (default) for SSE, stream=false for JSON',
    routing: {
      description: 'Task-aware cascade — best free model selected automatically',
      tasks:       ['speed', 'coding', 'reasoning', 'long_context', 'vision', 'creative', 'agent', 'local'],
      configured_providers: configured,
    },
    request: {
      messages: 'Array<{ role: "user" | "assistant", content: string }>',
      stream:   'boolean (optional, default true)',
      task:     'TaskType (optional override: speed|coding|reasoning|long_context|vision|creative|agent|local)',
      model:    'string  (optional force — MODEL_CATALOGUE key, e.g. "cf:kimi-k2.5")',
    },
    response_headers: {
      'X-HOLLY-Task':  'detected task type',
      'X-HOLLY-Model': 'model that served the request',
      'X-RateLimit-Remaining-RPM': 'requests remaining this minute',
      'X-RateLimit-Remaining-RPD': 'requests remaining today',
    },
  });
}
