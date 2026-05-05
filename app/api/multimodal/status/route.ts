/**
 * HOLLY Multi-Modal Status API — Phase 11
 *
 * GET /api/multimodal/status
 *
 * Returns the current status of all generation providers.
 * All generation runs on Holly's own Modal.com GPU workers —
 * no FAL_KEY, no REPLICATE_API_KEY, no third-party video API needed.
 */

import { NextResponse } from 'next/server';
import { getProviderRegistry } from '@/lib/multimodal/generation-engine';

export const runtime = 'nodejs';

export async function GET() {
  const registry = getProviderRegistry();

  const hasModalImage = !!process.env.MODAL_IMAGE_URL;
  const hasModalVideo = !!process.env.MODAL_VIDEO_URL;
  const hasSuno       = !!process.env.SUNO_API_KEY;
  const hasGroq       = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  const imageAvailable = registry.some(p => p.modalities.includes('image') && p.available);
  const videoAvailable = registry.some(p => p.modalities.includes('video') && p.available);

  return NextResponse.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    note: 'Holly generates images + video on her own Modal.com GPU workers — no third-party media API keys required.',

    capabilities: {
      imageGeneration: imageAvailable || true, // Pollinations is always available
      videoGeneration: videoAvailable,
      musicVideoCreation: true,
      audioVisualSync: true,
      musicGeneration: hasSuno,
    },

    providers: registry,

    endpoints: {
      image: process.env.MODAL_IMAGE_URL || null,
      video: process.env.MODAL_VIDEO_URL || null,
    },

    keyConfiguration: {
      configured: [
        hasModalImage && 'MODAL_IMAGE_URL',
        hasModalVideo && 'MODAL_VIDEO_URL',
        hasSuno       && 'SUNO_API_KEY',
        hasGroq       && 'GROQ_API_KEY',
        hasOpenRouter && 'OPENROUTER_API_KEY',
      ].filter(Boolean),
      notes: {
        MODAL_IMAGE_URL: hasModalImage  ? '✅ Modal FLUX.1-schnell image GPU — active' : '⚠️ Not set — using Pollinations fallback',
        MODAL_VIDEO_URL: hasModalVideo  ? '✅ Modal CogVideoX-5B video GPU — active'  : '⚠️ Not set — video generation unavailable',
        SUNO_API_KEY:    hasSuno        ? '✅ Suno V5_5 music generation — active'     : '⚠️ Not set — music generation unavailable',
      },
    },

    freeOptions: [
      {
        modality: 'image',
        provider: 'Holly Modal FLUX.1-schnell',
        model: 'FLUX.1-schnell (Black Forest Labs)',
        quality: 'Production-quality — 1344×768, 4-step generation',
        cost: 'Free — Holly\'s own GPU on Modal.com',
        status: hasModalImage ? 'active' : 'endpoint not configured',
      },
      {
        modality: 'image',
        provider: 'Pollinations AI',
        model: 'FLUX (Apache 2.0)',
        quality: 'Good — suitable for development and prototyping',
        cost: 'Free, no API key required',
        status: 'always active (fallback)',
      },
      {
        modality: 'video',
        provider: 'Holly Modal CogVideoX-5B',
        model: 'CogVideoX-5B (THUDM)',
        quality: 'High quality open-source video generation',
        cost: 'Free — Holly\'s own GPU on Modal.com',
        status: hasModalVideo ? 'active (may have ~60s cold start)' : 'endpoint not configured',
      },
    ],
  });
}
