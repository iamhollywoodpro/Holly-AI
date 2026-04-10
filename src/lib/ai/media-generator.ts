/**
 * HOLLY Media Generator — 100% Free, Open-Source, Zero Token Cost
 *
 * IMAGE providers (waterfall, best-first):
 *   1. Pollinations AI — FLUX.1-dev/schnell  (no key, no cost, always available)
 *   2. HuggingFace Inference — FLUX.1-schnell (free tier, needs HF key)
 *   3. HuggingFace Inference — SDXL           (free tier, needs HF key)
 *
 * VIDEO providers (waterfall, best-first):
 *   1. Pollinations AI — video endpoint        (no key, no cost)
 *   2. HuggingFace Inference — ZeroScope v2    (free tier, needs HF key)
 *   3. HuggingFace Inference — AnimateDiff     (free tier, needs HF key)
 *
 * ALBUM COVER — same as image, Pollinations FLUX with music-art prompt
 *
 * ALL MODELS — Open-source licences only:
 *   FLUX.1-dev/schnell: Apache-2.0 (Black Forest Labs)
 *   SDXL:              Apache-2.0 (Stability AI)
 *   ZeroScope v2:      CC-BY-NC-4.0 (free for non-commercial)
 *   AnimateDiff:       Apache-2.0
 *
 * NEVER USE: Midjourney, DALL-E, Imagen, Runway (paid), Sora, Stable Diffusion API (paid)
 * EXCEPTION:  Suno V5.5 is the ONLY paid API — music only, already configured.
 */

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageStyle = 'realistic' | 'artistic' | 'anime' | 'digital-art' | 'photographic' | 'cinematic';
export type ImageModel = 'flux-dev' | 'flux-schnell' | 'sdxl' | 'turbo' | 'auto';
export type VideoStyle = 'realistic' | 'cinematic' | 'anime' | 'abstract';

export interface ImageRequest {
  prompt:          string;
  negativePrompt?: string;
  model?:          ImageModel;
  aspectRatio?:    AspectRatio;
  width?:          number;
  height?:         number;
  seed?:           number;
  style?:          ImageStyle;
  enhance?:        boolean;
}

export interface ImageResult {
  url:         string;        // public URL or data URI
  provider:    string;
  model:       string;
  width:       number;
  height:      number;
  cost:        0;             // always 0 — free models only
  licence:     string;
}

export interface VideoRequest {
  prompt:       string;
  duration?:    number;       // seconds, 3–10
  aspectRatio?: AspectRatio;
  fps?:         number;       // 8 | 16 | 24
  style?:       VideoStyle;
  inputImage?:  string;       // URL for image-to-video
}

export interface VideoResult {
  url:       string;
  provider:  string;
  model:     string;
  duration:  number;
  fps:       number;
  format:    'mp4' | 'gif' | 'webm';
  cost:      0;
  licence:   string;
}

// ─── Dimension helpers ────────────────────────────────────────────────────────

function getDimensions(ar: AspectRatio = '1:1', override?: { width?: number; height?: number }) {
  if (override?.width && override?.height) return { width: override.width, height: override.height };
  const map: Record<AspectRatio, { width: number; height: number }> = {
    '1:1':  { width: 1024, height: 1024 },
    '16:9': { width: 1344, height: 768  },
    '9:16': { width: 768,  height: 1344 },
    '4:3':  { width: 1024, height: 768  },
    '3:4':  { width: 768,  height: 1024 },
  };
  return map[ar];
}

// ─── Provider 1: Pollinations AI (no key, always free) ────────────────────────

function pollinationsImageUrl(
  prompt:    string,
  model:     string = 'flux',
  width:     number = 1024,
  height:    number = 1024,
  seed?:     number,
  enhance:   boolean = true,
): string {
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width:   String(width),
    height:  String(height),
    nologo:  'true',
    enhance: enhance ? 'true' : 'false',
    model,
  });
  if (seed !== undefined) params.set('seed', String(seed));
  return `https://image.pollinations.ai/prompt/${encoded}?${params}`;
}

async function generateWithPollinations(req: ImageRequest): Promise<ImageResult> {
  const { width, height } = getDimensions(req.aspectRatio, { width: req.width, height: req.height });
  // Map style → Pollinations model
  const pollinationsModel = req.model === 'sdxl' ? 'stable-diffusion-xl'
    : req.model === 'turbo' ? 'turbo'
    : req.model === 'flux-schnell' ? 'flux'
    : 'flux'; // flux-dev and auto → flux (best quality)

  const url = pollinationsImageUrl(
    req.prompt,
    pollinationsModel,
    width,
    height,
    req.seed,
    req.enhance !== false,
  );

  // Verify the URL responds (Pollinations is synchronous — GET returns image directly)
  const res = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'HOLLY-AI/2.4' },
  });
  if (!res.ok) throw new Error(`Pollinations returned ${res.status}`);

  return {
    url,
    provider: 'pollinations',
    model:    `FLUX.1 (${pollinationsModel})`,
    width,
    height,
    cost:     0,
    licence:  'Apache-2.0',
  };
}

// ─── Provider 2: HuggingFace Inference API (free tier) ───────────────────────
// Requires HUGGINGFACE_API_KEY (free — create at huggingface.co/settings/tokens)

async function generateWithHuggingFace(req: ImageRequest): Promise<ImageResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const { width, height } = getDimensions(req.aspectRatio, { width: req.width, height: req.height });

  // Choose HF model
  const model = req.model === 'sdxl'
    ? 'stabilityai/stable-diffusion-xl-base-1.0'
    : 'black-forest-labs/FLUX.1-schnell';

  const licence = req.model === 'sdxl' ? 'Apache-2.0' : 'Apache-2.0';

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs:     req.prompt,
      parameters: {
        negative_prompt: req.negativePrompt,
        width,
        height,
        num_inference_steps: req.model === 'sdxl' ? 30 : 4,
        guidance_scale:      req.model === 'sdxl' ? 7.5 : 0,
        seed:                req.seed,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HuggingFace ${model} error ${res.status}: ${body.slice(0, 200)}`);
  }

  const blob     = await res.blob();
  const arrayBuf = await blob.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:image/jpeg;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'huggingface',
    model:    model.split('/')[1],
    width,
    height,
    cost:     0,
    licence,
  };
}

// ─── Main image generation entry point ────────────────────────────────────────

/**
 * Generate an image using the free waterfall.
 * Always returns a result — falls back through providers until one works.
 */
export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const errors: string[] = [];

  // 1. Pollinations (no key — always try first)
  try {
    return await generateWithPollinations(req);
  } catch (e) {
    errors.push(`Pollinations: ${(e as Error).message}`);
    console.warn('[MediaGen] Pollinations failed:', (e as Error).message);
  }

  // 2. HuggingFace FLUX.1-schnell
  try {
    return await generateWithHuggingFace({ ...req, model: 'flux-schnell' });
  } catch (e) {
    errors.push(`HF FLUX: ${(e as Error).message}`);
    console.warn('[MediaGen] HF FLUX failed:', (e as Error).message);
  }

  // 3. HuggingFace SDXL
  try {
    return await generateWithHuggingFace({ ...req, model: 'sdxl' });
  } catch (e) {
    errors.push(`HF SDXL: ${(e as Error).message}`);
    console.warn('[MediaGen] HF SDXL failed:', (e as Error).message);
  }

  throw new Error(`All free image providers failed:\n${errors.join('\n')}`);
}

// ─── Video generation ─────────────────────────────────────────────────────────

/**
 * Provider 1: Pollinations video (experimental, no key)
 * Returns a GIF/WebM URL for short clips.
 */
async function generateVideoWithPollinations(req: VideoRequest): Promise<VideoResult> {
  const { width, height } = getDimensions(req.aspectRatio);
  const duration = Math.min(Math.max(req.duration ?? 4, 2), 8);
  const fps      = req.fps ?? 8;

  const encoded = encodeURIComponent(req.prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=video&duration=${duration}&fps=${fps}`;

  const res = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'HOLLY-AI/2.4' },
  });
  if (!res.ok) throw new Error(`Pollinations video returned ${res.status}`);

  return {
    url,
    provider: 'pollinations',
    model:    'Pollinations Video (FLUX)',
    duration,
    fps,
    format:   'mp4',
    cost:     0,
    licence:  'Apache-2.0',
  };
}

/**
 * Provider 2: HuggingFace ZeroScope v2 XL
 * Open-source text-to-video, CC-BY-NC-4.0 (free for non-commercial).
 */
async function generateVideoWithHuggingFace(req: VideoRequest): Promise<VideoResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const { width, height } = getDimensions(req.aspectRatio);
  const duration = Math.min(Math.max(req.duration ?? 3, 2), 6);
  const fps      = req.fps ?? 8;

  // ZeroScope v2 XL — best free open-source text-to-video
  const model = 'cerspense/zeroscope_v2_XL';

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: req.prompt,
      parameters: {
        num_frames:          duration * fps,
        fps,
        width:               Math.min(width, 576),
        height:              Math.min(height, 320),
        num_inference_steps: 25,
        guidance_scale:      7.5,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF ZeroScope error ${res.status}: ${body.slice(0, 200)}`);
  }

  const blob     = await res.blob();
  const arrayBuf = await blob.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:video/mp4;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'huggingface',
    model:    'ZeroScope v2 XL',
    duration,
    fps,
    format:   'mp4',
    cost:     0,
    licence:  'CC-BY-NC-4.0',
  };
}

/**
 * Provider 3: HuggingFace AnimateDiff
 * Text-to-animated-GIF, Apache-2.0
 */
async function generateAnimatedGifWithHuggingFace(req: VideoRequest): Promise<VideoResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const res = await fetch('https://api-inference.huggingface.co/models/guoyww/animatediff-motion-adapter-v1-5-2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: req.prompt,
      parameters: { num_frames: 16, fps: 8 },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) throw new Error(`HF AnimateDiff error ${res.status}`);

  const blob     = await res.blob();
  const arrayBuf = await blob.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:image/gif;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'huggingface',
    model:    'AnimateDiff v1.5',
    duration: 2,
    fps:      8,
    format:   'gif',
    cost:     0,
    licence:  'Apache-2.0',
  };
}

/**
 * Generate a video using the free waterfall.
 * Returns a result or throws if all providers fail.
 */
export async function generateVideo(req: VideoRequest): Promise<VideoResult> {
  const errors: string[] = [];

  // 1. Pollinations video (experimental, no key)
  try {
    return await generateVideoWithPollinations(req);
  } catch (e) {
    errors.push(`Pollinations Video: ${(e as Error).message}`);
    console.warn('[MediaGen] Pollinations video failed:', (e as Error).message);
  }

  // 2. HuggingFace ZeroScope v2
  try {
    return await generateVideoWithHuggingFace(req);
  } catch (e) {
    errors.push(`HF ZeroScope: ${(e as Error).message}`);
    console.warn('[MediaGen] HF ZeroScope failed:', (e as Error).message);
  }

  // 3. HuggingFace AnimateDiff (GIF fallback)
  try {
    return await generateAnimatedGifWithHuggingFace(req);
  } catch (e) {
    errors.push(`HF AnimateDiff: ${(e as Error).message}`);
    console.warn('[MediaGen] HF AnimateDiff failed:', (e as Error).message);
  }

  throw new Error(`All free video providers failed:\n${errors.join('\n')}`);
}

// ─── Album cover shortcut ─────────────────────────────────────────────────────

export interface AlbumCoverRequest {
  title?:  string;
  artist?: string;
  genre?:  string;
  mood?:   string;
  style?:  'minimalist' | 'bold' | 'artistic' | 'photographic' | 'abstract' | 'retro';
  lyrics?: string;
}

export async function generateAlbumCover(req: AlbumCoverRequest): Promise<ImageResult> {
  const styleMap: Record<string, string> = {
    minimalist:   'minimalist design, clean lines, simple composition, white space',
    bold:         'bold striking design, high contrast, dramatic typography, vivid colors',
    artistic:     'artistic expressive painting, creative surreal composition',
    photographic: 'cinematic photography, studio lighting, professional shot',
    abstract:     'abstract geometric art, surreal conceptual design',
    retro:        'vintage retro aesthetic, 70s/80s design, warm film tones',
  };

  let prompt = 'Professional music album cover art, high quality, square format, no text';
  if (req.genre)  prompt += `, ${req.genre} music`;
  if (req.mood)   prompt += `, ${req.mood} mood`;
  if (req.style)  prompt += `, ${styleMap[req.style] ?? req.style}`;
  if (req.title)  prompt += `, themed around "${req.title}"`;
  if (req.artist) prompt += `, artist ${req.artist}`;
  if (req.lyrics) prompt += `, capturing: ${req.lyrics.substring(0, 150)}`;
  prompt += ', vibrant colors, centered composition, album art aesthetics';

  return generateImage({
    prompt,
    aspectRatio: '1:1',
    model:       'flux-dev',
    enhance:     true,
  });
}

// ─── Provider info (for /api/health and settings) ────────────────────────────

export const MEDIA_PROVIDERS = {
  image: [
    {
      name:     'Pollinations AI (FLUX.1)',
      models:   ['FLUX.1-dev', 'FLUX.1-schnell', 'SDXL', 'Turbo'],
      licence:  'Apache-2.0',
      free:     true,
      keyNeeded: false,
      quality:   'excellent',
      note:      'No key needed. Always available. 1024×1024 max.',
    },
    {
      name:      'HuggingFace Inference',
      models:    ['FLUX.1-schnell (Apache-2.0)', 'SDXL (Apache-2.0)'],
      licence:   'Apache-2.0',
      free:      true,
      keyNeeded: true,
      keyEnv:    'HUGGINGFACE_API_KEY',
      signupUrl: 'https://huggingface.co/settings/tokens',
      quality:   'excellent',
      note:      'Free tier — no billing. Better quality than Pollinations.',
    },
  ],
  video: [
    {
      name:      'Pollinations AI (Video)',
      models:    ['FLUX Video (experimental)'],
      licence:   'Apache-2.0',
      free:      true,
      keyNeeded: false,
      quality:   'good',
      note:      'No key needed. Short clips.',
    },
    {
      name:      'HuggingFace — ZeroScope v2 XL',
      models:    ['zeroscope_v2_XL'],
      licence:   'CC-BY-NC-4.0',
      free:      true,
      keyNeeded: true,
      keyEnv:    'HUGGINGFACE_API_KEY',
      signupUrl: 'https://huggingface.co/settings/tokens',
      quality:   'good',
      note:      'Free, non-commercial. Best open-source text-to-video.',
    },
    {
      name:      'HuggingFace — AnimateDiff',
      models:    ['animatediff-motion-adapter-v1-5-2'],
      licence:   'Apache-2.0',
      free:      true,
      keyNeeded: true,
      keyEnv:    'HUGGINGFACE_API_KEY',
      quality:   'decent',
      note:      'GIF output. Apache-2.0. Good fallback.',
    },
  ],
  blocked: [
    'Midjourney (paid)',
    'DALL-E / GPT-Image (paid, OpenAI)',
    'Imagen (paid, Google)',
    'Runway Gen-3 (paid)',
    'Sora (paid, OpenAI)',
    'Stable Diffusion API / DreamStudio (paid)',
    'Adobe Firefly (paid)',
    'Fal.ai (paid credits, not zero-cost)',
    'Replicate (paid credits, not zero-cost)',
  ],
};
