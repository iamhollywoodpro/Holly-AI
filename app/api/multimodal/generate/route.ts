/**
 * HOLLY Multi-Modal Generation API — Phase 11
 *
 * POST /api/multimodal/generate
 *
 * Unified endpoint for:
 *   - Image generation (Modal FLUX.1-schnell → Pollinations fallback)
 *   - Video generation (Modal CogVideoX-5B)
 *   - Audio-visual synchronization (beat-sync, lyric-sync)
 *
 * Body:
 *   modality: 'image' | 'video' | 'audio_visual'
 *   prompt: string
 *   model?: string          — specific model override
 *   aspectRatio?: string    — '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
 *   style?: string          — cinematic, photorealistic, anime, painterly, etc.
 *   duration?: number       — video seconds (3–10)
 *   referenceImageUrl?: string — img2img reference
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
        { id: 'flux-schnell', name: 'FLUX.1-schnell (Modal)', provider: 'Holly Modal GPU', quality: 'production', speed: 'fast', cost: 'free', requiresKey: null },
        { id: 'pollinations',  name: 'Pollinations FLUX',    provider: 'pollinations.ai',  quality: 'good',       speed: 'fast', cost: 'free', requiresKey: null },
        { id: 'auto', name: 'Auto (Modal → Pollinations)',   provider: 'varies',            quality: 'best_available', speed: 'fast', cost: 'free', requiresKey: null },
      ],
      video: [
        { id: 'cogvideox', name: 'CogVideoX-5B (Modal)', provider: 'Holly Modal GPU', quality: 'high', speed: 'slow', cost: 'free', requiresKey: null },
        { id: 'auto',      name: 'Auto (Modal CogVideoX)', provider: 'Holly Modal GPU', quality: 'high', speed: 'slow', cost: 'free', requiresKey: null },
      ],
    },
    capabilities: [
      'Text-to-image generation',
      'Image-to-image transformation',
      'Text-to-video generation',
      'Music video creation',
      'Audio-visual synchronization',
      'Beat-sync visual generation',
      'Lyric video creation',
    ],
    note: 'All generation runs on Holly\'s own Modal.com GPU workers. No FAL_KEY or REPLICATE_API_KEY needed.',
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
  if (errorMessage.includes('VIDEO_NOT_CONFIGURED') || errorMessage.includes('MODAL_VIDEO_URL')) {
    return 'Video generation runs on Holly\'s Modal CogVideoX-5B GPU. Ensure MODAL_VIDEO_URL is set in Coolify environment variables.';
  }
  if (errorMessage.includes('Modal video error') || errorMessage.includes('modal-cogvideox')) {
    return 'Modal video GPU may be cold-starting (scale-to-zero). Try again in 60 seconds — the worker spins up automatically.';
  }
  if (errorMessage.includes('Modal image error') || errorMessage.includes('modal-flux')) {
    return 'Modal image GPU is unavailable. Holly will automatically fall back to Pollinations (free, always available).';
  }
  if (errorMessage.includes('Pollinations')) {
    return 'Pollinations fallback failed. Check network connectivity.';
  }
  return 'Generation failed. Holly uses Modal.com GPU workers — check MODAL_IMAGE_URL and MODAL_VIDEO_URL in Coolify env vars.';
}
