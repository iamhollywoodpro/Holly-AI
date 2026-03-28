/**
 * HOLLY Multi-Modal Status API — Phase 11
 *
 * GET /api/multimodal/status
 *
 * Returns the current status of all generation providers,
 * available models, and environment key configuration.
 * Useful for the Studio UI to know what's available.
 */

import { NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/multimodal/generation-engine';

export async function GET() {
  const registry = getProviderRegistry();

  // Check which API keys are configured (existence only, not values)
  const keyStatus = {
    FAL_KEY: !!process.env.FAL_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    REPLICATE_API_KEY: !!process.env.REPLICATE_API_KEY,
    RUNWAY_API_KEY: !!process.env.RUNWAY_API_KEY,
    LUMAAI_API_KEY: !!process.env.LUMAAI_API_KEY,
    SUNO_API_KEY: !!process.env.SUNOAPI_KEY,
  };

  const imageProviders = registry.filter(p => p.modalities.includes('image'));
  const videoProviders = registry.filter(p => p.modalities.includes('video'));

  const imageAvailable = imageProviders.some(p => p.available);
  const videoAvailable = videoProviders.some(p => p.available);

  // Always available (free, no key required)
  const pollinationsAvailable = true;

  return NextResponse.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,

    capabilities: {
      imageGeneration: imageAvailable || pollinationsAvailable,
      videoGeneration: videoAvailable,
      musicVideoCreation: imageAvailable || pollinationsAvailable,
      audioVisualSync: true,
      musicGeneration: keyStatus.SUNO_API_KEY,
    },

    providers: registry,

    keyConfiguration: {
      configured: Object.entries(keyStatus)
        .filter(([, v]) => v)
        .map(([k]) => k),
      missing: Object.entries(keyStatus)
        .filter(([, v]) => !v)
        .map(([k]) => ({
          key: k,
          purpose: KEY_PURPOSES[k as keyof typeof KEY_PURPOSES] || 'Unknown',
          getUrl: KEY_URLS[k as keyof typeof KEY_URLS] || '#',
          required: KEY_REQUIRED[k as keyof typeof KEY_REQUIRED] || false,
        })),
    },

    freeOptions: [
      {
        modality: 'image',
        provider: 'Pollinations AI',
        model: 'FLUX',
        quality: 'Good — suitable for prototyping and development',
        cost: 'Free, no API key required',
        limitation: 'No NSFW, rate limited by IP',
      },
    ],

    recommendations: buildRecommendations(keyStatus),
  });
}

// ─── Key metadata ─────────────────────────────────────────────────────────────

const KEY_PURPOSES = {
  FAL_KEY: 'Best image & video generation (FLUX 1.1 Pro, Kling v2, Wan 2.5, SDXL)',
  OPENAI_API_KEY: 'DALL-E 3 image generation + GPT-4 reasoning in chat',
  REPLICATE_API_KEY: 'Video generation fallback (Zeroscope, AnimateDiff)',
  RUNWAY_API_KEY: 'Runway Gen-4 Turbo — cinematic video generation',
  LUMAAI_API_KEY: 'LumaAI Dream Machine — photorealistic video',
  SUNO_API_KEY: 'AI music generation (complete songs with vocals)',
};

const KEY_URLS = {
  FAL_KEY: 'https://fal.ai/dashboard/keys',
  OPENAI_API_KEY: 'https://platform.openai.com/api-keys',
  REPLICATE_API_KEY: 'https://replicate.com/account/api-tokens',
  RUNWAY_API_KEY: 'https://runwayml.com/api',
  LUMAAI_API_KEY: 'https://lumalabs.ai/dream-machine/api',
  SUNO_API_KEY: 'https://suno.com',
};

const KEY_REQUIRED = {
  FAL_KEY: false,
  OPENAI_API_KEY: false,
  REPLICATE_API_KEY: false,
  RUNWAY_API_KEY: false,
  LUMAAI_API_KEY: false,
  SUNO_API_KEY: false,
};

function buildRecommendations(keyStatus: Record<string, boolean>): string[] {
  const recs: string[] = [];

  if (!keyStatus.FAL_KEY) {
    recs.push('Add FAL_KEY for the best image and video quality — FLUX 1.1 Pro, Kling v2, and more. Get one free at fal.ai');
  }

  if (!keyStatus.OPENAI_API_KEY) {
    recs.push('Add OPENAI_API_KEY to enable DALL-E 3 for photorealistic images and enhanced chat reasoning.');
  }

  if (!keyStatus.REPLICATE_API_KEY && !keyStatus.FAL_KEY) {
    recs.push('Add REPLICATE_API_KEY as a video generation fallback. Works alongside FAL_KEY for redundancy.');
  }

  if (!keyStatus.SUNO_API_KEY) {
    recs.push('Add SUNOAPI_KEY to enable full AI music generation — complete songs with vocals, instruments, and style control.');
  }

  if (Object.values(keyStatus).every(v => !v)) {
    recs.push('HOLLY works right now using Pollinations (free image generation). Add API keys to unlock the full suite.');
  }

  return recs;
}
