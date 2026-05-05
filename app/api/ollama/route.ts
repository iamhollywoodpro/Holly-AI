/**
 * GET  /api/ollama  — health check: is Ollama running? what models are available?
 * POST /api/ollama  — pull a new model (admin only)
 *
 * Phase 4B: Ollama local LLM management endpoint.
 * Frontend can call this to show an Ollama status badge and model picker.
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ollamaService } from '@/lib/ai/ollama-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET: health + model inventory ───────────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Force a fresh health check (not cached)
    const health = await ollamaService.getHealth(true);

    return NextResponse.json({
      available: health.available,
      baseUrl: health.baseUrl,
      latencyMs: health.latencyMs,
      preferredModel: health.preferredModel,
      models: health.models.map(m => ({
        name: m.name,
        sizeMB: Math.round(m.size / 1024 / 1024),
        modifiedAt: m.modifiedAt,
      })),
      error: health.error || null,
      setupInstructions: !health.available
        ? {
            install: 'https://ollama.ai — download and install Ollama',
            pullModel: 'ollama pull llama3.2',
            envVar: 'Set OLLAMA_BASE_URL=http://localhost:11434 (or your server URL)',
            enable: 'Set OLLAMA_ENABLED=true to route chats to Ollama when available',
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ─── POST: pull a model ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { model } = body;

    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'model name required' }, { status: 400 });
    }

    // Only allow safe model names (alphanumeric, hyphens, colons, dots)
    if (!/^[a-zA-Z0-9:._-]+$/.test(model)) {
      return NextResponse.json({ error: 'Invalid model name' }, { status: 400 });
    }

    const result = await ollamaService.pull(model);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
