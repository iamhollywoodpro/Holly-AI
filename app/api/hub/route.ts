/**
 * HOLLY Tool Hub — Master Endpoint
 * GET  /api/hub  — list all tools, status, docs
 * POST /api/hub  — route a request to any tool via unified interface
 *
 * POST body:
 *   { "tool": "aura", "action": "analyze_song", "payload": { ... } }
 *
 * Auth:
 *   Authorization: Bearer holly_xxxx
 *   x-api-key: holly_xxxx
 *   x-hub-key: <HOLLY_HUB_API_KEY>   (Vercel env var — master hub secret)
 *   x-hub-key: hub_dev               (development only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllTools, getTool } from '@/lib/hub/registry';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { writeLog, newRequestId, startTimer, getMetrics } from '@/lib/hub/logger';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import type { HubRequest, HubResponse } from '@/lib/hub/types';

// ─── Tool action handlers (lazy imports to reduce cold-start bundle) ──────────
async function dispatchAction(tool: string, action: string, payload: Record<string, unknown>): Promise<unknown> {
  if (tool === 'aura') {
    const { analyzeSong, generateRecommendations, identifyHitPotential } = await import('@/lib/hub/tools/aura-engine');
    if (action === 'analyze_song')             return analyzeSong(payload as never);
    if (action === 'generate_recommendations') return generateRecommendations(payload as never);
    if (action === 'identify_hit_potential')   return identifyHitPotential(payload as never);
  }
  if (tool === 'sentinel') {
    const { analyzeCode, generateCode } = await import('@/lib/hub/tools/sentinel-engine');
    if (action === 'analyze_code')  return analyzeCode(payload as never);
    if (action === 'generate_code') return generateCode(payload as never);
  }
  throw new Error(`Unknown action "${action}" for tool "${tool}"`);
}

// ─── GET — Hub directory ──────────────────────────────────────────────────────

export async function GET() {
  const tools   = getAllTools();
  const metrics = getMetrics();

  return NextResponse.json({
    name:    'HOLLY Tool Hub',
    version: '1.0.0',
    status:  'operational',
    description: 'Centralized AI tool hub providing access to AURA (music intelligence) and Sentinel (code intelligence) via a unified RESTful API.',
    tools: tools.map(t => ({
      id:          t.id,
      name:        t.name,
      version:     t.version,
      description: t.description,
      category:    t.category,
      status:      t.status,
      rateLimit:   t.rateLimit,
      baseUrl:     t.baseUrl,
      actions: t.actions.map(a => ({
        id:          a.id,
        name:        a.name,
        description: a.description,
        method:      a.method,
        endpoint:    `${t.baseUrl}/${a.id}`,
        requiredFields: Object.entries(a.inputSchema).filter(([, v]) => v.required).map(([k]) => k),
      })),
    })),
    metrics: {
      totalRequests: metrics.total,
      successCount:  metrics.success,
      errorCount:    metrics.errors,
      successRate:   metrics.total ? `${Math.round((metrics.success / metrics.total) * 100)}%` : 'n/a',
      avgDuration:   `${metrics.avgDuration}ms`,
    },
    authentication: {
      methods: [
        'Authorization: Bearer holly_xxxx',
        'x-api-key: holly_xxxx',
        'x-hub-key: <HOLLY_HUB_API_KEY>   (master hub secret, set in Vercel)',
      ],
      keyFormat:      'holly_xxxx — generate at /settings/api-keys',
      masterKeyEnv:   'HOLLY_HUB_API_KEY',
      devBypass:      process.env.NODE_ENV === 'development' ? 'x-hub-key: hub_dev' : undefined,
    },
    endpoints: {
      hub:              'GET|POST /api/hub',
      aura_manifest:    'GET /api/hub/aura',
      aura_analyze:     'POST /api/hub/aura/analyze_song',
      aura_recs:        'POST /api/hub/aura/generate_recommendations',
      aura_hit:         'POST /api/hub/aura/identify_hit_potential',
      sentinel_manifest:'GET /api/hub/sentinel',
      sentinel_analyze: 'POST /api/hub/sentinel/analyze_code',
      sentinel_gen:     'POST /api/hub/sentinel/generate_code',
      logs:             'GET /api/hub/logs?tool=aura&status=error&limit=50',
      metrics:          'GET /api/hub/metrics',
    },
    docs:      '/hub',
    changelog: [
      { version: '1.0.0', date: '2026-03-28', notes: 'Initial release — AURA + Sentinel' },
    ],
  });
}

// ─── POST — Master router ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const elapsed   = startTimer();

  // ── Auth ──
  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  // ── Parse body ──
  let body: HubRequest;
  try {
    body = await req.json() as HubRequest;
  } catch {
    return NextResponse.json<HubResponse>(
      { ok: false, tool: 'hub', action: 'route', requestId, timestamp: new Date().toISOString(), duration: elapsed(), error: 'Invalid JSON body — must be valid JSON with { tool, action, payload }' },
      { status: 400 },
    );
  }

  const { tool, action, payload } = body;

  if (!tool || !action || !payload) {
    return NextResponse.json<HubResponse>(
      {
        ok: false, tool: tool ?? 'hub', action: action ?? 'unknown',
        requestId, timestamp: new Date().toISOString(), duration: elapsed(),
        error:  'Request body must include: "tool", "action", and "payload"',
        code:   'MISSING_FIELDS',
      },
      { status: 400 },
    );
  }

  // ── Validate tool ──
  const manifest = getTool(tool);
  if (!manifest) {
    return NextResponse.json<HubResponse>(
      {
        ok: false, tool, action, requestId, timestamp: new Date().toISOString(), duration: elapsed(),
        error: `Unknown tool "${tool}". Available tools: ${getAllTools().map(t => t.id).join(', ')}`,
        code:  'TOOL_NOT_FOUND',
      },
      { status: 404 },
    );
  }

  // ── Validate action ──
  const actionManifest = manifest.actions.find(a => a.id === action);
  if (!actionManifest) {
    return NextResponse.json<HubResponse>(
      {
        ok: false, tool, action, requestId, timestamp: new Date().toISOString(), duration: elapsed(),
        error: `Unknown action "${action}" for tool "${tool}". Valid: ${manifest.actions.map(a => a.id).join(', ')}`,
        code:  'ACTION_NOT_FOUND',
      },
      { status: 404 },
    );
  }

  // ── Rate limit ──
  const rl = checkHubRateLimit(auth.userId, tool);
  if (!rl.ok) {
    writeLog({
      requestId, timestamp: new Date().toISOString(), tool, action,
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'rate_limited', statusCode: 429,
      inputSize: JSON.stringify(payload).length, outputSize: 0,
    });
    return NextResponse.json<HubResponse>(
      {
        ok: false, tool, action, requestId, timestamp: new Date().toISOString(), duration: elapsed(),
        error: `Rate limit exceeded. Remaining: ${rl.remainingRpm} RPM, ${rl.remainingRpd} RPD. Resets in ${Math.ceil(rl.resetInMs / 1000)}s.`,
        code:  'RATE_LIMITED',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit-RPM':      String(rl.limitRpm),
          'X-RateLimit-Limit-RPD':      String(rl.limitRpd),
          'X-RateLimit-Remaining-RPM':  String(rl.remainingRpm),
          'X-RateLimit-Remaining-RPD':  String(rl.remainingRpd),
          'Retry-After':                String(Math.ceil(rl.resetInMs / 1000)),
        },
      },
    );
  }

  // ── Dispatch ──
  try {
    const data = await dispatchAction(tool, action, payload);
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(), tool, action,
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'success', statusCode: 200,
      inputSize: JSON.stringify(payload).length,
      outputSize: JSON.stringify(data).length,
    });

    return NextResponse.json<HubResponse>({
      ok: true, tool, action, requestId,
      timestamp: new Date().toISOString(),
      duration,
      data,
    }, {
      headers: {
        'X-RateLimit-Remaining-RPM': String(rl.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(rl.remainingRpd),
        'X-Request-Id':              requestId,
      },
    });

  } catch (err: unknown) {
    const msg      = err instanceof Error ? err.message : 'Internal error';
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(), tool, action,
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: JSON.stringify(payload).length, outputSize: 0,
    });

    return NextResponse.json<HubResponse>(
      { ok: false, tool, action, requestId, timestamp: new Date().toISOString(), duration, error: msg, code: 'DISPATCH_ERROR' },
      { status: 500 },
    );
  }
}

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited
