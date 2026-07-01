/**
 * POST /api/image/generate-multi
 *
 * HOLLY's multi-provider image generation.
 * 100% free, open-source, zero token cost.
 * Delegates to the canonical media-generator waterfall.
 *
 * Provider waterfall (HF_INFERENCE_ENABLED=false default → Pollinations only):
 *   DEFAULT: Pollinations AI — FLUX.1-schnell (Apache-2.0, no key, $0 forever)
 *   OPT-IN:  HF FLUX.2-klein 4B → HF FLUX.1-schnell → HF SDXL → Pollinations retry
 *
 * Blocked forever: Midjourney, DALL-E, Imagen, Fal.ai, Replicate, Adobe Firefly
 *
 * Phase Q3 Gap 2a: Both gates enforced.
 *   - requireAdult(): hard legal age gate (18+ verified or creator bypass)
 *   - intimacy gate: soft relational tier gate (stranger → trusted)
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
    // ── Hard legal gate: 18+ verified (or creator bypass) ──
    const gate = await requireAdult();
    if (gate instanceof NextResponse) return gate;

    const body = await request.json() as ImageRequest & {
      width?: number;
      height?: number;
      numOutputs?: number;
      guidanceScale?: number;
      numInferenceSteps?: number;
      provider?: string;
    };

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
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // ── Intimacy Gate: tier-based content gating (stranger → trusted) ──
    const isNude = isNudeImageRequest(prompt);
    const isSexual = isSexualImageRequest(prompt);

    if (isNude || isSexual) {
      const intimacy = await getIntimacyState(gate.dbUserId, gate.isCreator);

      if (isSexual && !intimacy.canShareSexual) {
        return NextResponse.json({
          success: false,
          error: 'intimacy_gate',
          message: getIntimacyRefusal(intimacy.tier, 'sexual_image'),
          tier: intimacy.tier,
        }, { status: 403 });
      }

      if (isNude && !intimacy.canShareNude) {
        return NextResponse.json({
          success: false,
          error: 'intimacy_gate',
          message: getIntimacyRefusal(intimacy.tier, 'nude_image'),
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
      url:      result.url,
      imageUrl: result.url,
      provider: result.provider,
      model:    result.model,
      width:    result.width,
      height:   result.height,
      licence:  result.licence,
      cost:     0,
    });

  } catch (error: any) {
    console.error('[ImageMulti] Generation failed:', error.message);
    return NextResponse.json(
      { error: 'Image generation failed', detail: error.message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/image/generate-multi',
    providers: [
      { name: 'Pollinations AI (FLUX.1-schnell)', keyRequired: false, licence: 'Apache-2.0', note: 'Default. Always $0. No account. Apache-2.0.' },
      { name: 'HuggingFace FLUX.2-klein 4B (Jan 2026)', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0', note: 'OPT-IN only (HF_INFERENCE_ENABLED=true). Pay-as-you-go disabled by default.' },
      { name: 'HuggingFace FLUX.1-schnell', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0', note: 'OPT-IN only.' },
      { name: 'HuggingFace SDXL 1.0', keyRequired: true, env: 'HUGGINGFACE_API_KEY', licence: 'Apache-2.0', note: 'OPT-IN only.' },
    ],
    models:  ['flux-dev', 'flux-schnell', 'sdxl', 'turbo', 'auto'],
    cost:    0,
    policy:  'Free, open-source, zero token cost — Fal.ai, Replicate, DALL-E, Midjourney are blocked permanently',
  });
}
