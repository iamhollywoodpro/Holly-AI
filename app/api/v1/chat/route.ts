/**
 * POST /api/v1/chat — Phase 7: Public HOLLY Chat API
 *
 * Thin, public-facing wrapper around the internal chat route.
 * Authentication: Bearer API key (holly_xxxx) or x-api-key header.
 * Rate limits:    per-key RPM / RPD sliding window (stored in ApiKeyUsage).
 * Scope required: "chat"
 *
 * Request body:
 *   {
 *     messages: Array<{ role: "user" | "assistant", content: string }>,
 *     stream?:  boolean   (default true),
 *     model?:   string    (hint — may be ignored by the router),
 *   }
 *
 * Streaming response (text/event-stream) mirrors the internal chat route:
 *   data: { type: "status",  content: "..." }
 *   data: { type: "text",    content: "..." }
 *   data: { type: "done" }
 *
 * Non-streaming response (application/json, stream=false):
 *   { ok: true, message: "...", model: "...", usage: { tokens_in, tokens_out } }
 */

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { detectMode, getSystemPromptForMode, HOLLY_MODES } from '@/lib/holly-modes';
import { getRelevantMemories, extractMemories } from '@/lib/memory-service';
import { getIdentityContext } from '@/lib/identity/identity-context';
import { extractTopics } from '@/lib/consciousness/post-response-hook';
import { mcpManager } from '@/lib/mcp/mcp-client';
import { guardApiKey, isGuardSuccess } from '@/src/lib/api-v1/guard';
import { logUsage } from '@/src/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Ensure MCP tools are loaded once at module startup
mcpManager.ensureHollyTools().catch(e =>
  console.warn('[v1/chat] MCP init warning:', e.message),
);

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function enc(c: ReadableStreamDefaultController, obj: object) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  // 1. API-key guard (validates, checks scopes, rate-limits)
  const guard = await guardApiKey(req);
  if (!isGuardSuccess(guard)) return guard; // returns the error NextResponse

  // Check scope
  if (!guard.apiKey.scopes.includes('chat') && !guard.apiKey.scopes.includes('*')) {
    return NextResponse.json(
      { error: 'This key does not have the "chat" scope.' },
      { status: 403 },
    );
  }

  // 2. Parse body
  let body: { messages?: unknown; stream?: boolean; model?: string };
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

  // Validate each message shape
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  for (const m of rawMessages) {
    if (
      typeof m !== 'object' ||
      !m ||
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

  const wantStream = body.stream !== false;   // default: stream
  const latestUserMsg = messages[messages.length - 1]?.content ?? '';

  // 3. Load user context (same as internal route, minus Clerk)
  let dbUserId: string | null = null;
  let userName = 'API User';
  try {
    const user = await prisma.user.findUnique({ where: { id: guard.userId } });
    dbUserId = user?.id ?? null;
    userName = user?.name ?? 'API User';
  } catch {}

  // 4. Build system prompt (identical pipeline to internal route)
  const detectedMode = detectMode(latestUserMsg);
  const currentTopics = extractTopics(latestUserMsg);

  const [memoryContext, identityCtx] = await Promise.all([
    dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
    dbUserId
      ? getIdentityContext(dbUserId)
      : Promise.resolve({
          promptBlock: '',
          tasteDirectives: '',
          partnerDirectives: '',
          raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
        }),
  ]);

  let systemPrompt = getSystemPromptForMode(detectedMode, userName);

  // Inject same context blocks as the internal route
  if (identityCtx.promptBlock)      systemPrompt += identityCtx.promptBlock;
  if (identityCtx.tasteDirectives)  systemPrompt += identityCtx.tasteDirectives;
  if (identityCtx.partnerDirectives) systemPrompt += identityCtx.partnerDirectives;
  if (memoryContext)
    systemPrompt += `\n\n## Memories\n${memoryContext}`;

  const mcpTools = await mcpManager.getAllTools();
  if (mcpTools.length > 0) {
    const toolSummary = mcpTools.map(t => `  • **${t.name}** – ${t.description.split('.')[0]}`).join('\n');
    systemPrompt += `\n\n## Active Tools (${mcpTools.length})\n${toolSummary}`;
  }

  // Add a small API-mode notice
  systemPrompt += `\n\n## API Access\nYou are responding via the HOLLY Public API. Be concise and structured.`;

  // 5. Build Groq messages
  const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // 6. Branch: streaming vs. non-streaming
  if (wantStream) {
    // ── Streaming path ────────────────────────────────────────────────────────
    let tokensIn  = 0;
    let tokensOut = 0;
    let statusCode = 200;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          enc(controller, { type: 'status', content: '🤔 Thinking...' });

          const completion = await groq.chat.completions.create({
            model:       'llama-3.3-70b-versatile',
            messages:    groqMessages,
            stream:      true,
            temperature: 0.7,
            max_tokens:  2048,
          });

          let fullText = '';
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? '';
            if (delta) {
              fullText += delta;
              enc(controller, { type: 'text', content: delta });
            }
            if (chunk.usage) {
              tokensIn  = chunk.usage.prompt_tokens     ?? 0;
              tokensOut = chunk.usage.completion_tokens ?? 0;
            }
          }

          // Estimate if Groq didn't return usage
          if (!tokensIn) tokensIn  = Math.ceil(systemPrompt.length / 4);
          if (!tokensOut) tokensOut = Math.ceil(fullText.length / 4);

          enc(controller, {
            type:  'done',
            usage: { tokens_in: tokensIn, tokens_out: tokensOut },
            rate_limit: { remaining_rpm: guard.remainingRpm, remaining_rpd: guard.remainingRpd },
          });

          controller.close();

          // Fire-and-forget usage log
          logUsage(
            guard.apiKey.id,
            '/api/v1/chat',
            'POST',
            statusCode,
            Date.now() - startMs,
            tokensIn,
            tokensOut,
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
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-RateLimit-Remaining-RPM': String(guard.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(guard.remainingRpd),
      },
    });
  } else {
    // ── Non-streaming path ────────────────────────────────────────────────────
    try {
      const completion = await groq.chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages:    groqMessages,
        stream:      false,
        temperature: 0.7,
        max_tokens:  2048,
      });

      const message   = completion.choices[0]?.message?.content ?? '';
      const tokensIn  = completion.usage?.prompt_tokens     ?? 0;
      const tokensOut = completion.usage?.completion_tokens ?? 0;
      const durationMs = Date.now() - startMs;

      logUsage(guard.apiKey.id, '/api/v1/chat', 'POST', 200, durationMs, tokensIn, tokensOut).catch(() => {});

      return NextResponse.json(
        {
          ok:      true,
          message,
          model:   completion.model,
          usage:   { tokens_in: tokensIn, tokens_out: tokensOut },
          rate_limit: { remaining_rpm: guard.remainingRpm, remaining_rpd: guard.remainingRpd },
        },
        {
          headers: {
            'X-RateLimit-Remaining-RPM': String(guard.remainingRpm),
            'X-RateLimit-Remaining-RPD': String(guard.remainingRpd),
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
  return NextResponse.json({
    endpoint:  'POST /api/v1/chat',
    version:   'v1',
    phase:     7,
    auth:      'Bearer holly_xxxx  or  x-api-key: holly_xxxx',
    scopes:    ['chat'],
    limits:    'see your key\'s rpmLimit / rpdLimit',
    docs:      'https://holly-ai.dev/docs/api',
    stream:    'Pass stream=true (default) for SSE, stream=false for JSON',
    request: {
      messages: 'Array<{ role: "user" | "assistant", content: string }>',
      stream:   'boolean (optional, default true)',
      model:    'string (optional hint)',
    },
  });
}
