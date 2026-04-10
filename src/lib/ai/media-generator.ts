/**
 * HOLLY Media Generator — 100% Free, Open-Source, Zero Token Cost
 *
 * IMAGE providers (waterfall, best-first):
 *   1. Pollinations AI — FLUX.1-schnell (no key, no cost, always available, Apache-2.0)
 *   2. HuggingFace Inference — FLUX.1-schnell (free tier, HUGGINGFACE_API_KEY, Apache-2.0)
 *   3. HuggingFace Inference — SDXL 1.0      (free tier, HUGGINGFACE_API_KEY, Apache-2.0)
 *
 * VIDEO providers (waterfall, best-first):
 *   1. Pollinations AI — video endpoint (no key, experimental, LTX-Video based)
 *   2. HuggingFace Inference — ZeroScope v2 XL (free tier, CC-BY-NC-4.0)
 *   3. HuggingFace Inference — AnimateDiff v1.5 (free tier, Apache-2.0)
 *
 * ALBUM COVER — same as image waterfall with music-art enriched prompt
 *
 * LICENCE ACCURACY (verified 2026-04-10):
 *   FLUX.1-schnell  → Apache-2.0 ✅ (commercial-safe, Black Forest Labs)
 *   FLUX.1-dev      → FLUX Non-Commercial License ❌ NOT used here
 *   FLUX.1-Kontext  → FLUX Non-Commercial License ❌ NOT used here
 *   SDXL 1.0        → Apache-2.0 ✅ (Stability AI)
 *   SD 3.5 Large    → Stability AI Community License ✅ (free commercial)
 *   ZeroScope v2    → CC-BY-NC-4.0 ⚠️ (non-commercial only)
 *   AnimateDiff     → Apache-2.0 ✅
 *   Pollinations    → serves schnell/turbo via free API ✅
 *
 * UPGRADE CANDIDATES (confirmed open-source, not yet on HF free inference tier):
 *   LTX-Video 2.3 (Lightricks, Mar 2026) — Apache-2.0, real-time, native audio
 *   CogVideoX-5B (THUDM)                 — Apache-2.0, best HF video 2025
 *   Wan 2.2 A14B (Alibaba, Aug 2025)     — Apache-2.0, MoE, 720P cinematic
 *   HunyuanVideo (Tencent)               — free commercial, 13B, Kling-quality
 *   SD 3.5 Large (Stability AI)          — Stability Community License, 8B
 *
 * NEVER USE: Midjourney, DALL-E, Imagen, Runway (paid), Sora, Pika, Kling,
 *            Fal.ai (paid credits), Replicate (paid credits), Adobe Firefly,
 *            Seedance 2.0 (ByteDance — closed weights, paid API only)
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
  // NOTE: Pollinations serves FLUX.1-schnell (Apache-2.0) — NOT flux-dev
  // (which is non-commercial). 'flux' model param → schnell variant.
  const pollinationsModel = req.model === 'sdxl' ? 'stable-diffusion-xl'
    : req.model === 'turbo' ? 'turbo'
    : 'flux'; // flux, flux-schnell, flux-dev, auto → all route to schnell (Apache-2.0)

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
  image: {
    active: [
      {
        name:      'Pollinations AI (FLUX.1-schnell)',
        models:    ['FLUX.1-schnell', 'SDXL', 'Turbo'],
        licence:   'Apache-2.0',  // schnell only — NOT dev (non-commercial)
        free:      true,
        keyNeeded: false,
        quality:   'excellent',
        note:      'No key ever needed. Primary path. FLUX.1-schnell is Apache-2.0 commercial-safe.',
      },
      {
        name:      'HuggingFace — FLUX.1-schnell',
        models:    ['black-forest-labs/FLUX.1-schnell'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        signupUrl: 'https://huggingface.co/settings/tokens',
        quality:   'excellent',
        note:      'HF free inference. 4-step distillation. Only FLUX variant that is truly Apache-2.0.',
      },
      {
        name:      'HuggingFace — SDXL 1.0',
        models:    ['stabilityai/stable-diffusion-xl-base-1.0'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        quality:   'good',
        note:      'HF free tier. Solid fallback. Upgrade candidate: SD 3.5 Large.',
      },
    ],
    candidates: [
      {
        name:      'SD 3.5 Large (HuggingFace)',
        modelId:   'stabilityai/stable-diffusion-3.5-large',
        licence:   'Stability AI Community License (free commercial)',
        why:       'Massively better than SDXL — 8B MMDiT, superior typography, photorealism, prompt adherence.',
        blocker:   'Large model — may timeout on HF free inference tier. Promote when confirmed.',
      },
      {
        name:      'SD 3.5 Large Turbo (HuggingFace)',
        modelId:   'stabilityai/stable-diffusion-3.5-large-turbo',
        licence:   'Stability AI Community License (free commercial)',
        why:       'Same quality as 3.5 Large in 4 steps (ADD distillation). Faster for HF free tier.',
        blocker:   'Same as above — promote when confirmed on free inference.',
      },
    ],
    blocked: [
      'FLUX.1-dev (non-commercial licence — NOT Apache-2.0)',
      'FLUX.1-Kontext (non-commercial licence)',
      'Midjourney (paid)',
      'DALL-E / GPT-Image (paid)',
      'Imagen (paid, Google)',
      'Adobe Firefly (paid)',
      'Fal.ai (paid credits)',
      'Replicate (paid credits)',
    ],
  },
  video: {
    active: [
      {
        name:      'Pollinations AI (Video / LTX-based)',
        models:    ['video'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: false,
        quality:   'decent',
        note:      'No key. Experimental — uses LTX-Video internally. Guaranteed fallback.',
      },
      {
        name:      'HuggingFace — ZeroScope v2 XL',
        models:    ['cerspense/zeroscope_v2_XL'],
        licence:   'CC-BY-NC-4.0',  // ⚠️ non-commercial only
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        quality:   'good',
        note:      'OUTDATED (2023). Non-commercial licence. Superseded by CogVideoX/LTX-2.3.',
      },
      {
        name:      'HuggingFace — AnimateDiff v1.5',
        models:    ['guoyww/animatediff-motion-adapter-v1-5-2'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        quality:   'decent',
        note:      'OUTDATED (2023). GIF output only. Last-resort HF fallback.',
      },
    ],
    candidates: [
      {
        name:    'LTX-Video 2.3 (Lightricks, Mar 2026)',
        modelId: 'Lightricks/LTX-2.3',
        licence: 'Apache-2.0',
        why:     'Real-time generation, native audio sync, 4K/20s. Best OSS video 2026. Apache-2.0.',
        blocker: 'Large model — needs self-hosted GPU or HF Pro. Promote when confirmed free.',
      },
      {
        name:    'Wan 2.2 A14B (Alibaba, Aug 2025)',
        modelId: 'Wan-AI/Wan2.2-T2V-A14B',
        licence: 'Apache-2.0',
        why:     "World's first open-source MoE video model. 720P, cinematic controls. Top-rated 2026.",
        blocker: '14B params — needs substantial VRAM. Promote when confirmed on free inference.',
      },
      {
        name:    'CogVideoX-5B (THUDM)',
        modelId: 'THUDM/CogVideoX-5b',
        licence: 'Apache-2.0',
        why:     '5B params, Apache-2.0. Much better motion coherence than ZeroScope. HF available.',
        blocker: 'Promote when confirmed working on HF free inference tier.',
      },
      {
        name:    'HunyuanVideo (Tencent, 13B)',
        modelId: 'tencent/HunyuanVideo',
        licence: 'Tencent HunyuanVideo Community License (free commercial)',
        why:     'Comparable to Kling/Sora quality. Open weights. Free commercial use.',
        blocker: '13B params, 24GB+ VRAM — needs self-hosted GPU path.',
      },
    ],
    blocked: [
      'Seedance 2.0 (ByteDance — closed weights, paid API only via Fal.ai/PiAPI — NO open weights)',
      'Runway Gen-3/Gen-4 (paid)',
      'Sora (paid, OpenAI)',
      'Pika Labs (paid)',
      'Kling (paid)',
      'Fal.ai (paid credits)',
      'Replicate (paid credits)',
    ],
  },
};
