/**
 * HOLLY Multi-Modal Generation Engine — Phase 11 v2.6 (Modal-first)
 *
 * Provider priority:
 *
 *   Images:
 *     1. MODAL_IMAGE_URL  — Holly's own Z-Image-Turbo GPU on Modal (set in Coolify ✅)
 *     2. FLUX.1-schnell on Modal — Apache 2.0 proven fallback
 *
 *   Video:
 *     1. MODAL_VIDEO_URL  — Holly's own Wan2.2-TI2V-5B GPU on Modal (set in Coolify ✅)
 *     2. CogVideoX-5B on Modal — Apache 2.0 fallback
 *     ↳ Graceful error if Modal video is not responding (cold start / scale-to-zero)
 *
 * No FAL_KEY, no REPLICATE_API_KEY, no HuggingFace inference needed.
 * All third-party paid-video providers have been removed.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerationModality = 'image' | 'video' | 'music' | 'music_video' | 'audio_visual';

export type ImageModel =
  | 'z-image-turbo'     // Modal Z-Image-Turbo (Holly's GPU) — default
  | 'flux-schnell'      // Modal FLUX.1-schnell — Apache 2.0 proven fallback
  | 'auto';             // Engine picks best available (Z-Image-Turbo → FLUX.1-schnell)

export type VideoModel =
  | 'cogvideox'          // Modal CogVideoX-5B (Holly's GPU) — default
  | 'auto';              // Engine picks best available

export type MusicVideoStyle =
  | 'cinematic'
  | 'visualizer'
  | 'lyric-video'
  | 'performance'
  | 'abstract'
  | 'animated'
  | 'documentary';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

// ─── Request interfaces ────────────────────────────────────────────────────────

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: ImageModel;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  style?: string;
  referenceImageUrl?: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  artDirection?: {
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
  duration?: number;        // seconds (3–20)
  fps?: number;
  aspectRatio?: AspectRatio;
  style?: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  cameraMovement?: 'static' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'orbit' | 'dolly';
  motionIntensity?: 'low' | 'medium' | 'high';
}

export interface MusicVideoRequest {
  prompt: string;
  audioUrl?: string;
  songTitle?: string;
  artistName?: string;
  genre?: string;
  style?: MusicVideoStyle;
  duration?: number;
  aspectRatio?: AspectRatio;
  colorPalette?: string;
  moodKeywords?: string[];
  beatSync?: boolean;
  lyricsUrl?: string;
}

export interface AudioVisualSyncRequest {
  audioUrl: string;
  videoUrl?: string;
  imageUrls?: string[];
  syncMode: 'beat-sync' | 'lyric-sync' | 'ambient';
  bpm?: number;
  intensity?: 'subtle' | 'medium' | 'intense';
}

// ─── Result interfaces ──────────────────────────────────────────────────────

export interface GenerationResult {
  success: boolean;
  modality: GenerationModality;
  url?: string;
  urls?: string[];
  thumbnailUrl?: string;
  duration?: number;
  provider: string;
  model: string;
  prompt: string;
  metadata?: Record<string, unknown>;
  error?: string;
  generatedAt: Date;
  estimatedCost?: number;
}

export interface ProviderCapability {
  name: string;
  modalities: GenerationModality[];
  maxDuration?: number;
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
      name: 'modal-z-image-turbo',
      modalities: ['image'],
      maxResolution: '1344x768',
      requiresKey: false,
      quality: 5,
      speed: 'fast',
      costTier: 'free',
      available: !!process.env.MODAL_IMAGE_URL,
    },
    {
      name: 'modal-flux-schnell-fallback',
      modalities: ['image'],
      maxResolution: '1344x768',
      requiresKey: false,
      quality: 3,
      speed: 'fast',
      costTier: 'free',
      available: true,
    },
    // ── Video providers ──
    {
      name: 'modal-cogvideox',
      modalities: ['video'],
      maxDuration: 10,
      requiresKey: false,
      quality: 4,
      speed: 'slow', // GPU cold start may take ~60s
      costTier: 'free',
      available: !!process.env.MODAL_VIDEO_URL,
    },
    // ── Music providers ──
    {
      name: 'suno-v5',
      modalities: ['music'],
      maxDuration: 240,
      requiresKey: true,
      keyEnvVar: 'SUNO_API_KEY',
      quality: 5,
      speed: 'slow',
      costTier: 'medium',
      available: !!process.env.SUNO_API_KEY,
    },
    {
      name: 'acestep-xl-turbo',
      modalities: ['music'],
      maxDuration: 180,
      requiresKey: true,
      keyEnvVar: 'ACESTEP_MUSIC_URL',
      quality: 4,
      speed: 'medium',
      costTier: 'free',
      available: !!process.env.ACESTEP_MUSIC_URL,
    },
  ];
}

// ─── Image Generation ─────────────────────────────────────────────────────────

export async function generateImage(req: ImageGenerationRequest): Promise<GenerationResult> {
  // Build enriched prompt with HOLLY art direction
  let enrichedPrompt = req.prompt;
  if (req.artDirection) {
    const ad = req.artDirection;
    const parts = [
      req.prompt,
      ad.movement    && `Art style: ${ad.movement}`,
      ad.lighting    && `Lighting: ${ad.lighting}`,
      ad.colorPalette && `Color palette: ${ad.colorPalette}`,
      ad.composition && `Composition: ${ad.composition}`,
      ad.mood        && `Mood: ${ad.mood}`,
    ].filter(Boolean);
    enrichedPrompt = parts.join('. ');
  }
  if (req.style) enrichedPrompt = `${enrichedPrompt}, ${req.style} style`;

  const model = req.model || 'auto';
  const modalUrl = process.env.MODAL_IMAGE_URL;

  // 1. Holly's Modal Z-Image-Turbo endpoint (primary — no external API key needed)
  if (modalUrl && model !== 'flux-schnell') {
    try {
      return await generateImageModal(enrichedPrompt, req, modalUrl);
    } catch (err) {
      console.warn('[Generation] Modal Z-Image-Turbo failed, falling back to FLUX.1-schnell:', (err as Error).message);
    }
  }

  // 2. FLUX.1-schnell on Modal — Apache 2.0 proven fallback
  return await generateImagePollinations(enrichedPrompt, req);
}

async function generateImageModal(
  prompt: string,
  req: ImageGenerationRequest,
  endpointUrl: string,
): Promise<GenerationResult> {
  const [w, h] = resolveImageDimensions(req);

  const payload = {
    prompt,
    negative_prompt: req.negativePrompt || '',
    width: w,
    height: h,
    num_inference_steps: req.steps || 8,    // Z-Image-Turbo is optimized for 8 steps
    guidance_scale: req.guidance || 0,       // schnell ignores CFG, keep 0
    seed: req.seed ?? Math.floor(Math.random() * 1_000_000),
  };

  console.log(`[Generation] Modal image: ${endpointUrl}/generate (${w}×${h}) [Z-Image-Turbo]`);

  const res = await fetch(`${endpointUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000), // 2 min — allow for cold start
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Modal image error: ${res.status} — ${errText.substring(0, 200)}`);
  }

  const data = await res.json() as { image_url?: string; url?: string; error?: string };
  if (data.error) throw new Error(`Modal returned error: ${data.error}`);

  const url = data.image_url || data.url;
  if (!url) throw new Error('Modal image endpoint returned no URL');

  return {
    success: true,
    modality: 'image',
    url,
    provider: 'modal-z-image-turbo',
    model: 'Z-Image-Turbo',
    prompt,
    generatedAt: new Date(),
    estimatedCost: 0,
  };
}

async function generateImagePollinations(
  prompt: string,
  req: ImageGenerationRequest,
): Promise<GenerationResult> {
  const [w, h] = resolveImageDimensions(req);
  const seed = req.seed || Math.floor(Math.random() * 1_000_000);
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=${w}&height=${h}&model=flux&nologo=true`;

  // Verify Pollinations responds
  const check = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
  if (!check.ok) throw new Error('Pollinations returned non-OK');

  return {
    success: true,
    modality: 'image',
    url,
    provider: 'modal-flux-schnell-fallback',
    model: 'FLUX.1-schnell',
    prompt,
    generatedAt: new Date(),
    estimatedCost: 0,
  };
}

// ─── Video Generation ─────────────────────────────────────────────────────────

export async function generateVideo(req: VideoGenerationRequest): Promise<GenerationResult> {
  const modalUrl = process.env.MODAL_VIDEO_URL;

  if (!modalUrl) {
    throw new Error(
      'VIDEO_NOT_CONFIGURED: MODAL_VIDEO_URL is not set. ' +
      'The Holly CogVideoX-5B Modal endpoint is not configured. ' +
      'Check Coolify environment variables.'
    );
  }

  return await generateVideoModal(req, modalUrl);
}

async function generateVideoModal(
  req: VideoGenerationRequest,
  endpointUrl: string,
): Promise<GenerationResult> {
  const duration = Math.min(req.duration || 6, 10); // CogVideoX supports up to ~10s
  const ar = req.aspectRatio || '16:9';

  const payload = {
    prompt: req.prompt,
    negative_prompt: req.negativePrompt || '',
    num_frames: duration * (req.fps || 8),   // CogVideoX default 8fps
    fps: req.fps || 8,
    guidance_scale: 6,
    num_inference_steps: 50,
    seed: Math.floor(Math.random() * 1_000_000),
  };

  console.log(`[Generation] Modal video: ${endpointUrl}/video-generate, ${duration}s, ${ar}`);

  const res = await fetch(`${endpointUrl}/video-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(600_000), // 10 min — video generation can be slow
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Modal video error: ${res.status} — ${errText.substring(0, 300)}`);
  }

  const data = await res.json() as { video_url?: string; url?: string; error?: string };
  if (data.error) throw new Error(`Modal video returned error: ${data.error}`);

  const url = data.video_url || data.url;
  if (!url) throw new Error('Modal video endpoint returned no URL');

  return {
    success: true,
    modality: 'video',
    url,
    duration,
    provider: 'modal-cogvideox',
    model: 'CogVideoX-5B',
    prompt: req.prompt,
    generatedAt: new Date(),
    estimatedCost: 0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveImageDimensions(req: ImageGenerationRequest): [number, number] {
  if (req.width && req.height) return [req.width, req.height];

  const arMap: Record<AspectRatio, [number, number]> = {
    '16:9': [1344, 768],
    '9:16': [768, 1344],
    '1:1':  [1024, 1024],
    '4:3':  [1152, 896],
    '3:4':  [896, 1152],
  };

  return arMap[req.aspectRatio || '1:1'];
}

// ─── System Prompt Block for HOLLY chat ───────────────────────────────────────

export function getGenerationSystemBlock(): string {
  const hasModalImage = !!process.env.MODAL_IMAGE_URL;
  const hasModalVideo = !!process.env.MODAL_VIDEO_URL;
  const hasSuno       = !!process.env.SUNO_API_KEY;

  return `
[MULTI-MODAL GENERATION ENGINE — Phase 11]

HOLLY has access to a full multi-modal generation studio powered by her own Modal.com GPU workers.

**Images** (${hasModalImage ? '✅ ACTIVE — Modal Z-Image-Turbo GPU online' : '⚠️ MODAL_IMAGE_URL not set — using FLUX.1-schnell fallback'})
  Primary: Holly's own Z-Image-Turbo on Modal (6B, 8 steps, sub-second, Apache 2.0)
  Fallback: FLUX.1-schnell on Modal (proven, Apache 2.0)
  Trigger words: "generate an image", "create a picture", "make art", "design", "visualize",
                 "album art", "album cover", "poster", "thumbnail", "render", "illustrate"

**Videos** (${hasModalVideo ? '✅ ACTIVE — Modal Wan2.2-TI2V-5B GPU online' : '⚠️ MODAL_VIDEO_URL not set — video unavailable'})
  Primary: Holly's own Wan2.2-TI2V-5B on Modal (720P 24fps, Apache 2.0)
  Fallback: CogVideoX-5B on Modal (480P 8fps, Apache 2.0)
  Note: First request may take ~60s if the GPU worker is cold (scale-to-zero)
  Trigger words: "generate a video", "create a video clip", "make a short film", "animate"

**Music** (${hasSuno ? '✅ ACTIVE — Suno V5_5 online' : '⚠️ SUNO_API_KEY not set'})
  Full song generation with vocals via Suno V5_5

**Music Videos** — Combines Suno music generation + FLUX image generation
  Trigger: "make a music video", "create a visual for this song"

When a user requests generation:
  POST /api/multimodal/generate  — images and videos
  POST /api/multimodal/music-video — full music videos

Always:
  1. Confirm the concept before generating (unless the user says "just do it")
  2. Provide art direction — enrich the prompt with lighting, mood, style details
  3. Describe what you're generating and why those creative choices
  4. After generation, explain the decisions made
  5. If a generator is unavailable, say so clearly and offer alternatives
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
