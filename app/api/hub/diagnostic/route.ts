/**
 * POST /api/hub/diagnostic — HTTP Hub for diagnostic_check tool
 *
 * Provides `diagnostic_check` as an HTTP endpoint so it works even when
 * the stdio MCP subprocess fails in Docker/Coolify.
 *
 * Checks: health, tts, llm, memory, image
 * Secured via x-internal-token (server-to-server only).
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.HOLLY_BASE_URL || 'http://localhost:3000';

function verifyInternal(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const secret = process.env.INTERNAL_API_SECRET;
  return !!(secret && token && token === secret);
}

async function fetchJSON(url: string): Promise<{ status: number; body: any }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const body = await res.json();
  return { status: res.status, body };
}

export async function POST(req: NextRequest) {
  if (!verifyInternal(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const checks = body.checks || ['health', 'tts', 'llm', 'memory', 'image'];
    const results: string[] = [];

    // ── Health check ─────────────────────────────────────────────────────────
    if (checks.includes('health')) {
      try {
        const res = await fetchJSON(`${BASE_URL}/api/health`);
        results.push(`Health: HTTP ${res.status} — ${JSON.stringify(res.body).substring(0, 200)}`);
      } catch (err: unknown) {
        results.push(`Health: Failed — ${(err as Error).message}`);
      }
    }

    // ── TTS check ────────────────────────────────────────────────────────────
    if (checks.includes('tts')) {
      try {
        const res = await fetchJSON(`${BASE_URL}/api/voice/synthesize`);
        const b = typeof res.body === 'object' ? res.body : {};
        const voxcpm = b.providers?.primary?.configured;
        const kokoro = b.providers?.fallback?.configured;
        results.push(`${voxcpm ? 'OK' : 'MISSING'} TTS VoxCPM2: ${voxcpm ? 'configured' : 'not configured'} (${b.providers?.primary?.url || 'N/A'})`);
        results.push(`${kokoro ? 'OK' : 'MISSING'} TTS Kokoro: ${kokoro ? 'configured' : 'not configured'} (${b.providers?.fallback?.url || 'N/A'})`);
      } catch (err: unknown) {
        results.push(`TTS check failed: ${(err as Error).message}`);
      }
    }

    // ── LLM API keys ─────────────────────────────────────────────────────────
    if (checks.includes('llm')) {
      const keys: Record<string, string | undefined> = {
        Groq: process.env.GROQ_API_KEY,
        OpenRouter: process.env.OPENROUTER_API_KEY,
        NVIDIA: process.env.NVIDIA_API_KEY,
        TogetherAI: process.env.TOGETHER_API_KEY,
        Google: process.env.GOOGLE_AI_API_KEY,
        Mistral: process.env.MISTRAL_API_KEY,
      };
      for (const [name, val] of Object.entries(keys)) {
        results.push(`${val ? 'OK' : 'MISSING'} ${name} API Key`);
      }
    }

    // ── Memory / Database ────────────────────────────────────────────────────
    if (checks.includes('memory')) {
      results.push(`${process.env.DATABASE_URL ? 'OK' : 'MISSING'} Database URL`);
      try {
        const { prisma } = await import('@/lib/db');
        await prisma.$queryRaw`SELECT 1`;
        results.push('OK Database connection: active');
      } catch (err: unknown) {
        results.push(`FAIL Database connection: ${(err as Error).message}`);
      }
    }

    // ── Image generation ─────────────────────────────────────────────────────
    if (checks.includes('image')) {
      const modalEndpoints = [
        { name: 'Holly FLUX (L4)', url: `${BASE_URL}/api/image/status` },
      ];
      for (const ep of modalEndpoints) {
        try {
          const res = await fetchJSON(ep.url);
          results.push(`OK ${ep.name}: HTTP ${res.status}`);
        } catch (err: unknown) {
          results.push(`FAIL ${ep.name}: ${(err as Error).message}`);
        }
      }
    }

    const report = `HOLLY Diagnostic Report\n${'='.repeat(40)}\n\n${results.join('\n')}\n\nTimestamp: ${new Date().toISOString()}`;
    return NextResponse.json({ ok: true, result: report });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
