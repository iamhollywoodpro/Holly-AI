/**
 * POST /api/audio/stem-separate
 *
 * HOLLY Stem Separation — Phase 12B
 *
 * Uses Demucs / Spleeter to split a track into stems:
 *   - vocals
 *   - drums
 *   - bass
 *   - other (instruments)
 *
 * Provider priority (free-first):
 *   1. HuggingFace — deezer/spleeter (free tier, 2-stems, Apache-2.0)
 *   2. FAL.ai      — fal-ai/demucs (optional paid credits — only if FAL_KEY set)
 *   3. Replicate   — mtg/demucs (optional free tier — only if REPLICATE_API_KEY set)
 *
 * NOTE: FAL.ai and Replicate are optional enhancements; Holly works without them.
 *
 * Request body:
 * {
 *   audioUrl: string          // Public URL to audio file (MP3, WAV, FLAC, etc.)
 *   fileName?: string         // Original filename (for display)
 *   model?: '2stems' | '4stems' | '6stems'  // default: '4stems'
 *   quality?: 'fast' | 'best'               // default: 'fast'
 * }
 *
 * Response:
 * {
 *   success: true,
 *   jobId: string,
 *   provider: 'fal' | 'replicate' | 'hf',
 *   status: 'processing' | 'completed',
 *   stems?: { vocals, drums, bass, other, piano?, guitar? },
 *   estimatedSeconds?: number,
 *   pollUrl?: string  // For async jobs
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited // 5 minutes max

// ── Provider Clients ──────────────────────────────────────────────────────────

async function separateWithFal(
  audioUrl: string,
  model: string,
): Promise<{ jobId: string; status: string; stems?: Record<string, string>; pollUrl?: string }> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) throw new Error('FAL_KEY not configured');

  // Map stem counts to FAL model variants
  const falModel = model === '6stems'
    ? 'fal-ai/demucs:6stems'
    : model === '2stems'
    ? 'fal-ai/demucs:2stems'
    : 'fal-ai/demucs'; // 4stems default

  const res = await fetch(`https://queue.fal.run/${falModel}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FAL stem separation failed (${res.status}): ${err}`);
  }

  const data = await res.json();

  // FAL returns a request_id for async polling
  if (data.request_id) {
    return {
      jobId:   data.request_id,
      status:  'processing',
      pollUrl: `https://queue.fal.run/${falModel}/requests/${data.request_id}`,
    };
  }

  // Sync result (rare for long audio)
  return {
    jobId:  data.request_id ?? 'fal-sync',
    status: 'completed',
    stems:  extractFalStems(data),
  };
}

function extractFalStems(data: any): Record<string, string> {
  // FAL returns { vocals: { url }, drums: { url }, bass: { url }, other: { url } }
  const stems: Record<string, string> = {};
  for (const stem of ['vocals', 'drums', 'bass', 'other', 'piano', 'guitar']) {
    if (data[stem]?.url) stems[stem] = data[stem].url;
    else if (typeof data[stem] === 'string') stems[stem] = data[stem];
  }
  return stems;
}

async function separateWithReplicate(
  audioUrl: string,
  model: string,
): Promise<{ jobId: string; status: string; stems?: Record<string, string>; pollUrl?: string }> {
  const REPLICATE_KEY = process.env.REPLICATE_API_KEY;
  if (!REPLICATE_KEY) throw new Error('REPLICATE_API_KEY not configured');

  const stemCount = model === '6stems' ? 6 : model === '2stems' ? 2 : 4;

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      version: 'd198ad22b52734e289c4a9d3cf6f35ffba2ff2c2e6ff19e08e65e59cfaabf5d0', // mtg/demucs:4stems
      input: {
        audio:     audioUrl,
        stem:      stemCount === 2 ? 'vocals' : undefined,
        jobs:      1,
        mp3_preset: 2,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Replicate prediction failed (${res.status}): ${err}`);
  }

  const prediction = await res.json();
  const pollUrl    = `https://api.replicate.com/v1/predictions/${prediction.id}`;

  if (prediction.status === 'succeeded') {
    return {
      jobId:  prediction.id,
      status: 'completed',
      stems:  extractReplicateStems(prediction.output),
    };
  }

  return { jobId: prediction.id, status: 'processing', pollUrl };
}

function extractReplicateStems(output: any): Record<string, string> {
  if (!output) return {};
  const stems: Record<string, string> = {};
  for (const [key, value] of Object.entries(output)) {
    if (typeof value === 'string' && value.startsWith('http')) {
      stems[key] = value;
    }
  }
  return stems;
}

/**
 * Fallback: HuggingFace Spleeter (2-stems: vocals + accompaniment)
 * Only works for 2-stem separation, free tier, very slow.
 */
async function separateWithHuggingFace(
  audioUrl: string,
): Promise<{ jobId: string; status: string; stems?: Record<string, string> }> {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HF_KEY) throw new Error('HUGGINGFACE_API_KEY not configured');

  // Fetch the audio file first
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error('Could not fetch audio file');
  const audioBuffer = await audioRes.arrayBuffer();

  const res = await fetch('https://router.huggingface.co/hf-inference/models/deezer/spleeter', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${HF_KEY}`,
      'Content-Type':  'application/octet-stream',
    },
    body: audioBuffer,
  });

  if (!res.ok) throw new Error(`HuggingFace Spleeter failed (${res.status})`);

  // HF returns application/json with base64-encoded stems or URLs
  const data = await res.json();
  const stems: Record<string, string> = {};

  if (data.vocals) stems.vocals = `data:audio/wav;base64,${data.vocals}`;
  if (data.accompaniment) stems.other = `data:audio/wav;base64,${data.accompaniment}`;

  return { jobId: `hf-${Date.now()}`, status: 'completed', stems };
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      audioUrl,
      fileName    = 'audio',
      model       = '4stems',
      quality     = 'fast',
    } = body;

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }

    // Validate model
    const validModels = ['2stems', '4stems', '6stems'];
    if (!validModels.includes(model)) {
      return NextResponse.json({ error: `Invalid model. Use: ${validModels.join(', ')}` }, { status: 400 });
    }

    let result: any;
    let provider = '';

    // ── 1. HuggingFace Spleeter — FREE, no billing (2-stems only) ────────────
    // This is the primary free path. Works for vocals/accompaniment separation
    // without any paid keys. For 4/6-stem jobs we fall through to optional providers.
    if (!result && process.env.HUGGINGFACE_API_KEY && model === '2stems') {
      try {
        result   = await separateWithHuggingFace(audioUrl);
        provider = 'huggingface';
      } catch (err: any) {
        console.warn('[StemSeparate] HuggingFace Spleeter failed:', err.message);
      }
    }

    // ── 2. FAL.ai Demucs — optional (paid credits, faster, supports 4/6-stems) ─
    if (!result && process.env.FAL_KEY) {
      try {
        result   = await separateWithFal(audioUrl, model);
        provider = 'fal';
      } catch (err: any) {
        console.warn('[StemSeparate] FAL Demucs failed:', err.message);
      }
    }

    // ── 3. Replicate Demucs — optional (free tier, slower) ───────────────────
    if (!result && process.env.REPLICATE_API_KEY) {
      try {
        result   = await separateWithReplicate(audioUrl, model);
        provider = 'replicate';
      } catch (err: any) {
        console.warn('[StemSeparate] Replicate Demucs failed:', err.message);
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error:     'No stem separation provider available',
          detail:    model === '2stems'
            ? 'Add HUGGINGFACE_API_KEY (free) for 2-stem separation, or FAL_KEY / REPLICATE_API_KEY for 4/6-stem Demucs.'
            : 'For 4/6-stem separation, add FAL_KEY or REPLICATE_API_KEY. For free 2-stem separation, add HUGGINGFACE_API_KEY.',
          providers: [
            { name: 'HuggingFace Spleeter', env: 'HUGGINGFACE_API_KEY', stems: '2stems', free: true, cost: '$0' },
            { name: 'FAL.ai Demucs',        env: 'FAL_KEY',             stems: '2/4/6',  free: false, cost: 'pay-per-minute, optional' },
            { name: 'Replicate Demucs',     env: 'REPLICATE_API_KEY',   stems: '2/4/6',  free: true, cost: 'free tier, optional' },
          ],
        },
        { status: 503 },
      );
    }

    const stemLabels: Record<string, string> = {
      vocals: '🎤 Vocals',
      drums:  '🥁 Drums',
      bass:   '🎸 Bass',
      other:  '🎹 Instruments',
      piano:  '🎹 Piano',
      guitar: '🎸 Guitar',
    };

    return NextResponse.json({
      success:          true,
      jobId:            result.jobId,
      provider,
      status:           result.status,
      fileName,
      model,
      quality,
      stems:            result.stems,
      stemLabels,
      pollUrl:          result.pollUrl,
      estimatedSeconds: provider === 'huggingface' ? 60 : provider === 'fal' ? 30 : 120,
      message:
        result.status === 'completed'
          ? `✅ ${model} stem separation complete! Isolated: ${Object.keys(result.stems ?? {}).join(', ')}`
          : `⏳ Separating stems with ${provider} — usually takes ${provider === 'fal' ? '30 seconds' : provider === 'huggingface' ? '60 seconds' : '2 minutes'}. ${result.pollUrl ? `Poll ${result.pollUrl} for results.` : ''}`,
    });
  } catch (err: any) {
    console.error('[StemSeparate] Error:', err);
    return NextResponse.json(
      { error: 'Stem separation failed', detail: err.message },
      { status: 500 },
    );
  }
}
