/**
 * POST /api/media/generate-video
 *
 * HOLLY's canonical video generation endpoint.
 * 100% free, open-source, zero token cost.
 *
 * Provider waterfall:
 *   1. Pollinations AI — video (no key, experimental)
 *   2. HuggingFace — ZeroScope v2 XL (free, CC-BY-NC-4.0)
 *   3. HuggingFace — AnimateDiff GIF (free, Apache-2.0)
 *
 * Blocked forever: Runway, Sora, Pika Labs (all paid)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, type VideoRequest } from '@/lib/ai/media-generator';

export const runtime    = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VideoRequest & { [key: string]: unknown };
    const {
      prompt,
      duration     = 4,
      aspectRatio  = '16:9',
      fps          = 8,
      style,
      inputImage,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const result = await generateVideo({ prompt, duration, aspectRatio, fps, style, inputImage });

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
    console.error('[Video API] Generation failed:', error.message);
    return NextResponse.json(
      { error: 'Video generation failed', detail: error.message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/media/generate-video',
    providers: [
      { name: 'Pollinations AI Video', keyRequired: false, licence: 'Apache-2.0' },
      { name: 'HuggingFace ZeroScope v2 XL', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'CC-BY-NC-4.0' },
      { name: 'HuggingFace AnimateDiff', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0' },
    ],
    cost:   0,
    policy: 'Free, open-source only — no Runway, Sora, Pika Labs',
  });
}
