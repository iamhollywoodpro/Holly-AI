/**
 * POST /api/image/generate-ultimate
 *
 * HOLLY's canonical image generation endpoint.
 * 100% free, open-source, zero token cost.
 *
 * Provider waterfall (no keys needed → optional key for better quality):
 *   1. Pollinations AI — FLUX.1-dev (no key, always available)
 *   2. HuggingFace    — FLUX.1-schnell (free tier, HUGGINGFACE_API_KEY)
 *   3. HuggingFace    — SDXL (free tier, HUGGINGFACE_API_KEY)
 *
 * Blocked forever: Midjourney, DALL-E, Imagen, Runway, Sora, Fal.ai, Replicate
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateImage, type ImageRequest } from '@/lib/ai/media-generator';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      model        = 'flux-dev',
      aspectRatio  = '1:1',
      width,
      height,
      seed,
      style,
      enhance,
    } = body as ImageRequest & { [key: string]: unknown };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const result = await generateImage({
      prompt,
      negativePrompt,
      model,
      aspectRatio,
      width,
      height,
      seed,
      style,
      enhance,
    });

    return NextResponse.json({
      success:  true,
      imageUrl: result.url,
      url:      result.url,
      provider: result.provider,
      model:    result.model,
      width:    result.width,
      height:   result.height,
      licence:  result.licence,
      cost:     0,
    });

  } catch (error: any) {
    console.error('[Image API] Generation failed:', error.message);
    return NextResponse.json(
      { error: 'Image generation failed', detail: error.message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/image/generate-ultimate',
    providers: [
      { name: 'Pollinations AI (FLUX.1)', keyRequired: false, licence: 'Apache-2.0' },
      { name: 'HuggingFace FLUX.1-schnell', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0' },
      { name: 'HuggingFace SDXL', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0' },
    ],
    models:   ['flux-dev', 'flux-schnell', 'sdxl', 'turbo', 'auto'],
    cost:     0,
    policy:   'Free, open-source, zero token cost — no Midjourney, DALL-E, Imagen, Runway',
  });
}
