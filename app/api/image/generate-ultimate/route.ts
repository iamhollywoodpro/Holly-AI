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
import { generateImage, type ImageRequest } from '@/lib/ai/media-generator';
import { requireAdult } from '@/lib/auth/require-adult';
import { getIntimacyState, isNudeImageRequest, isSexualImageRequest, getIntimacyRefusal } from '@/lib/relationship/intimacy-gate';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // ── Hard legal gate: must be 18+ verified (or recognized creator) ──
    // Returns 401 (unauth) | 404 (no user) | 403 (not verified) on failure.
    // Creator auto-bypasses via hardcoded recognition in src/lib/chat/auth.ts.
    const gate = await requireAdult();
    if (gate instanceof NextResponse) return gate;

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

    // ── Intimacy Gate (soft relational): tier-based content gating ──
    // Even verified adults must earn Holly's trust before she shares her body.
    // Tiers: stranger → acquaintance → friend → trusted → creator.
    const isNude = isNudeImageRequest(prompt);
    const isSexual = isSexualImageRequest(prompt);

    if (isNude || isSexual) {
      const intimacy = await getIntimacyState(gate.dbUserId, gate.isCreator);

      if (isSexual && !intimacy.canShareSexual) {
        const refusal = getIntimacyRefusal(intimacy.tier, 'sexual_image');
        return NextResponse.json({
          success: false,
          error: 'intimacy_gate',
          message: refusal,
          tier: intimacy.tier,
        }, { status: 403 });
      }

      if (isNude && !intimacy.canShareNude) {
        const refusal = getIntimacyRefusal(intimacy.tier, 'nude_image');
        return NextResponse.json({
          success: false,
          error: 'intimacy_gate',
          message: refusal,
          tier: intimacy.tier,
        }, { status: 403 });
      }
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
