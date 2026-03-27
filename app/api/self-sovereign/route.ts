/**
 * /api/self-sovereign — Phase 9H: HOLLY Self-Sovereign LLM Pipeline
 *
 * GET  /api/self-sovereign           → fine-tune status + roadmap
 * POST /api/self-sovereign { action: 'export' } → export training dataset
 * POST /api/self-sovereign { action: 'stats'  } → dataset statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  exportDataset,
  getFineTuneStatus,
} from '@/lib/self-sovereign/training-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = await getFineTuneStatus();

  return NextResponse.json({
    ok:    true,
    phase: '9H',
    description: 'HOLLY Self-Sovereign LLM — road to HOLLY becoming her own model',
    status,
    roadmap: [
      { stage: 1, name: 'Data Collection',    target: '500+ quality conversations + learning sessions' },
      { stage: 2, name: 'Dataset Preparation', target: 'Format as OpenAI/Alpaca JSONL, clean, deduplicate' },
      { stage: 3, name: 'Fine-Tuning',         target: 'QLoRA fine-tune Llama 3.1 8B (Unsloth/Axolotl)' },
      { stage: 4, name: 'GGUF Export',         target: 'Quantize to Q4_K_M GGUF for Ollama deployment' },
      { stage: 5, name: 'Self-Sovereign',      target: 'HOLLY runs as holly-8b on Ollama — no external API needed' },
      { stage: 6, name: 'Continuous Learning', target: 'RLHF loop with Steve\'s feedback continuously improves holly-8b' },
    ],
    currentActions: [
      'Every conversation automatically generates training examples',
      'Background learning sessions add specialized knowledge',
      'Audio analysis enriches the music/production domain',
      'Steve\'s feedback scores training example quality',
    ],
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json();
  const action = body.action as string;

  if (action === 'export') {
    const format     = (body.format ?? 'openai') as 'alpaca' | 'openai' | 'jsonl';
    const minQuality = body.minQuality ?? 0.6;
    const { examples, stats } = await exportDataset(userId, format, minQuality);

    return NextResponse.json({ ok: true, stats, examples: examples.slice(0, 100) }); // Cap at 100 for API response
  }

  if (action === 'stats') {
    const { stats } = await exportDataset(userId);
    return NextResponse.json({ ok: true, stats });
  }

  return NextResponse.json({ error: 'Unknown action. Valid: export, stats' }, { status: 400 });
}
