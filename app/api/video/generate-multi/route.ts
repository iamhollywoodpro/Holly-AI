/**
 * POST /api/video/generate-multi
 *
 * Free multi-provider video generation — no Runway, no Replicate, no paid APIs.
 * Delegates to the canonical media-generator waterfall.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateVideo, type VideoRequest } from '@/lib/ai/media-generator';

export const runtime    = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json() as VideoRequest & { priority?: string; [key: string]: unknown };
    const { prompt, duration, aspectRatio, fps, style, inputImage } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const result = await generateVideo({ prompt, duration, aspectRatio, fps, style, inputImage });

    return NextResponse.json({
      success:  true,
      url:      result.url,
      videoUrl: result.url,
      provider: result.provider,
      model:    result.model,
      duration: result.duration,
      format:   result.format,
      licence:  result.licence,
      cost:     0,
    });

  } catch (error: any) {
    console.error('[VideoMulti] Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint:  'POST /api/video/generate-multi',
    providers: [
      { name: 'Pollinations AI Video', keyRequired: false, licence: 'Apache-2.0' },
      { name: 'HuggingFace ZeroScope v2 XL', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'CC-BY-NC-4.0' },
      { name: 'HuggingFace AnimateDiff', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0' },
    ],
    cost:   0,
    policy: 'Free OSS only — Runway, Replicate, Sora are blocked',
  });
}
