/**
 * HOLLY Multi-Modal Status API — Phase 11
 *
 * GET /api/multimodal/status
 *
 * Returns the current status of all generation providers,
 * available models, and environment key configuration.
 * Useful for the Studio UI to know what's available.
 *
 * 100% FREE / open-source stack — no OpenAI, no DALL-E, no paid LLMs.
 */

import { NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/multimodal/generation-engine';

export async function GET() {
  const registry = getProviderRegistry();

  // Check which API keys are configured (existence only, not values)
  const keyStatus = {
    FAL_KEY: !!process.env.FAL_KEY,
    REPLICATE_API_KEY: !!process.env.REPLICATE_API_KEY,
    HUGGINGFACE_API_KEY: !!process.env.HUGGINGFACE_API_KEY,
    RUNWAY_API_KEY: !!process.env.RUNWAY_API_KEY,
    SUNO_API_KEY: !!process.env.SUNOAPI_KEY,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
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
    note: '100% free stack — Pollinations (images), Fal.ai/HuggingFace (enhanced), Groq (LLM), OpenRouter (vision)',

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
        model: 'FLUX (Apache 2.0)',
        quality: 'Good — suitable for prototyping and development',
        cost: 'Free, no API key required',
        limitation: 'No NSFW, rate limited by IP',
      },
      {
        modality: 'image',
        provider: 'Hugging Face',
        model: 'FLUX.1-schnell, SDXL (both open-source)',
        quality: 'Best open-source quality',
        cost: 'Free with HUGGINGFACE_API_KEY (free signup)',
        limitation: 'Rate limited on free tier',
      },
      {
        modality: 'llm',
        provider: 'Groq',
        model: 'Llama 3.3 70B (Meta, open-source)',
        quality: 'Excellent — beats GPT-4 on many benchmarks',
        cost: 'Free with GROQ_API_KEY (free signup)',
        limitation: 'Daily request limits',
      },
    ],

    recommendations: buildRecommendations(keyStatus),
  });
}

// ─── Key metadata ─────────────────────────────────────────────────────────────

const KEY_PURPOSES = {
  FAL_KEY: 'Best image & video generation (FLUX 1.1 Pro, Kling v2, Wan 2.5, SDXL) — free starter credits',
  REPLICATE_API_KEY: 'Video generation fallback (Zeroscope, AnimateDiff) — free tier',
  HUGGINGFACE_API_KEY: 'Free open-source model inference (FLUX, SDXL, Whisper, vision models)',
  RUNWAY_API_KEY: 'Runway Gen-4 Turbo — cinematic video generation',
  SUNO_API_KEY: 'AI music generation (complete songs with vocals)',
  GROQ_API_KEY: 'Free Llama 3.3 70B, Whisper STT — extremely fast inference',
  OPENROUTER_API_KEY: 'Free vision (Qwen2.5-VL-72B) and LLM routing',
};

const KEY_URLS = {
  FAL_KEY: 'https://fal.ai/dashboard/keys',
  REPLICATE_API_KEY: 'https://replicate.com/account/api-tokens',
  HUGGINGFACE_API_KEY: 'https://huggingface.co/settings/tokens',
  RUNWAY_API_KEY: 'https://runwayml.com/api',
  SUNO_API_KEY: 'https://suno.com',
  GROQ_API_KEY: 'https://console.groq.com/keys',
  OPENROUTER_API_KEY: 'https://openrouter.ai/keys',
};

const KEY_REQUIRED = {
  FAL_KEY: false,
  REPLICATE_API_KEY: false,
  HUGGINGFACE_API_KEY: false,
  RUNWAY_API_KEY: false,
  SUNO_API_KEY: false,
  GROQ_API_KEY: false,
  OPENROUTER_API_KEY: false,
};

function buildRecommendations(keyStatus: Record<string, boolean>): string[] {
  const recs: string[] = [];

  if (!keyStatus.GROQ_API_KEY) {
    recs.push('Add GROQ_API_KEY for free Llama 3.3 70B chat + Whisper STT. Sign up free at console.groq.com');
  }

  if (!keyStatus.FAL_KEY) {
    recs.push('Add FAL_KEY for the best image and video quality — FLUX 1.1 Pro, Kling v2, and more. Free starter credits at fal.ai');
  }

  if (!keyStatus.HUGGINGFACE_API_KEY) {
    recs.push('Add HUGGINGFACE_API_KEY for free FLUX, SDXL, and vision model inference. Free signup at huggingface.co');
  }

  if (!keyStatus.OPENROUTER_API_KEY) {
    recs.push('Add OPENROUTER_API_KEY to enable Qwen2.5-VL-72B vision (free tier). Free signup at openrouter.ai');
  }

  if (!keyStatus.REPLICATE_API_KEY && !keyStatus.FAL_KEY) {
    recs.push('Add REPLICATE_API_KEY as a video generation fallback (Zeroscope). Free tier available at replicate.com');
  }

  if (!keyStatus.SUNO_API_KEY) {
    recs.push('Add SUNOAPI_KEY to enable full AI music generation — complete songs with vocals, instruments, and style control.');
  }

  if (Object.values(keyStatus).every(v => !v)) {
    recs.push('HOLLY works right now using Pollinations (free image generation, no key needed). Add API keys to unlock the full suite.');
  }

  return recs;
}
