/**
 * HOLLY Multi-Modal Generation Engine — Phase 11
 *
 * Unified orchestration layer for all AI generation modalities:
 *   - Image synthesis (Fal.ai FLUX, Stable Diffusion, Pollinations — all free)
 *   - Video generation (Fal.ai, Replicate, Kling, LumaAI, Runway)
 *   - Music generation (SUNO via existing engine)
 *   - Music video synthesis (image frames + audio A/V sync)
 *   - Audio-visual synchronization (lip sync, beat-sync visuals)
 *
 * Provider Strategy:
 *   Each modality has a waterfall of providers sorted by quality.
 *   If provider A fails or has no key, falls through to B, C, etc.
 *   Pollinations AI is always the final free fallback for images.
 *   Replicate is the final fallback for video.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerationModality = 'image' | 'video' | 'music' | 'music_video' | 'audio_visual';

export type ImageModel =
  | 'flux-1-1-pro'       // Fal.ai FLUX 1.1 Pro — best quality
  | 'flux-schnell'       // Fal.ai FLUX Schnell — fast
  | 'flux-dev'           // Fal.ai FLUX Dev — balanced
  | 'stable-diffusion-xl'// Fal.ai SDXL
  | 'pollinations'       // Pollinations AI — free, always available
  | 'auto';              // Engine picks best available

export type VideoModel =
  | 'kling-v2'           // Kling AI v2 — cinematic quality
  | 'runway-gen4'        // Runway Gen-4 Turbo
  | 'luma-dream-machine' // LumaAI Dream Machine
  | 'wan-v2-5'           // Wan 2.5 — open source quality
  | 'stable-video'       // Stable Video Diffusion
  | 'zeroscope'          // Zeroscope — free via Replicate
  | 'auto';              // Engine picks best available

export type MusicVideoStyle =
  | 'cinematic'          // Film-quality narrative
  | 'visualizer'         // Abstract audio-reactive visuals
  | 'lyric-video'        // Text-animated lyrics
  | 'performance'        // Artist performing footage
  | 'abstract'           // Pure visual art
  | 'animated'           // Animation / illustrated
  | 'documentary';       // Behind-the-scenes style

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

// ─── Request interfaces ────────────────────────────────────────────────────────

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: ImageModel;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  style?: string;           // e.g. "cinematic", "oil painting", "photorealistic"
  referenceImageUrl?: string; // img2img
  steps?: number;           // diffusion steps
  guidance?: number;        // CFG scale
  seed?: number;
  artDirection?: {          // HOLLY art direction block
    movement?: string;
    lighting?: string;
    colorPalette?: string;
    composition?: string;
    mood?: string;
  };
}

export interface VideoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: VideoModel;
  duration?: number;        // seconds (3-30)
  fps?: number;             // frames per second
  aspectRatio?: AspectRatio;
  style?: string;
  referenceImageUrl?: string; // image-to-video
  referenceVideoUrl?: string; // video-to-video
  cameraMovement?: 'static' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'orbit' | 'dolly';
  motionIntensity?: 'low' | 'medium' | 'high';
}

export interface MusicVideoRequest {
  prompt: string;             // Visual description / concept
  audioUrl?: string;          // Source audio track URL
  songTitle?: string;
  artistName?: string;
  genre?: string;
  style?: MusicVideoStyle;
  duration?: number;          // seconds
  aspectRatio?: AspectRatio;
  colorPalette?: string;
  moodKeywords?: string[];
  beatSync?: boolean;         // Sync cuts to beats
  lyricsUrl?: string;
}

export interface AudioVisualSyncRequest {
  audioUrl: string;
  videoUrl?: string;
  imageUrls?: string[];       // Sequence of images to sync
  syncMode: 'beat-sync' | 'lyric-sync' | 'ambient';
  bpm?: number;
  intensity?: 'subtle' | 'medium' | 'intense';
}

// ─── Result interfaces ──────────────────────────────────────────────────────

export interface GenerationResult {
  success: boolean;
  modality: GenerationModality;
  url?: string;
  urls?: string[];            // Multiple outputs (e.g., image variants)
  thumbnailUrl?: string;
  duration?: number;
  provider: string;
  model: string;
  prompt: string;
  metadata?: Record<string, unknown>;
  error?: string;
  generatedAt: Date;
  estimatedCost?: number;     // USD estimate
}

export interface ProviderCapability {
  name: string;
  modalities: GenerationModality[];
  maxDuration?: number;       // For video — max seconds
  maxResolution?: string;
  requiresKey: boolean;
  keyEnvVar?: string;
  quality: 1 | 2 | 3 | 4 | 5;
  speed: 'fast' | 'medium' | 'slow';
  costTier: 'free' | 'low' | 'medium' | 'high';
  available: boolean;
}

// ─── Provider Registry ────────────────────────────────────────────────────────

export function getProviderRegistry(): ProviderCapability[] {
  return [
    // ── Image providers ──
    {
      name: 'fal-flux-1-1-pro',
      modalities: ['image'],
      maxResolution: '2048x2048',
      requiresKey: true,
      keyEnvVar: 'FAL_KEY',
      quality: 5,
      speed: 'medium',
      costTier: 'medium',
      available: !!process.env.FAL_KEY,
    },
    {
      name: 'fal-flux-schnell',
      modalities: ['image'],
      maxResolution: '1024x1024',
      requiresKey: true,
      keyEnvVar: 'FAL_KEY',
      quality: 4,
      speed: 'fast',
      costTier: 'low',
      available: !!process.env.FAL_KEY,
    },
    {
      name: 'pollinations',
      modalities: ['image'],
      maxResolution: '1024x1024',
      requiresKey: false,
      quality: 3,
      speed: 'fast',
      costTier: 'free',
      available: true, // Always available
    },
    // ── Video providers ──
    {
      name: 'fal-kling-v2',
      modalities: ['video'],
      maxDuration: 10,
      requiresKey: true,
      keyEnvVar: 'FAL_KEY',
      quality: 5,
      speed: 'slow',
      costTier: 'high',
      available: !!process.env.FAL_KEY,
    },
    {
      name: 'fal-wan-v2-5',
      modalities: ['video'],
      maxDuration: 15,
      requiresKey: true,
      keyEnvVar: 'FAL_KEY',
      quality: 4,
      speed: 'medium',
      costTier: 'medium',
      available: !!process.env.FAL_KEY,
    },
    {
      name: 'replicate-zeroscope',
      modalities: ['video'],
      maxDuration: 3,
      requiresKey: true,
      keyEnvVar: 'REPLICATE_API_KEY',
      quality: 3,
      speed: 'medium',
      costTier: 'low',
      available: !!process.env.REPLICATE_API_KEY,
    },
    // ── Music providers ──
    {
      name: 'suno-v4',
      modalities: ['music'],
      maxDuration: 240,
      requiresKey: true,
      keyEnvVar: 'SUNO_API_KEY',
      quality: 5,
      speed: 'slow',
      costTier: 'medium',
      available: !!process.env.SUNO_API_KEY,
    },
  ];
}

// ─── Image Generation ─────────────────────────────────────────────────────────

export async function generateImage(req: ImageGenerationRequest): Promise<GenerationResult> {
  const falKey = process.env.FAL_KEY;

  // Build enriched prompt with HOLLY art direction
  let enrichedPrompt = req.prompt;
  if (req.artDirection) {
    const ad = req.artDirection;
    const parts = [
      req.prompt,
      ad.movement && `Art style: ${ad.movement}`,
      ad.lighting && `Lighting: ${ad.lighting}`,
      ad.colorPalette && `Color palette: ${ad.colorPalette}`,
      ad.composition && `Composition: ${ad.composition}`,
      ad.mood && `Mood: ${ad.mood}`,
    ].filter(Boolean);
    enrichedPrompt = parts.join('. ');
  }
  if (req.style) enrichedPrompt = `${enrichedPrompt}, ${req.style} style`;

  // Provider waterfall: Fal.ai FLUX → Pollinations (both free/no-cost)
  const model = req.model || 'auto';

  // 1. Fal.ai FLUX (best quality, requires FAL_KEY — free starter credits)
  if (falKey && model !== 'pollinations') {
    try {
      return await generateImageFal(enrichedPrompt, req, falKey);
    } catch (err) {
      console.warn('[Generation] Fal.ai image failed, falling back to Pollinations:', err);
    }
  }

  // 2. Pollinations AI — always free, no key, no limits
  return await generateImagePollinations(enrichedPrompt, req);
}

async function generateImageFal(
  prompt: string,
  req: ImageGenerationRequest,
  apiKey: string
): Promise<GenerationResult> {
  const modelMap: Record<string, string> = {
    'flux-1-1-pro': 'fal-ai/flux-pro/v1.1',
    'flux-schnell': 'fal-ai/flux/schnell',
    'flux-dev': 'fal-ai/flux/dev',
    'stable-diffusion-xl': 'fal-ai/stable-diffusion-xl',
    'auto': 'fal-ai/flux/schnell',
  };

  const falModel = modelMap[req.model || 'auto'] || 'fal-ai/flux/schnell';
  const [w, h] = resolveImageDimensions(req);

  const payload: Record<string, unknown> = {
    prompt,
    image_size: { width: w, height: h },
    num_inference_steps: req.steps || 28,
    guidance_scale: req.guidance || 3.5,
    num_images: 1,
    enable_safety_checker: true,
  };
  if (req.negativePrompt) payload.negative_prompt = req.negativePrompt;
  if (req.seed) payload.seed = req.seed;
  if (req.referenceImageUrl) payload.image_url = req.referenceImageUrl;

  const res = await fetch(`https://fal.run/${falModel}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Fal.ai error: ${res.status} ${res.statusText}`);

  const data = await res.json() as { images?: Array<{ url: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error('Fal.ai returned no image URL');

  return {
    success: true,
    modality: 'image',
    url,
    provider: 'fal.ai',
    model: falModel,
    prompt,
    generatedAt: new Date(),
    estimatedCost: 0.003,
  };
}

async function generateImagePollinations(
  prompt: string,
  req: ImageGenerationRequest
): Promise<GenerationResult> {
  const [w, h] = resolveImageDimensions(req);
  const seed = req.seed || Math.floor(Math.random() * 1_000_000);
  const model = req.model === 'pollinations' ? 'flux' : 'flux';
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=${w}&height=${h}&model=${model}&nologo=true`;

  // Verify it returns an image
  const check = await fetch(url, { method: 'HEAD' });
  if (!check.ok) throw new Error('Pollinations returned non-OK');

  return {
    success: true,
    modality: 'image',
    url,
    provider: 'pollinations',
    model: 'flux',
    prompt,
    generatedAt: new Date(),
    estimatedCost: 0,
  };
}

// ─── Video Generation ─────────────────────────────────────────────────────────

export async function generateVideo(req: VideoGenerationRequest): Promise<GenerationResult> {
  const falKey = process.env.FAL_KEY;
  const replicateKey = process.env.REPLICATE_API_KEY;
  const model = req.model || 'auto';

  // 1. Fal.ai (Kling v2 or Wan 2.5 — best quality)
  if (falKey && model !== 'zeroscope') {
    try {
      return await generateVideoFal(req, falKey);
    } catch (err) {
      console.warn('[Generation] Fal.ai video failed:', err);
    }
  }

  // 2. Replicate (Zeroscope — reliable fallback)
  if (replicateKey) {
    try {
      return await generateVideoReplicate(req, replicateKey);
    } catch (err) {
      console.warn('[Generation] Replicate video failed:', err);
    }
  }

  // 3. No paid video key — return a helpful structured error
  throw new Error(
    'VIDEO_KEY_REQUIRED: Video generation needs FAL_KEY (fal.ai/dashboard/keys — free starter credits). ' +
    'Images work 100% free via Pollinations. ' +
    'Note: there is no truly free unlimited text-to-video API without signup.'
  );
}

async function generateVideoFal(
  req: VideoGenerationRequest,
  apiKey: string
): Promise<GenerationResult> {
  // Model selection: Kling v2 for quality, Wan 2.5 for speed/cost
  const useKling = req.model === 'kling-v2' || req.model === 'auto';
  const falModel = useKling
    ? 'fal-ai/kling-video/v2/master/text-to-video'
    : 'fal-ai/wan-v2.5/text-to-video';

  const duration = Math.min(req.duration || 5, useKling ? 10 : 15);
  const ar = req.aspectRatio || '16:9';

  const payload: Record<string, unknown> = {
    prompt: req.prompt,
    duration: `${duration}s`,
    aspect_ratio: ar,
  };

  if (req.negativePrompt) payload.negative_prompt = req.negativePrompt;
  if (req.referenceImageUrl) payload.image_url = req.referenceImageUrl;
  if (req.cameraMovement) payload.camera_movement = req.cameraMovement;

  // For Wan 2.5 specific params
  if (!useKling) {
    payload.num_frames = duration * (req.fps || 16);
    payload.motion_strength = req.motionIntensity === 'high' ? 1.0
      : req.motionIntensity === 'low' ? 0.3 : 0.6;
  }

  console.log(`[Generation] Fal.ai video: ${falModel}, ${duration}s, ${ar}`);

  const res = await fetch(`https://fal.run/${falModel}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fal.ai video error: ${res.status} — ${errText.substring(0, 200)}`);
  }

  const data = await res.json() as {
    video?: { url: string };
    url?: string;
    request_id?: string;
  };

  // Fal.ai may return async (queue) or sync response
  const videoUrl = data.video?.url || data.url;
  if (!videoUrl) {
    // Async mode — poll queue
    if (data.request_id) {
      return await pollFalQueue(data.request_id, apiKey, falModel, req.prompt);
    }
    throw new Error('Fal.ai returned no video URL or request_id');
  }

  return {
    success: true,
    modality: 'video',
    url: videoUrl,
    duration,
    provider: 'fal.ai',
    model: falModel,
    prompt: req.prompt,
    generatedAt: new Date(),
    estimatedCost: useKling ? 0.15 : 0.05,
  };
}

async function pollFalQueue(
  requestId: string,
  apiKey: string,
  model: string,
  prompt: string,
  maxWaitMs: number = 300_000  // 5 minutes
): Promise<GenerationResult> {
  const start = Date.now();
  const pollInterval = 5000;

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollInterval));

    const res = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });

    if (!res.ok) continue;
    const data = await res.json() as {
      status?: string;
      output?: { video?: { url: string }; url?: string };
    };

    if (data.status === 'COMPLETED' && data.output) {
      const url = data.output.video?.url || data.output.url;
      if (url) {
        return {
          success: true,
          modality: 'video',
          url,
          provider: 'fal.ai',
          model,
          prompt,
          generatedAt: new Date(),
        };
      }
    }

    if (data.status === 'FAILED') {
      throw new Error('Fal.ai video generation failed in queue');
    }
  }

  throw new Error('Fal.ai video generation timed out after 5 minutes');
}

async function generateVideoReplicate(
  req: VideoGenerationRequest,
  apiKey: string
): Promise<GenerationResult> {
  const duration = Math.min(req.duration || 3, 3);
  const fps = req.fps || 24;
  const numFrames = duration * fps;

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
      input: {
        prompt: req.prompt,
        fps,
        width: 1024,
        height: 576,
        num_frames: numFrames,
        num_inference_steps: 50,
      },
    }),
  });

  if (!res.ok) throw new Error(`Replicate error: ${res.status}`);
  const prediction = await res.json() as { id: string };

  // Poll for completion
  const videoUrl = await pollReplicate(prediction.id, apiKey);

  return {
    success: true,
    modality: 'video',
    url: videoUrl,
    duration,
    provider: 'replicate',
    model: 'zeroscope-v2-xl',
    prompt: req.prompt,
    generatedAt: new Date(),
    estimatedCost: 0.01,
  };
}

async function pollReplicate(
  predictionId: string,
  apiKey: string,
  maxWaitMs = 180_000
): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000));

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiKey}` },
    });

    const data = await res.json() as { status: string; output?: string | string[] };

    if (data.status === 'succeeded') {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      if (output) return output;
      throw new Error('Replicate returned empty output');
    }

    if (data.status === 'failed') throw new Error('Replicate prediction failed');
  }

  throw new Error('Replicate prediction timed out');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveImageDimensions(req: ImageGenerationRequest): [number, number] {
  if (req.width && req.height) return [req.width, req.height];

  const arMap: Record<AspectRatio, [number, number]> = {
    '16:9': [1344, 768],
    '9:16': [768, 1344],
    '1:1': [1024, 1024],
    '4:3': [1152, 896],
    '3:4': [896, 1152],
  };

  return arMap[req.aspectRatio || '1:1'];
}

// ─── System Prompt Block for HOLLY chat ───────────────────────────────────────

export function getGenerationSystemBlock(): string {
  const registry = getProviderRegistry();
  const imageProviders = registry.filter(p => p.modalities.includes('image') && p.available);
  const videoProviders = registry.filter(p => p.modalities.includes('video') && p.available);
  const hasFalKey = !!process.env.FAL_KEY;

  return `
[MULTI-MODAL GENERATION ENGINE — Phase 11]

HOLLY has access to a full multi-modal generation studio. She can generate:

**Images** (✅ FREE — works right now via Pollinations)
  Available providers: ${imageProviders.map(p => p.name).join(', ') || 'Pollinations (free, no key needed)'}
  Trigger words: "generate an image", "create a picture", "make art", "design", "visualize"
  Free model: Pollinations FLUX (1024×1024, no key needed — always available)
  Premium (needs FAL_KEY): FLUX 1.1 Pro, FLUX Dev, FLUX Schnell, Stable Diffusion XL

**Videos** (${hasFalKey ? '✅ ACTIVE — FAL_KEY configured' : '⚠️ NEEDS FAL_KEY — add at fal.ai/dashboard/keys (free starter credits)'})
  Available providers: ${videoProviders.map(p => p.name).join(', ') || 'None configured yet'}
  Trigger words: "generate a video", "create a video clip", "make a short film", "animate"
  Models (all need FAL_KEY): Kling v2 (cinematic $0.15/5s), Wan 2.5 (quality $0.05/5s)
  Note: There is no truly free unlimited text-to-video API. FAL_KEY has free starter credits.
  
**Music Videos** — Combines SUNO music + image generation (both work free)
  Trigger: "make a music video", "create a visual for this song"
  
**Audio-Visual Sync** — Beat-sync, lyric-sync, ambient sync
  Trigger: "sync visuals to the beat", "create a lyric video"

When a user requests any of these, call the appropriate API:
  POST /api/multimodal/generate — images and videos
  POST /api/multimodal/music-video — full music videos

Always:
  1. Confirm the concept before generating (unless the user says "just do it")
  2. Provide art direction — don't just pass the raw prompt
  3. Describe what you're generating and why those specific choices
  4. After generation, explain the creative decisions made
  5. If video is requested and FAL_KEY is missing, explain this clearly and offer to generate images instead
`;
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

export function detectGenerationIntent(message: string): {
  detected: boolean;
  modality?: GenerationModality;
  confidence: 'high' | 'medium' | 'low';
} {
  const lower = message.toLowerCase();

  const imageSignals = [
    'generate an image', 'create a picture', 'make art', 'draw ', 'paint ',
    'create an image', 'visualize', 'show me what', 'create a photo',
    'album art', 'album cover', 'poster', 'thumbnail', 'render', 'illustrate',
  ];

  const videoSignals = [
    'generate a video', 'create a video', 'make a video', 'video clip',
    'short film', 'animate', 'music video', 'visualizer', 'lyric video',
    'create a visual', 'make a clip',
  ];

  const musicVideoSignals = [
    'music video', 'make a visual for', 'video for my song', 'visual for the track',
    'create a music video', 'mv for',
  ];

  if (musicVideoSignals.some(s => lower.includes(s))) {
    return { detected: true, modality: 'music_video', confidence: 'high' };
  }
  if (videoSignals.some(s => lower.includes(s))) {
    return { detected: true, modality: 'video', confidence: 'high' };
  }
  if (imageSignals.some(s => lower.includes(s))) {
    return { detected: true, modality: 'image', confidence: 'high' };
  }

  return { detected: false, confidence: 'low' };
}
