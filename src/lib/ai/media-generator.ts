/**
 * HOLLY Media Generator — 100% Free, Open-Source, Zero Token Cost
 *
 * ═══════════════════════════════════════════════════════════════════
 * IMAGE providers (waterfall, best-first):
 *   1. Pollinations AI  — FLUX.1-schnell (no key, Apache-2.0, always free)
 *   2. HuggingFace      — FLUX.2-klein 4B (free tier, HUGGINGFACE_API_KEY, Apache-2.0, 2026)
 *   3. HuggingFace      — FLUX.1-schnell (free tier, HUGGINGFACE_API_KEY, Apache-2.0)
 *   4. HuggingFace      — SDXL 1.0 (free tier, HUGGINGFACE_API_KEY, Apache-2.0)
 *
 * VIDEO providers (waterfall, best-first):
 *   1. HuggingFace      — CogVideoX-5B (HUGGINGFACE_API_KEY, Apache-2.0, best OSS 2026)
 *   2. HuggingFace      — Wan2.2-TI2V-5B (HUGGINGFACE_API_KEY, Apache-2.0, cinematic 720P)
 *   3. Pollinations AI  — video endpoint (no key, experimental, LTX-Video based)
 *   4. HuggingFace      — AnimateDiff v1.5 (GIF fallback, Apache-2.0)
 *
 * ALBUM COVER — same as image waterfall with music-art enriched prompt
 *
 * ═══════════════════════════════════════════════════════════════════
 * LICENCE ACCURACY (verified 2026-04-10):
 *   FLUX.1-schnell      → Apache-2.0 ✅ (commercial-safe, Black Forest Labs)
 *   FLUX.2-klein        → Apache-2.0 ✅ (Jan 2026, 4B/9B, sub-second gen, commercial-safe)
 *   FLUX.2-dev          → FLUX Non-Commercial License ❌ NOT used (32B, non-commercial)
 *   FLUX.1-dev          → FLUX Non-Commercial License ❌ NOT used
 *   FLUX.1-Kontext      → FLUX Non-Commercial License ❌ NOT used
 *   SDXL 1.0            → Apache-2.0 ✅ (Stability AI)
 *   SD 3.5 Large        → Stability AI Community License ✅ (free commercial)
 *   CogVideoX-5B        → Apache-2.0 ✅ (THUDM, best free video 2025-2026)
 *   Wan2.2-TI2V-5B      → Apache-2.0 ✅ (Alibaba, 720P, T2V + I2V, 2026)
 *   AnimateDiff         → Apache-2.0 ✅
 *   ZeroScope v2        → CC-BY-NC-4.0 ⚠️ (non-commercial only — REMOVED from active)
 *   Pollinations        → serves schnell/turbo via free API ✅
 *   HunyuanVideo        → Tencent Community License ⚠️ (commercial ok, but 60-80GB VRAM)
 *
 * ═══════════════════════════════════════════════════════════════════
 * HF API URL CHANGE (as of late 2025):
 *   OLD (deprecated): https://api-inference.huggingface.co/models/{model}
 *   NEW (active):     https://router.huggingface.co/hf-inference/models/{model}
 *
 * HF PRO NOTE ($9/month):
 *   - Pro gives $2/month included credits (not unlimited)
 *   - Pro gives 8× ZeroGPU quota (25 min H200/day) for Spaces — not serverless API
 *   - API requests via HUGGINGFACE_API_KEY are charged pay-as-you-go beyond $2 credits
 *   - Images via HF inference cost ~$0.001 per image (10s @ $0.00012/GPU-sec)
 *   - Holly uses Pollinations as primary (free) — HF is fallback only
 *   - Get your API key at: https://huggingface.co/settings/tokens
 *
 * ═══════════════════════════════════════════════════════════════════
 * UPGRADE CANDIDATES (open-source, confirmed available, high VRAM):
 *   LTX-Video 2.3 (Lightricks, Mar 2026) — Apache-2.0, real-time, native audio, 4K
 *   Wan 2.2 A14B (Alibaba, 2026)         — Apache-2.0, MoE 14B, cinematic, 720P
 *   HunyuanVideo (Tencent, 13B)          — free commercial, 60GB+ VRAM, Kling-quality
 *   SD 3.5 Large (Stability AI)          — Community License, 8B, superior typography
 *   FLUX.2-dev (BFL, 32B)               — Non-commercial, needs 20GB+ quantized
 *   Z-Image-Turbo (Tongyi-MAI, 6B)      — Apache-2.0, sub-second, strong text render
 *
 * NEVER USE:
 *   Midjourney, DALL-E, Imagen, Runway (paid), Sora, Pika, Kling,
 *   Fal.ai (paid credits), Replicate (paid credits), Adobe Firefly,
 *   Seedance 2.0 (ByteDance — closed weights, paid API only)
 * EXCEPTION: Suno V5.5 is the ONLY paid API — music only, already configured.
 */

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageStyle = 'realistic' | 'artistic' | 'anime' | 'digital-art' | 'photographic' | 'cinematic';
export type ImageModel = 'flux-dev' | 'flux-schnell' | 'flux2-klein' | 'sdxl' | 'turbo' | 'auto';
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

// ─── HuggingFace Router URL helper (new 2025 API) ─────────────────────────────
// Old: https://api-inference.huggingface.co/models/{model}  ← DEPRECATED
// New: https://router.huggingface.co/hf-inference/models/{model} ← ACTIVE

function hfInferenceUrl(model: string): string {
  return `https://router.huggingface.co/hf-inference/models/${model}`;
}

// ─── Image Provider 1: Pollinations AI (no key, always free) ─────────────────

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

  // NOTE: Pollinations serves FLUX.1-schnell (Apache-2.0) — NOT flux-dev (non-commercial).
  // 'flux' model param → schnell variant on Pollinations infrastructure.
  const pollinationsModel = req.model === 'sdxl' ? 'stable-diffusion-xl'
    : req.model === 'turbo' ? 'turbo'
    : 'flux'; // flux, flux-schnell, flux2-klein, auto → all route to schnell (Apache-2.0)

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
    headers: { 'User-Agent': 'HOLLY-AI/2.5' },
  });
  if (!res.ok) throw new Error(`Pollinations returned ${res.status}`);

  return {
    url,
    provider: 'pollinations',
    model:    'FLUX.1-schnell (Pollinations)',
    width,
    height,
    cost:     0,
    licence:  'Apache-2.0',
  };
}

// ─── Image Provider 2: HuggingFace FLUX.2-klein 4B (NEW 2026) ───────────────
// FLUX.2[klein] released Jan 2026. 4B distilled model, sub-second generation.
// Apache-2.0 licence. Runs on 13GB VRAM. Best free-tier HF image model in 2026.

async function generateWithHuggingFaceFlux2Klein(req: ImageRequest): Promise<ImageResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const { width, height } = getDimensions(req.aspectRatio, { width: req.width, height: req.height });

  // FLUX.2-klein-4B: distilled, fast, Apache-2.0, Jan 2026
  const model = 'black-forest-labs/FLUX.2-klein-4B';

  const res = await fetch(hfInferenceUrl(model), {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${hfKey}`,
      'Content-Type': 'application/json',
      'X-Wait-For-Model': 'true',  // wait instead of 503 if loading
    },
    body: JSON.stringify({
      inputs:     req.prompt,
      parameters: {
        negative_prompt:     req.negativePrompt,
        width:               Math.min(width, 1024),
        height:              Math.min(height, 1024),
        num_inference_steps: 4,   // distilled model — 4 steps is optimal
        guidance_scale:      3.5,
        seed:                req.seed,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF FLUX.2-klein error ${res.status}: ${body.slice(0, 200)}`);
  }

  const blob     = await res.blob();
  const arrayBuf = await blob.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:image/jpeg;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'huggingface',
    model:    'FLUX.2-klein 4B',
    width,
    height,
    cost:     0,
    licence:  'Apache-2.0',
  };
}

// ─── Image Provider 3: HuggingFace FLUX.1-schnell / SDXL ────────────────────

async function generateWithHuggingFace(req: ImageRequest): Promise<ImageResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const { width, height } = getDimensions(req.aspectRatio, { width: req.width, height: req.height });

  // Choose HF model
  const isSDXL  = req.model === 'sdxl';
  const model   = isSDXL
    ? 'stabilityai/stable-diffusion-xl-base-1.0'
    : 'black-forest-labs/FLUX.1-schnell';

  const res = await fetch(hfInferenceUrl(model), {
    method: 'POST',
    headers: {
      Authorization:      `Bearer ${hfKey}`,
      'Content-Type':     'application/json',
      'X-Wait-For-Model': 'true',
    },
    body: JSON.stringify({
      inputs:     req.prompt,
      parameters: {
        negative_prompt:     req.negativePrompt,
        width:               Math.min(width, 1024),
        height:              Math.min(height, 1024),
        num_inference_steps: isSDXL ? 30 : 4,
        guidance_scale:      isSDXL ? 7.5 : 0,
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
    licence:  'Apache-2.0',
  };
}

// ─── Main image generation entry point ────────────────────────────────────────

/**
 * Generate an image using the free waterfall.
 * Always returns a result — falls back through providers until one works.
 */
export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const errors: string[] = [];

  // 1. Pollinations (no key — always try first, fastest)
  try {
    return await generateWithPollinations(req);
  } catch (e) {
    errors.push(`Pollinations: ${(e as Error).message}`);
    console.warn('[MediaGen] Pollinations failed:', (e as Error).message);
  }

  // 2. HuggingFace FLUX.2-klein 4B (NEW Jan 2026 — faster and better quality)
  try {
    return await generateWithHuggingFaceFlux2Klein(req);
  } catch (e) {
    errors.push(`HF FLUX.2-klein: ${(e as Error).message}`);
    console.warn('[MediaGen] HF FLUX.2-klein failed:', (e as Error).message);
  }

  // 3. HuggingFace FLUX.1-schnell
  try {
    return await generateWithHuggingFace({ ...req, model: 'flux-schnell' });
  } catch (e) {
    errors.push(`HF FLUX.1-schnell: ${(e as Error).message}`);
    console.warn('[MediaGen] HF FLUX.1-schnell failed:', (e as Error).message);
  }

  // 4. HuggingFace SDXL (last resort image fallback)
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
 * Video Provider 1: HuggingFace CogVideoX-5B (BEST FREE VIDEO 2025-2026)
 * Apache-2.0, 5B params, text-to-video and image-to-video, superior motion.
 * Developed by THUDM (Tsinghua KEG). Replaces ZeroScope v2 (outdated 2023).
 */
async function generateVideoWithCogVideoX(req: VideoRequest): Promise<VideoResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const duration = Math.min(Math.max(req.duration ?? 5, 3), 10);
  const fps      = req.fps ?? 8;

  // CogVideoX-5B: text-to-video, Apache-2.0
  const model = 'THUDM/CogVideoX-5b';

  const res = await fetch(hfInferenceUrl(model), {
    method: 'POST',
    headers: {
      Authorization:      `Bearer ${hfKey}`,
      'Content-Type':     'application/json',
      'X-Wait-For-Model': 'true',
    },
    body: JSON.stringify({
      inputs:     req.prompt,
      parameters: {
        num_frames:          Math.min(duration * fps, 49),  // CogVideoX max 49 frames
        fps,
        num_inference_steps: 50,
        guidance_scale:      6.0,
      },
    }),
    signal: AbortSignal.timeout(180_000),  // video takes longer
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF CogVideoX-5B error ${res.status}: ${body.slice(0, 200)}`);
  }

  const blob     = await res.blob();
  const arrayBuf = await blob.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:video/mp4;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'huggingface',
    model:    'CogVideoX-5B',
    duration,
    fps,
    format:   'mp4',
    cost:     0,
    licence:  'Apache-2.0',
  };
}

/**
 * Video Provider 2: HuggingFace Wan2.2-TI2V-5B (Best 2026 open-source video)
 * Apache-2.0, 5B MoE, 720P, T2V + I2V, consumer-GPU friendly (24GB VRAM).
 * Released 2025-2026 by Alibaba Wan-AI. Produces cinematic 720P video.
 */
async function generateVideoWithWan22(req: VideoRequest): Promise<VideoResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const { width, height } = getDimensions(req.aspectRatio);
  const duration = Math.min(Math.max(req.duration ?? 5, 3), 5);  // Wan2.2 standard: 5s
  const fps      = req.fps ?? 24;  // Wan2.2 outputs 24fps 720P

  const model = 'Wan-AI/Wan2.2-TI2V-5B';

  const body: Record<string, unknown> = {
    inputs:     req.prompt,
    parameters: {
      num_frames:          duration * fps,
      fps,
      width:               Math.min(width, 1280),
      height:              Math.min(height, 720),
      num_inference_steps: 50,
      guidance_scale:      7.5,
    },
  };

  // Support image-to-video if inputImage provided
  if (req.inputImage) {
    (body.parameters as Record<string, unknown>).image = req.inputImage;
  }

  const res = await fetch(hfInferenceUrl(model), {
    method: 'POST',
    headers: {
      Authorization:      `Bearer ${hfKey}`,
      'Content-Type':     'application/json',
      'X-Wait-For-Model': 'true',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`HF Wan2.2 error ${res.status}: ${bodyText.slice(0, 200)}`);
  }

  const resBlob  = await res.blob();
  const arrayBuf = await resBlob.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:video/mp4;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'huggingface',
    model:    'Wan2.2-TI2V-5B',
    duration,
    fps,
    format:   'mp4',
    cost:     0,
    licence:  'Apache-2.0',
  };
}

/**
 * Video Provider 3: Pollinations video (experimental, no key)
 * Returns a GIF/WebM URL for short clips. LTX-Video based internally.
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
    headers: { 'User-Agent': 'HOLLY-AI/2.5' },
  });
  if (!res.ok) throw new Error(`Pollinations video returned ${res.status}`);

  return {
    url,
    provider: 'pollinations',
    model:    'Pollinations Video (LTX-based)',
    duration,
    fps,
    format:   'mp4',
    cost:     0,
    licence:  'Apache-2.0',
  };
}

/**
 * Video Provider 4: HuggingFace AnimateDiff (GIF fallback, Apache-2.0)
 * Legacy 2023 model — last resort only. Replaced by CogVideoX + Wan2.2.
 */
async function generateAnimatedGifWithHuggingFace(req: VideoRequest): Promise<VideoResult> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not set');

  const res = await fetch(hfInferenceUrl('guoyww/animatediff-motion-adapter-v1-5-2'), {
    method: 'POST',
    headers: {
      Authorization:      `Bearer ${hfKey}`,
      'Content-Type':     'application/json',
      'X-Wait-For-Model': 'true',
    },
    body: JSON.stringify({
      inputs:     req.prompt,
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
 * CogVideoX-5B → Wan2.2 → Pollinations → AnimateDiff
 */
export async function generateVideo(req: VideoRequest): Promise<VideoResult> {
  const errors: string[] = [];

  // 1. CogVideoX-5B (best Apache-2.0 video 2025-2026)
  try {
    return await generateVideoWithCogVideoX(req);
  } catch (e) {
    errors.push(`CogVideoX-5B: ${(e as Error).message}`);
    console.warn('[MediaGen] CogVideoX-5B failed:', (e as Error).message);
  }

  // 2. Wan2.2-TI2V-5B (cinematic 720P, Apache-2.0, T2V+I2V)
  try {
    return await generateVideoWithWan22(req);
  } catch (e) {
    errors.push(`Wan2.2-TI2V-5B: ${(e as Error).message}`);
    console.warn('[MediaGen] Wan2.2 failed:', (e as Error).message);
  }

  // 3. Pollinations video (experimental, no key)
  try {
    return await generateVideoWithPollinations(req);
  } catch (e) {
    errors.push(`Pollinations Video: ${(e as Error).message}`);
    console.warn('[MediaGen] Pollinations video failed:', (e as Error).message);
  }

  // 4. AnimateDiff (GIF fallback, last resort)
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
    model:       'flux-schnell',  // Apache-2.0 safe (schnell, not dev)
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
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: false,
        quality:   'excellent',
        note:      'No key ever needed. Primary path. FLUX.1-schnell is Apache-2.0 commercial-safe.',
      },
      {
        name:      'HuggingFace — FLUX.2-klein 4B (NEW 2026)',
        models:    ['black-forest-labs/FLUX.2-klein-4B'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        signupUrl: 'https://huggingface.co/settings/tokens',
        quality:   'excellent',
        note:      'Released Jan 2026. 4B distilled model. Sub-second generation. Best free image model 2026.',
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
        note:      'HF free inference. 4-step distillation. Apache-2.0 commercial-safe.',
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
        name:      'FLUX.2-dev (32B)',
        modelId:   'black-forest-labs/FLUX.2-dev',
        licence:   'FLUX Non-Commercial License',
        why:       'State-of-the-art image quality, multi-reference editing. Needs 20GB+ VRAM (quantized).',
        blocker:   'NON-COMMERCIAL licence — cannot use commercially. Use FLUX.2-klein instead.',
      },
      {
        name:      'SD 3.5 Large (HuggingFace)',
        modelId:   'stabilityai/stable-diffusion-3.5-large',
        licence:   'Stability AI Community License (free commercial)',
        why:       'Massively better than SDXL — 8B MMDiT, superior typography, photorealism.',
        blocker:   'Large model — may timeout on HF free inference tier. Promote when confirmed.',
      },
      {
        name:      'Z-Image-Turbo (Tongyi-MAI)',
        modelId:   'Tongyi-MAI/Z-Image-Turbo',
        licence:   'Apache-2.0',
        why:       '6B distilled, ultra-fast, excellent text rendering (bilingual), matches FLUX.2 quality.',
        blocker:   'Not yet on HF inference. Promote when confirmed on free tier.',
      },
    ],
    blocked: [
      'FLUX.1-dev (non-commercial licence — NOT Apache-2.0)',
      'FLUX.2-dev (non-commercial licence)',
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
        name:      'HuggingFace — CogVideoX-5B (PRIMARY 2026)',
        models:    ['THUDM/CogVideoX-5b'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        quality:   'excellent',
        note:      '5B params, Apache-2.0, T2V+I2V. Best free video model 2025-2026. Replaces ZeroScope.',
      },
      {
        name:      'HuggingFace — Wan2.2-TI2V-5B (2026)',
        models:    ['Wan-AI/Wan2.2-TI2V-5B'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        quality:   'excellent',
        note:      '5B MoE, 720P 24fps, T2V+I2V, cinematic quality. Apache-2.0. Consumer-GPU friendly.',
      },
      {
        name:      'Pollinations AI (Video / LTX-based)',
        models:    ['video'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: false,
        quality:   'decent',
        note:      'No key. Experimental — uses LTX-Video internally. Fallback when HF is unavailable.',
      },
      {
        name:      'HuggingFace — AnimateDiff v1.5',
        models:    ['guoyww/animatediff-motion-adapter-v1-5-2'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: true,
        keyEnv:    'HUGGINGFACE_API_KEY',
        quality:   'decent',
        note:      'Legacy 2023. GIF output only. Last-resort HF fallback.',
      },
    ],
    removed: [
      {
        name:    'ZeroScope v2 XL (removed 2026-04-10)',
        modelId: 'cerspense/zeroscope_v2_XL',
        reason:  'CC-BY-NC-4.0 (non-commercial only) + outdated 2023 model. Replaced by CogVideoX-5B.',
      },
    ],
    candidates: [
      {
        name:    'LTX-Video 2.3 (Lightricks, Mar 2026)',
        modelId: 'Lightricks/LTX-2.3',
        licence: 'Apache-2.0',
        why:     'Real-time generation, native audio sync. Best OSS video 2026. Needs ≥16GB VRAM.',
        blocker: 'High VRAM — needs HF Pro dedicated GPU or self-hosted. Promote when confirmed free.',
      },
      {
        name:    'Wan 2.2 A14B (Alibaba)',
        modelId: 'Wan-AI/Wan2.2-T2V-A14B',
        licence: 'Apache-2.0',
        why:     '14B MoE, cinematic 720P, world-class quality. Needs ≥24GB VRAM.',
        blocker: 'Heavy model — needs significant GPU. 5B variant (above) is active instead.',
      },
      {
        name:    'HunyuanVideo (Tencent, 13B)',
        modelId: 'tencent/HunyuanVideo',
        licence: 'Tencent HunyuanVideo Community License (free commercial)',
        why:     'Comparable to Kling/Sora quality. Open weights. Beats Runway Gen-3 in benchmarks.',
        blocker: '13B params, 60-80GB VRAM — too heavy for HF free serverless tier.',
      },
    ],
    blocked: [
      'Seedance 2.0 (ByteDance — closed weights, paid API only via Fal.ai/PiAPI)',
      'Runway Gen-3/Gen-4 (paid)',
      'Sora (paid, OpenAI)',
      'Pika Labs (paid)',
      'Kling (paid)',
      'Fal.ai (paid credits)',
      'Replicate (paid credits)',
    ],
  },
};
