/**
 * POST /api/video/generate-ultimate
 *
 * HOLLY's canonical video generation endpoint.
 * 100% free, open-source, zero token cost.
 *
 * Provider waterfall (no keys needed → optional key for better quality):
 *   1. Pollinations AI — video (no key, experimental, always available)
 *   2. HuggingFace    — ZeroScope v2 XL (free tier, HUGGINGFACE_API_KEY, CC-BY-NC-4.0)
 *   3. HuggingFace    — AnimateDiff (free tier, HUGGINGFACE_API_KEY, Apache-2.0)
 *
 * Blocked forever: Runway, Sora, Pika Labs, Kling (all paid)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateVideo, type VideoRequest } from '@/lib/ai/media-generator';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      prompt,
      duration    = 4,
      aspectRatio = '16:9',
      fps         = 8,
      style,
      inputImage,
    } = body as VideoRequest & { [key: string]: unknown };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const result = await generateVideo({
      prompt,
      duration,
      aspectRatio,
      fps,
      style,
      inputImage,
    });

    return NextResponse.json({
      success:  true,
      videoUrl: result.url,
      url:      result.url,
      provider: result.provider,
      model:    result.model,
      duration: result.duration,
      fps:      result.fps,
      format:   result.format,
      licence:  result.licence,
      cost:     0,
    });

  } catch (error: any) {
    console.error('[Video Ultimate API] Generation failed:', error.message);
    return NextResponse.json(
      { error: 'Video generation failed', detail: error.message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/video/generate-ultimate',
    providers: [
      { name: 'Pollinations AI Video', keyRequired: false, licence: 'Apache-2.0', note: 'No key needed. Experimental.' },
      { name: 'HuggingFace ZeroScope v2 XL', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'CC-BY-NC-4.0', note: 'Free tier. Best OSS text-to-video.' },
      { name: 'HuggingFace AnimateDiff', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0', note: 'GIF output. Good fallback.' },
    ],
    models:  ['zeroscope-v2-xl', 'animatediff-v1.5', 'pollinations-video'],
    cost:    0,
    policy:  'Free, open-source only — Runway, Sora, Pika Labs, Kling are blocked permanently',
  });
}
