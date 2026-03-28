/**
 * HOLLY Multi-Modal Generation API — Phase 11
 *
 * POST /api/multimodal/generate
 *
 * Unified endpoint for:
 *   - Image generation (FLUX 1.1 Pro via Fal.ai, Stable Diffusion XL, Pollinations free — NO paid APIs)
 *   - Video generation (Kling v2, Wan 2.5, Runway Gen-4, Replicate/Zeroscope)
 *   - Audio-visual synchronization (beat-sync, lyric-sync)
 *
 * Body:
 *   modality: 'image' | 'video' | 'audio_visual'
 *   prompt: string
 *   model?: string          — specific model override
 *   aspectRatio?: string    — '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
 *   style?: string          — cinematic, photorealistic, anime, painterly, etc.
 *   duration?: number       — video seconds (3–15)
 *   referenceImageUrl?: string — img2video or img2img reference
 *   negativePrompt?: string
 *   seed?: number
 *   // audio_visual only:
 *   audioUrl?: string
 *   videoUrl?: string
 *   syncMode?: 'beat' | 'lyric' | 'ambient'
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  generateImage,
  generateVideo,
  type ImageGenerationRequest,
  type VideoGenerationRequest,
  type GenerationResult,
} from '@/lib/multimodal/generation-engine';

// ─── Rate limiting (in-memory, per user, resets on cold start) ────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limitPerMinute = 10): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= limitPerMinute) return false;
  entry.count++;
  return true;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.userId ?? null;
  } catch {
    // Clerk not configured or auth failed — allow in dev
    userId = process.env.NODE_ENV === 'development' ? 'dev-user' : null;
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  // Rate limit
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const modality = body.modality as string;
  const prompt = (body.prompt as string | undefined)?.trim();

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  if (!modality || !['image', 'video', 'audio_visual'].includes(modality)) {
    return NextResponse.json(
      { error: 'modality must be "image", "video", or "audio_visual"' },
      { status: 400 }
    );
  }

  try {
    let result: GenerationResult;

    if (modality === 'image') {
      const imageReq: ImageGenerationRequest = {
        prompt,
        model: (body.model as ImageGenerationRequest['model']) || 'auto',
        aspectRatio: (body.aspectRatio as ImageGenerationRequest['aspectRatio']) || '1:1',
        style: body.style as string | undefined,
        negativePrompt: body.negativePrompt as string | undefined,
        seed: body.seed as number | undefined,
        width: body.width as number | undefined,
        height: body.height as number | undefined,
        referenceImageUrl: body.referenceImageUrl as string | undefined,
        steps: body.steps as number | undefined,
        guidance: body.guidance as number | undefined,
      };
      result = await generateImage(imageReq);

    } else if (modality === 'video') {
      const videoReq: VideoGenerationRequest = {
        prompt,
        model: (body.model as VideoGenerationRequest['model']) || 'auto',
        aspectRatio: (body.aspectRatio as VideoGenerationRequest['aspectRatio']) || '16:9',
        duration: Math.min(Math.max((body.duration as number) || 5, 3), 15),
        fps: (body.fps as number) || 24,
        style: body.style as string | undefined,
        negativePrompt: body.negativePrompt as string | undefined,
        referenceImageUrl: body.referenceImageUrl as string | undefined,
        cameraMovement: body.cameraMovement as VideoGenerationRequest['cameraMovement'],
        motionIntensity: body.motionIntensity as VideoGenerationRequest['motionIntensity'],
      };
      result = await generateVideo(videoReq);

    } else {
      // audio_visual sync
      const audioUrl = body.audioUrl as string | undefined;
      const videoUrl = body.videoUrl as string | undefined;
      const syncMode = (body.syncMode as string) || 'ambient';

      if (!audioUrl || !videoUrl) {
        return NextResponse.json(
          { error: 'audio_visual requires both audioUrl and videoUrl' },
          { status: 400 }
        );
      }

      result = await syncAudioVisual(prompt, audioUrl, videoUrl, syncMode);
    }

    return NextResponse.json({
      success: true,
      ...result,
      generatedAt: result.generatedAt?.toISOString(),
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    console.error('[multimodal/generate] Error:', message);

    // Return friendly error with suggestions
    const suggestion = getSuggestion(message);
    return NextResponse.json(
      { error: message, suggestion, code: 'GENERATION_FAILED' },
      { status: 500 }
    );
  }
}

// ─── GET — Provider status / capability info ──────────────────────────────────

export async function GET() {
  const { getProviderRegistry } = await import('@/lib/multimodal/generation-engine');
  const registry = getProviderRegistry();

  return NextResponse.json({
    providers: registry,
    models: {
      image: [
        { id: 'flux-1-1-pro', name: 'FLUX 1.1 Pro', provider: 'fal.ai', quality: 'best', speed: 'medium', cost: '$0.003/image', requiresKey: 'FAL_KEY' },
        { id: 'flux-schnell', name: 'FLUX Schnell', provider: 'fal.ai', quality: 'good', speed: 'fast', cost: '$0.001/image', requiresKey: 'FAL_KEY' },
        { id: 'flux-dev', name: 'FLUX Dev', provider: 'fal.ai', quality: 'high', speed: 'medium', cost: '$0.002/image', requiresKey: 'FAL_KEY' },
        { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'fal.ai', quality: 'good', speed: 'fast', cost: '$0.001/image', requiresKey: 'FAL_KEY' },
        { id: 'pollinations', name: 'Pollinations (FLUX)', provider: 'pollinations.ai', quality: 'good', speed: 'fast', cost: 'free', requiresKey: null },
        { id: 'auto', name: 'Auto (best available)', provider: 'varies', quality: 'best_available', speed: 'varies', cost: 'varies', requiresKey: 'any' },
      ],
      video: [
        { id: 'kling-v2', name: 'Kling v2', provider: 'fal.ai', quality: 'cinematic', speed: 'slow', cost: '$0.15/5s', requiresKey: 'FAL_KEY' },
        { id: 'wan-v2-5', name: 'Wan 2.5', provider: 'fal.ai', quality: 'high', speed: 'medium', cost: '$0.05/5s', requiresKey: 'FAL_KEY' },
        { id: 'runway-gen4', name: 'Runway Gen-4', provider: 'runway', quality: 'cinematic', speed: 'medium', cost: '$0.10/5s', requiresKey: 'RUNWAY_API_KEY' },
        { id: 'luma-dream-machine', name: 'LumaAI Dream Machine', provider: 'luma', quality: 'high', speed: 'medium', cost: '$0.08/5s', requiresKey: 'LUMAAI_API_KEY' },
        { id: 'zeroscope', name: 'Zeroscope v2', provider: 'replicate', quality: 'good', speed: 'slow', cost: '$0.01/3s', requiresKey: 'REPLICATE_API_KEY' },
        { id: 'auto', name: 'Auto (best available)', provider: 'varies', quality: 'best_available', speed: 'varies', cost: 'varies', requiresKey: 'any' },
      ],
    },
    capabilities: [
      'Text-to-image generation',
      'Image-to-image transformation',
      'Text-to-video generation',
      'Image-to-video animation',
      'Music video creation',
      'Audio-visual synchronization',
      'Beat-sync visual generation',
      'Lyric video creation',
    ],
  });
}

// ─── Audio-Visual Sync ────────────────────────────────────────────────────────

async function syncAudioVisual(
  concept: string,
  audioUrl: string,
  videoUrl: string,
  syncMode: string
): Promise<GenerationResult> {
  // For now: return a structured sync plan
  // Future: integrate actual AV sync models (LipSync, Audio2Face)
  const syncPlan = buildAVSyncPlan(concept, syncMode);

  return {
    success: true,
    modality: 'audio_visual',
    url: videoUrl, // Original video returned with sync metadata
    provider: 'holly-av-sync',
    model: 'holly-av-sync-v1',
    prompt: concept,
    generatedAt: new Date(),
    estimatedCost: 0,
    metadata: {
      audioUrl,
      videoUrl,
      syncMode,
      syncPlan,
      note: 'Full AV sync rendering requires video processing infrastructure. Sync plan generated.',
    },
  };
}

function buildAVSyncPlan(concept: string, syncMode: string): Record<string, unknown> {
  const plans: Record<string, Record<string, unknown>> = {
    beat: {
      type: 'beat_sync',
      description: 'Visual cuts and transitions aligned to musical beat grid',
      technique: 'Onset detection → cut point mapping → visual rhythm matching',
      editingStyle: 'Hard cuts on downbeats, dissolves on off-beats',
      colorFlash: 'Brightness pulse on kick/snare transients',
      concept,
    },
    lyric: {
      type: 'lyric_sync',
      description: 'Text animations synchronized to vocal timing',
      technique: 'Whisper ASR → word timestamps → kinetic typography',
      fontStyle: 'Bold sans-serif, high contrast, dynamic scaling',
      colorScheme: 'Brand colors with glow effect on emphasis words',
      concept,
    },
    ambient: {
      type: 'ambient_sync',
      description: 'Visual mood evolution aligned to audio energy envelope',
      technique: 'RMS energy tracking → scene brightness/saturation modulation',
      transitionStyle: 'Slow dissolves matching harmonic structure',
      colorGrading: 'Warm/cool shifts following song emotional arc',
      concept,
    },
  };

  return plans[syncMode] || plans.ambient;
}

// ─── Error helper ─────────────────────────────────────────────────────────────

function getSuggestion(errorMessage: string): string {
  if (errorMessage.includes('VIDEO_KEY_REQUIRED') || (errorMessage.includes('FAL_KEY') && errorMessage.includes('video'))) {
    return 'Video generation needs FAL_KEY. Get free starter credits at https://fal.ai/dashboard/keys — add FAL_KEY to Vercel env vars. Images always work free via Pollinations (no key needed).';
  }
  if (errorMessage.includes('FAL_KEY') || errorMessage.includes('fal.ai')) {
    return 'Add FAL_KEY to Vercel environment variables (free starter credits at fal.ai/dashboard/keys) for FLUX and video generation.';
  }
  if (errorMessage.includes('REPLICATE')) {
    return 'Add REPLICATE_API_KEY to your environment for Zeroscope video fallback. Or add FAL_KEY for better quality video.';
  }
  if (errorMessage.includes('No.*configured') || errorMessage.includes('unavailable')) {
    return 'Images work 100% free via Pollinations (no key needed). Videos require FAL_KEY (free credits at fal.ai). Music requires SUNO_API_KEY.';
  }
  return 'Check your generation API key configuration in Vercel environment variables.';
}
