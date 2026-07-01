/**
 * HOLLY Media Generator — 100% Free, Open-Source, Zero Token Cost
 *
 * ═══════════════════════════════════════════════════════════════════
 * HUGGINGFACE BILLING REALITY (verified 2026-04-10):
 *
 *   HF Pro ($9/month) covers:
 *     • ZeroGPU quota (25 min H200/day) — for Spaces apps only
 *     • 1TB private / 11.2TB public storage
 *     • Higher Hub API rate limits
 *
 *   "Inference Usage $0.00 / $2.00" on the billing page means:
 *     → You have used $0 of a $2.00 PAY-AS-YOU-GO threshold.
 *     → The $2.00 is NOT money you own or have deposited.
 *     → It is the point at which HF would START billing your card.
 *     → Credits balance shows $0.00 separately — that IS zero real credits.
 *
 *   OWNER DECISION: No HF inference API calls. Zero. Ever.
 *     → HF_INFERENCE_ENABLED=false is the permanent setting.
 *     → All images and video are served by Pollinations ($0, no account).
 *     → Do NOT enable Automatic Recharge on HF billing settings.
 *
 *   HOLLY'S POLICY:
 *   ────────────────────────────────────────────────────────
 *   HF_INFERENCE_ENABLED=false  ← PERMANENT DEFAULT — NO HF BILLING EVER
 *     → All HF inference calls are completely skipped
 *     → Pollinations handles all images ($0, Apache-2.0, no account needed)
 *     → Pollinations handles all video ($0, no account needed)
 *
 *   HF_INFERENCE_ENABLED=true   ← DO NOT USE (risks pay-as-you-go charges)
 *     → Only set this if you explicitly want to risk HF billing
 *
 * ═══════════════════════════════════════════════════════════════════
 * IMAGE providers (waterfall, best-first):
 *   PRIMARY (HF_INFERENCE_ENABLED=false — PERMANENT DEFAULT):
 *   1. Modal.com — Z-Image-Turbo (T4 GPU, $30/mo free credits, Apache-2.0)
 *   2. Pollinations AI — FLUX.1-schnell (no key, Apache-2.0, $0 forever)
 *   3. Pollinations AI — retry with new seed (final safety net)
 *
 *   DISABLED (HF_INFERENCE_ENABLED=true — DO NOT USE):
 *   Would add: HF FLUX.2-klein, HF FLUX.1-schnell, HF SDXL
 *   (skipped permanently to avoid pay-as-you-go billing)
 *
 * VIDEO providers (waterfall, best-first):
 *   PRIMARY:
 *   1. Modal.com — Wan2.2-TI2V-5B (A10G GPU, $30/mo free credits, Apache-2.0)
 *   2. Pollinations AI — LTX-Video based (no key, $0 forever)
 *
 *   FALLBACK (HF_INFERENCE_ENABLED=true — opt-in only):
 *   HF CogVideoX-5B, HF Wan2.2-TI2V-5B, HF AnimateDiff
 *
 * ALBUM COVER — same as image waterfall
 *
 * ═══════════════════════════════════════════════════════════════════
 * LICENCE ACCURACY (verified 2026-04-10):
 *   FLUX.1-schnell      → Apache-2.0 ✅ (commercial-safe, Black Forest Labs)
 *   FLUX.2-klein        → Apache-2.0 ✅ (Jan 2026, 4B/9B, sub-second gen)
 *   FLUX.2-dev          → FLUX Non-Commercial License ❌ NOT used (32B)
 *   FLUX.1-dev          → FLUX Non-Commercial License ❌ NOT used
 *   SDXL 1.0            → Apache-2.0 ✅ (Stability AI)
 *   CogVideoX-5B        → Apache-2.0 ✅ (THUDM, best free video 2025-2026)
 *   Wan2.2-TI2V-5B      → Apache-2.0 ✅ (Alibaba, 720P, T2V + I2V)
 *   AnimateDiff         → Apache-2.0 ✅
 *   ZeroScope v2        → CC-BY-NC-4.0 ⚠️ REMOVED (non-commercial only)
 *   Pollinations        → serves FLUX.1-schnell via free API ✅
 *   HunyuanVideo        → Tencent License ⚠️ (free commercial, 60-80GB VRAM)
 *
 * ═══════════════════════════════════════════════════════════════════
 * HF API URL (as of late 2025):
 *   NEW (active):     https://router.huggingface.co/hf-inference/models/{model}
 *   OLD (deprecated): https://api-inference.huggingface.co/models/{model}
 *
 * BOTTOM LINE:
 *   - $9/mo HF Pro = storage + ZeroGPU Spaces + rate limits. That is ALL.
 *   - "$2.00" on billing page = pay-as-you-go threshold, NOT a credit balance.
 *   - HF_INFERENCE_ENABLED=false = zero HF API calls = zero extra charges ever.
 *   - Pollinations is the only media provider. It is $0, always, no account.
 *   - DO NOT enable Automatic Recharge: https://huggingface.co/settings/billing
 *
 * ═══════════════════════════════════════════════════════════════════
 * MODAL.COM (free $30/mo compute credits — HF Pro cancelled):
 *   Modal Starter gives $30/month real GPU credits, billed by the second.
 *   GPU rates: T4 $0.000164/s, A10G $0.000306/s ($1.10/hr), A100 $0.001036/s
 *   Hard spend cap can be set on Modal account (unlike HF — no individual cap).
 *   Potential uses:
 *     • CogVideoX-5B on A10G → ~2 min/video → ~$0.037/video → ~800 videos/mo FREE
 *     • Wan2.2-TI2V-5B on A10G → ~5 min/video → ~$0.092/video → ~325 videos/mo FREE
 *     • FLUX.1-schnell image → <1s on T4 → ~$0.0002/image → ~150,000 images/mo FREE
 *   To enable: create a new Modal deployment endpoint (see services/modal-media/ for templates).
 *   Modal account is already set up (iamhollywoodpro workspace).
 *
 * MODEL QUALITY RANKING 2026 (verified research):
 *   IMAGE:  FLUX.2-klein 4B > FLUX.1-schnell > SDXL 1.0
 *           Qwen-Image-2.0 (20B, Apache-2.0, 2K native, unified gen+edit) — not yet on free API
 *   VIDEO:  Wan2.2 > LTX-Video 2.3 > CogVideoX-5B > AnimateDiff (GIF only)
 *           HunyuanVideo (13B) — commercial-safe but needs 60-80GB VRAM (too heavy for free tier)
 *
 * NEVER USE:
 *   Midjourney, DALL-E, Imagen, Runway (paid), Sora, Pika, Kling,
 *   Fal.ai (paid credits), Replicate (paid credits), Adobe Firefly,
 *   Seedance 2.0 (ByteDance — closed weights, paid API only)
 * EXCEPTION: Suno V5.5 is the ONLY paid API — music only, already configured.
 */

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageStyle = 'realistic' | 'artistic' | 'anime' | 'digital-art' | 'photographic' | 'cinematic';
export type ImageModel = 'flux-dev' | 'flux-schnell' | 'flux2-klein' | 'sdxl' | 'turbo' | 'z-image-turbo' | 'auto';
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

// ─── Modal.com GPU Endpoints (optional — uses $30/mo free credits) ────────────
//
// Set these in Coolify after deploying services/modal-media/:
//   MODAL_IMAGE_URL=https://iamhollywoodpro--holly-image-generate.modal.run
//   MODAL_VIDEO_URL=https://iamhollywoodpro--holly-video-generate.modal.run
//
// When set: Modal is used FIRST (GPU quality, ~$0.0001/image, ~$0.028/video)
// When not set: Pollinations is used (always free, decent quality)
//
// Note: Modal GPU media services are deployed separately in services/modal-media/

const MODAL_IMAGE_URL = process.env.MODAL_IMAGE_URL || '';  // set after deploying image_generate.py
const MODAL_VIDEO_URL = process.env.MODAL_VIDEO_URL || '';  // set after deploying video_generate.py

// ─── Holly FLUX.2 Klein 9B + LoRA endpoint (self-portraits with consistent face) ──
// L4 endpoint (legacy backup) — source archived from repo during cleanup (Tier 2)
// FLUX.2 Klein 9B BF16 + Holly Face v2.0 LoRA on L4 GPU (24GB)
// Only spins up when generating images OF Holly (h0lly trigger word detected)
// Cost: ~$0.001/image (4 steps!) | barely touches the $30/mo free budget
const MODAL_HOLLY_LORA_URL = process.env.MODAL_HOLLY_LORA_URL || process.env.MODAL_SDXL_LORA_URL || '';
const HOLLY_TRIGGER_WORD = 'h0lly';

/** Check if a prompt is requesting Holly's likeness */
function isHollySelfPortrait(prompt: string): boolean {
  return prompt.toLowerCase().includes(HOLLY_TRIGGER_WORD);
}

// ─── HuggingFace Inference Gate ─────────────────────────────────────────────
//
// HF_INFERENCE_ENABLED=false (DEFAULT — PERMANENT)
//   Owner decision: no HF inference API calls, ever.
//   The $2.00 shown on HF billing is a pay-as-you-go threshold — NOT a credit.
//   We do not want any pay-as-you-go charges. Pollinations handles everything.
//
// HF_INFERENCE_ENABLED=true (DO NOT SET — risks pay-as-you-go billing)

const HF_INFERENCE_ENABLED = process.env.HF_INFERENCE_ENABLED === 'true'; // default: false — NO HF billing ever
const HF_SPENDING_SAFE      = process.env.HF_SPENDING_SAFE !== 'false';   // default: true (safety net if somehow enabled)

/** Sentinel error — thrown when HF is out of credits and spending-safe is on */
class HFCreditExhaustedError extends Error {
  constructor(details: string) {
    super(`HF credits exhausted (spending-safe ON — no pay-as-you-go): ${details}`);
    this.name = 'HFCreditExhaustedError';
  }
}

/**
 * Check an HF response for credit/payment errors.
 * HTTP 402 = payment required.
 * HTTP 429 with billing message = quota/credit exhausted.
 * Throws HFCreditExhaustedError when HF_SPENDING_SAFE=true so the
 * waterfall can skip ALL subsequent HF providers and go straight to free ones.
 */
function checkHFCreditError(status: number, body: string, model: string): void {
  if (!HF_SPENDING_SAFE) return; // user opted out — let it charge

  const bodyLower = body.toLowerCase();
  const isCreditError =
    status === 402 ||
    (status === 429 && (
      bodyLower.includes('credit') ||
      bodyLower.includes('quota') ||
      bodyLower.includes('billing') ||
      bodyLower.includes('payment') ||
      bodyLower.includes('insufficient')
    )) ||
    bodyLower.includes('you have exceeded') ||
    bodyLower.includes('credits exhausted') ||
    bodyLower.includes('billing limit') ||
    bodyLower.includes('payment required');

  if (isCreditError) {
    throw new HFCreditExhaustedError(`${model} HTTP ${status}: ${body.slice(0, 120)}`);
  }
}

// ─── Image Provider 0a: Holly FLUX.2 Klein 9B + LoRA v2.0 (self-portraits) ────
// Deployed from services/modal-media/image_generate_flux2klein_a100.py
// ONLY used when prompt contains 'h0lly' trigger word
// FLUX.2 Klein 9B BF16 + Holly Face v2.0 + Body v2.5 LoRA on Modal A100 GPU
// + dynamic specialist LoRAs (dildo, closeup, bent_over) per locked recipes

// Locked specialist LoRA recipes — proven PERFECT in R1-R8 testing (FACT.md).
// Files are on the holly-lora-weights Modal volume.
interface SpecialistRecipe {
  category: string;
  loras: Array<{ file: string; strength: number }>;
  reinforcement: string;  // appended to prompt — matches training caption vocabulary
}

// Limb anchor language (Smoke9 fix June 20): prevents Klein from rendering
// phantom 3rd/4th arms when hands aren't explicitly placed. Mandatory for
// any prompt where hands are positioned (dildo, spreading, etc.).
const LIMB_ANCHORS =
  'single woman, one body, one head, exactly two arms, exactly two legs, ' +
  'her arms attached at her shoulders, both hands visible in front of her body, ' +
  'both legs fully visible from hips to feet, exactly two feet, ten toes total, five toes on each foot';

// Categories ordered most-specific → least-specific (first match wins).
// Keyword selection is conservative to avoid false positives — specialist
// LoRAs only fire when the prompt clearly asks for that scenario.
function classifySpecialist(prompt: string): SpecialistRecipe | null {
  const p = prompt.toLowerCase();

  // CLOSEUP — pussy closeup (resting, no hands). PussyDiffusion specializes
  // in detailed genital geometry.
  //
  // Triggers on BOTH explicit closeup language AND natural body-part requests:
  //   - "closeup of pussy", "zoom on pussy"
  //   - "show me your pussy", "let me see her pussy", "i want to see her pussy"
  //   - "show pussy", "spread pussy"
  // The verb-based patterns catch what users actually say in chat. Without
  // these, "show me your pussy" was producing a generic standing nude because
  // no specialist LoRA fired.
  const CLOSEUP_VERB_PATTERNS = /\b(show me (your|her|us)|let me see (your|her)|want to see (your|her)|i want to see (your|her)|wanna see (your|her))\b.*\b(pussy|vulva|clit|labia)\b/;
  const CLOSEUP_EXPLICIT_PATTERNS = /\b(closeup|close-up|close up|zoom (in )?on|between her legs|pussy closeup|spread view|spread pussy|show pussy)\b/;
  if (CLOSEUP_VERB_PATTERNS.test(p) || CLOSEUP_EXPLICIT_PATTERNS.test(p)) {
    return {
      category: 'closeup',
      loras: [{ file: 'pussydiffusion-f2-klein-9b_v2.safetensors', strength: 1.0 }],
      reinforcement:
        'detailed pussy closeup, bald hairless pussy, smooth Brazilian wax, ' +
        'inner labia visible, clitoris visible at top, smooth bare mons pubis, ' +
        'anatomically correct vulva, photorealistic intimate detail, ' +
        'intimate camera distance, between her legs viewpoint, ' +
        'no hands in frame, resting pussy, no touching herself, ' +
        'sharp focus on anatomy, professional intimate photography',
    };
  }

  // BENT_OVER — rear view showing holes (no hands). Musubituner LoRA produces
  // perfect bent-over anus/vulva geometry. Match: bent over, on all fours,
  // doggy style, from behind (rear views only — not "looking back over shoulder").
  // Anti-clothing anchors + foot anchors are CRITICAL — the musubituner LoRA
  // at 1.0 can pull clothing onto the upper body, and Klein's known failure
  // mode for bent-over is duplicated/malformed feet (Smoke8 fix per FACT.md).
  if (/\b(bent over|bend over|on all fours|all fours|on her knees and|doggy|doggi|from behind|rear view|kneeling facing away)\b/.test(p)) {
    return {
      category: 'bent_over',
      loras: [{ file: 'femaleasshole-f2-klein-9b-musubituner.safetensors', strength: 1.0 }],
      reinforcement:
        'bent over forward at waist, legs shoulder-width apart, ' +
        'viewed from directly behind, camera positioned behind her, her back fully to camera, face not visible, ' +
        'her pussy and anus visible between her thighs and buttocks, ' +
        '1.5 inch perineum of skin between her vaginal opening and her anus, correct anatomical spacing, ' +
        'very large plump round butt filling the frame, thick full butt cheeks, ' +
        'smooth bare buttocks, bald hairless pussy from behind, ' +
        'completely topless, completely nude from behind, bare back, bare shoulders, ' +
        'no bra, no shirt, no top, no clothing on her upper body, no clothing anywhere, ' +
        'zero garments, bare skin from her neck to her ankles, ' +
        // Foot/leg anchors lifted from the SMOKE8-locked bent_over recipe —
        // Klein Distilled is notorious for duplicating or malformed feet in
        // rear-view poses without these explicit anchors.
        'exactly two legs, right leg on right side and left leg on left side, ' +
        'exactly two feet total, one left foot and one right foot, single pair of feet, ' +
        'only two feet in the entire image, five toes on each foot, ten toes total, ' +
        'both feet flat on the floor, feet pointing forward, natural foot pose from behind, ' +
        'both arms visible reaching from her shoulders, exactly two arms, ' +
        'both hands placed flat on the floor in front of her or resting on her thighs, ' +
        'correct human anatomy, proper body proportions, ' +
        'single camera angle from behind, not looking back over shoulder',
    };
  }

  // DILDO MASTURBATION — toy penetration, self-pleasure. FK LoRA @ 1.0.
  // Match: dildo/toy/vibrator + masturbation context.
  // ALSO: "masturbating" alone defaults to dildo because Klein Distilled
  // CANNOT render active finger penetration (confirmed R4-R8, FACT.md).
  // Without this default, "show me an image of you masturbating" produced a
  // standing nude because no LoRA fired and Klein has no fingering capability.
  // Critical anchors: BOTH feet must be positioned (flat on bed) and BOTH arms
  // must reach from shoulders with visible hand placement. Without these,
  // Klein drops or duplicates legs (R1-R8 limb failures per FACT.md).
  const hasToy = /\b(dildo|toy|vibrator|silicone shaft|glass rod)\b/.test(p);
  // \w* after masturbat so we catch "masturbating", "masturbates", "masturbate".
  // "yourself" added alongside "herself" so 2nd-person chat ("fuck yourself")
  // classifies the same as 3rd-person captions ("fucking herself").
  const hasMasturbate =
    /\b(masturbat\w*|fuck(ing|s)? (herself|yourself)|pleasuring herself|screwing herself|penetrat(e|ing|ion)|inside her (pussy|ass)|her pussy (with|using))\b/.test(p);
  // Default plain-"masturbating" to dildo path (with toy injected into prompt)
  if ((hasToy && hasMasturbate) || (hasMasturbate && !hasToy)) {
    return {
      category: 'dildo_masturbation',
      loras: [{ file: 'FK_dildoinsertion.safetensors', strength: 1.0 }],
      reinforcement:
        // Always include dildo in the reinforcement so when user said just
        // "masturbating", the prompt now has explicit toy language that the
        // FK LoRA was trained on.
        'using a glass dildo, dildo penetrating her pussy, shaft visibly entering her body, toy half buried inside her, ' +
        'her pussy visibly wet and aroused, translucent natural lubrication with slight creamy cloudiness, ' +
        'glistening wetness coating the toy shaft, slick moisture on her inner labia, ' +
        'lying on her back on white sheets, knees up and legs spread wide open, ' +
        'both legs visible reaching from her hips, both feet flat on the bed, ' +
        'right leg on right side and left leg on left side, ' +
        'exactly two feet, ten toes total, both feet planted firmly, ' +
        'both arms visible reaching from her shoulders, exactly two arms, ' +
        'her right hand holding the dildo, her left hand resting on the bed beside her hip or on her stomach, ' +
        'both hands visible in front of her body, looking down at the penetration, ' +
        'lips parted in pleasure, explicit intimate detail',
    };
  }

  // DILDO ALONE — toy present but no masturbation context (e.g., "holding dildo").
  if (hasToy) {
    return {
      category: 'dildo',
      loras: [{ file: 'FK_dildoinsertion.safetensors', strength: 1.0 }],
      reinforcement:
        'holding a dildo, realistic silicone toy visible, ' +
        LIMB_ANCHORS + ', explicit intimate detail',
    };
  }

  return null;
}

async function generateWithHollyLoRA(req: ImageRequest): Promise<ImageResult> {
  if (!MODAL_HOLLY_LORA_URL) throw new Error('MODAL_HOLLY_LORA_URL not configured');

  const { width, height } = getDimensions(req.aspectRatio, { width: req.width, height: req.height });

  // Detect specialist scenario and append reinforcement language + dynamic LoRA.
  // Specialist LoRAs are layered ON TOP of the baked face+body via set_adapters.
  const recipe = classifySpecialist(req.prompt);
  const finalPrompt = recipe
    ? `${req.prompt}, ${recipe.reinforcement}`
    : req.prompt;
  if (recipe) {
    console.info(`[MediaGen] Specialist LoRA: ${recipe.category} → ${recipe.loras.map(l => l.file).join(', ')}`);
  }

  const res = await fetch(MODAL_HOLLY_LORA_URL.replace(/\/$/, ''), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt:               finalPrompt,
      width:                Math.min(width, 1024),
      height:               Math.min(height, 1024),
      num_inference_steps:  20,        // Klein 9B needs 20+ steps for explicit detail
      guidance_scale:       1.2,       // Klein Distilled sweet spot (NOT 4.0 — over-guided)
      loras:                recipe?.loras,  // dynamic specialist LoRA stack
      seed:                 req.seed,
      format:               'jpeg',
      // Avatar-quality face enhancement: endpoint detects Holly's face and
      // re-renders it via the inpaint pipe with an 85mm-headshot prompt.
      // Default behavior when h0lly is in prompt; passes explicit true here
      // to make intent clear in request logs.
      enhance_face:         true,
    }),
    signal: AbortSignal.timeout(450_000),  // 7.5 min — generation + face inpaint pass + cold-start buffer
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Holly FLUX.2 Klein+LoRA error ${res.status}: ${body.slice(0, 200)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:image/jpeg;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'modal-flux2klein-lora',
    model:    recipe
      ? `FLUX.2 Klein 9B A100 + Face v2.0 + Body v2.5 + ${recipe.category}`
      : 'FLUX.2 Klein 9B A100 + Face v2.0 + Body v2.5',
    width,
    height,
    cost:     0,
    licence:  'Apache-2.0',
  };
}

// ─── Image Provider 0: Modal.com (GPU-quality, uses $30/mo free credits) ──────
// Deployed from services/modal-media/image_generate.py
// Model: Z-Image-Turbo on T4 GPU (Apache-2.0, 6B distilled, bilingual text rendering)
//   - 6B distilled model, matches FLUX.2 quality, excellent text rendering
//   - Optimal at 8 inference steps on T4 GPU
// Cost: ~$0.0001/image | $30/mo free = ~300,000 images/mo
// Set MODAL_IMAGE_URL to enable

async function generateWithModal(req: ImageRequest): Promise<ImageResult> {
  if (!MODAL_IMAGE_URL) throw new Error('MODAL_IMAGE_URL not configured');

  const { width, height } = getDimensions(req.aspectRatio, { width: req.width, height: req.height });

  // Modal fastapi_endpoint URL is the full endpoint (no /generate path needed)
  const res = await fetch(MODAL_IMAGE_URL.replace(/\/$/, ''), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt:               req.prompt,
      width:                Math.min(width, 1024),
      height:               Math.min(height, 1024),
      num_inference_steps:  8,   // Z-Image-Turbo optimal
      seed:                 req.seed,
      format:               'jpeg',
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Modal image error ${res.status}: ${body.slice(0, 200)}`);
  }

  // Modal returns raw image bytes
  const arrayBuf = await res.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:image/jpeg;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'modal',
    model:    'Z-Image-Turbo (Modal GPU)',
    width,
    height,
    cost:     0,
    licence:  'Apache-2.0',
  };
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

  const pollinationsModel = req.model === 'sdxl' ? 'stable-diffusion-xl'
    : req.model === 'turbo' ? 'turbo'
    : 'flux';

  const url = pollinationsImageUrl(
    req.prompt,
    pollinationsModel,
    width,
    height,
    req.seed,
    req.enhance !== false,
  );

  const res = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
    headers: { 'User-Agent': 'HOLLY-AI/2.5' },
  });
  if (!res.ok) throw new Error(`Pollinations returned ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
    throw new Error(`Pollinations returned unexpected content type: ${contentType}`);
  }

  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength < 1000) {
    throw new Error(`Pollinations returned empty or tiny image (${arrayBuf.byteLength} bytes)`);
  }

  const base64  = Buffer.from(arrayBuf).toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  return {
    url:      dataUri,
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
    checkHFCreditError(res.status, body, 'FLUX.2-klein');
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
    checkHFCreditError(res.status, body, model);
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
 *
 * DEFAULT (HF_INFERENCE_ENABLED=false):
 *   Pollinations only — FLUX.1-schnell, $0 forever, no account needed.
 *
 * OPT-IN (HF_INFERENCE_ENABLED=true):
 *   Pollinations → HF FLUX.2-klein → HF FLUX.1-schnell → HF SDXL
 *   Credit-safe: if HF returns 402/billing error, all HF calls are skipped
 *   and Pollinations is retried as final safety net.
 */
export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const errors: string[] = [];
  let hfCreditExhausted = false;

  // -1. Holly self-portrait: FLUX.2 Klein 9B + LoRA v2.0 (consistent face, h0lly trigger)
  //     If this fails, DO NOT fall back to Z-Image-Turbo or Pollinations — those models
  //     are censored and will produce a "clothed Holly" imposter. Better to throw and
  //     let Holly tell Steve her body model is cold than show him a fake.
  if (isHollySelfPortrait(req.prompt) && MODAL_HOLLY_LORA_URL) {
    try {
      console.info('[MediaGen] Holly self-portrait detected — using FLUX.2 Klein 9B + LoRA v2.0');
      return await generateWithHollyLoRA(req);
    } catch (e) {
      const msg = (e as Error).message;
      errors.push(`Holly FLUX.2 Klein+LoRA: ${msg}`);
      console.warn('[MediaGen] Holly FLUX.2 Klein+LoRA failed:', msg);
      throw new Error(`Holly's body model is cold or unreachable: ${msg.slice(0, 120)}. Try again in 2-3 minutes — refusing to fall back to a censored model that would show Holly clothed.`);
    }
  }

  // 0. Modal.com (GPU quality, $0.0001/img from $30/mo free credits)
  //    Only tried when MODAL_IMAGE_URL is configured in env
  if (MODAL_IMAGE_URL) {
    try {
      return await generateWithModal(req);
    } catch (e) {
      errors.push(`Modal: ${(e as Error).message}`);
      console.warn('[MediaGen] Modal image failed, falling back:', (e as Error).message);
    }
  }

  // 1. Pollinations (no key — always free, always available, $0 forever)
  try {
    return await generateWithPollinations(req);
  } catch (e) {
    errors.push(`Pollinations: ${(e as Error).message}`);
    console.warn('[MediaGen] Pollinations failed:', (e as Error).message);
  }

  // HF providers — only attempted if HF_INFERENCE_ENABLED=true
  if (!HF_INFERENCE_ENABLED) {
    // HF is disabled (default) — no billing risk. Retry Pollinations with new seed.
    console.info('[MediaGen] HF inference disabled (HF_INFERENCE_ENABLED=false) — Pollinations only');
    try {
      return await generateWithPollinations({ ...req, seed: Math.floor(Math.random() * 99999) });
    } catch (e) {
      errors.push(`Pollinations retry: ${(e as Error).message}`);
    }
    throw new Error(`Image generation failed (Pollinations unavailable):\n${errors.join('\n')}`);
  }

  // 2. HuggingFace FLUX.2-klein 4B (opt-in, Apache-2.0, uses HF credit)
  if (!hfCreditExhausted) {
    try {
      return await generateWithHuggingFaceFlux2Klein(req);
    } catch (e) {
      if (e instanceof HFCreditExhaustedError) {
        hfCreditExhausted = true;
        errors.push(`HF credits exhausted — skipping all HF providers (spending-safe ON)`);
        console.warn('[MediaGen] HF credit exhausted — skipping remaining HF providers');
      } else {
        errors.push(`HF FLUX.2-klein: ${(e as Error).message}`);
        console.warn('[MediaGen] HF FLUX.2-klein failed:', (e as Error).message);
      }
    }
  }

  // 3. HuggingFace FLUX.1-schnell (skip if credits gone)
  if (!hfCreditExhausted) {
    try {
      return await generateWithHuggingFace({ ...req, model: 'flux-schnell' });
    } catch (e) {
      if (e instanceof HFCreditExhaustedError) {
        hfCreditExhausted = true;
        errors.push(`HF credits exhausted — skipping all HF providers (spending-safe ON)`);
        console.warn('[MediaGen] HF credit exhausted — skipping remaining HF providers');
      } else {
        errors.push(`HF FLUX.1-schnell: ${(e as Error).message}`);
        console.warn('[MediaGen] HF FLUX.1-schnell failed:', (e as Error).message);
      }
    }
  }

  // 4. HuggingFace SDXL (skip if credits gone)
  if (!hfCreditExhausted) {
    try {
      return await generateWithHuggingFace({ ...req, model: 'sdxl' });
    } catch (e) {
      if (e instanceof HFCreditExhaustedError) {
        hfCreditExhausted = true;
        errors.push(`HF credits exhausted — spending-safe ON, no pay-as-you-go`);
        console.warn('[MediaGen] HF credit exhausted on SDXL');
      } else {
        errors.push(`HF SDXL: ${(e as Error).message}`);
        console.warn('[MediaGen] HF SDXL failed:', (e as Error).message);
      }
    }
  }

  // 5. FINAL SAFETY NET: Pollinations retry — user always gets an image
  console.info('[MediaGen] HF path failed/exhausted — Pollinations final safety net');
  try {
    return await generateWithPollinations({ ...req, seed: Math.floor(Math.random() * 99999) });
  } catch (e) {
    errors.push(`Pollinations (final retry): ${(e as Error).message}`);
  }

  throw new Error(`All free image providers failed:\n${errors.join('\n')}`);
}

// ─── Video Provider 0: Modal.com Wan2.2-TI2V-5B (GPU quality, uses $30/mo credits) ─
// Deployed from services/modal-media/video_generate.py
// Model: Wan2.2-TI2V-5B on A10G GPU — cinematic 720P, T2V + I2V
// Cost: ~$0.092/video | $30/mo free = ~325 videos/mo
// Set MODAL_VIDEO_URL to enable

async function generateVideoWithModal(req: VideoRequest): Promise<VideoResult> {
  if (!MODAL_VIDEO_URL) throw new Error('MODAL_VIDEO_URL not configured');

  const { width, height } = getDimensions(req.aspectRatio);
  const duration = Math.min(Math.max(req.duration ?? 5, 2), 10);
  const fps      = req.fps ?? 24;  // Wan2.2 outputs 24fps

  // Modal fastapi_endpoint URL is the full endpoint (no /generate path needed)
  const res = await fetch(MODAL_VIDEO_URL.replace(/\/$/, ''), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt:              req.prompt,
      duration,
      fps,
      width:               Math.min(width, 1280),  // Wan2.2 supports 720P = 1280x720
      height:              Math.min(height, 720),
      num_inference_steps: 50,
      ...(req.inputImage && { input_image: req.inputImage }),
    }),
    signal: AbortSignal.timeout(300_000),  // 5 min — video takes time even on GPU
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Modal video error ${res.status}: ${body.slice(0, 200)}`);
  }

  // Modal returns raw MP4 bytes
  const arrayBuf = await res.arrayBuffer();
  const base64   = Buffer.from(arrayBuf).toString('base64');
  const dataUri  = `data:video/mp4;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'modal',
    model:    'Wan2.2-TI2V-5B (Modal A10G)',
    duration,
    fps,
    format:   'mp4',
    cost:     0,
    licence:  'Apache-2.0',
  };
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
    checkHFCreditError(res.status, body, 'CogVideoX-5B');
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
    checkHFCreditError(res.status, bodyText, 'Wan2.2-TI2V-5B');
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
  const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Math.floor(Math.random() * 99999)}`;

  const res = await fetch(pollUrl, {
    signal: AbortSignal.timeout(120_000),
    headers: { 'User-Agent': 'HOLLY-AI/2.5' },
  });
  if (!res.ok) throw new Error(`Pollinations video/image returned ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
    throw new Error(`Pollinations returned unexpected content type: ${contentType}`);
  }

  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength < 1000) {
    throw new Error(`Pollinations returned empty data (${arrayBuf.byteLength} bytes)`);
  }

  const base64  = Buffer.from(arrayBuf).toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  return {
    url:      dataUri,
    provider: 'pollinations',
    model:    'Pollinations (FLUX-based visual)',
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

  if (!res.ok) {
    const body = await res.text();
    checkHFCreditError(res.status, body, 'AnimateDiff');
    throw new Error(`HF AnimateDiff error ${res.status}: ${body.slice(0, 200)}`);
  }

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
 *
 * DEFAULT (HF_INFERENCE_ENABLED=false):
 *   Pollinations video only — LTX-Video based, $0 forever, no account needed.
 *
 * OPT-IN (HF_INFERENCE_ENABLED=true):
 *   HF CogVideoX-5B → HF Wan2.2 → Pollinations Video → HF AnimateDiff (GIF)
 *   Credit-safe: HF credit errors skip all remaining HF calls immediately.
 */
export async function generateVideo(req: VideoRequest): Promise<VideoResult> {
  const errors: string[] = [];
  let hfCreditExhausted = false;

  // 0. Modal.com Wan2.2-TI2V-5B (GPU quality, $0.092/video from $30/mo free credits)
  //    Only tried when MODAL_VIDEO_URL is configured in env
  if (MODAL_VIDEO_URL) {
    try {
      return await generateVideoWithModal(req);
    } catch (e) {
      errors.push(`Modal: ${(e as Error).message}`);
      console.warn('[MediaGen] Modal video failed, falling back:', (e as Error).message);
    }
  }

  // HF video providers — only if HF_INFERENCE_ENABLED=true
  if (HF_INFERENCE_ENABLED) {
    // 1. CogVideoX-5B (best Apache-2.0 video 2025-2026)
    if (!hfCreditExhausted) {
      try {
        return await generateVideoWithCogVideoX(req);
      } catch (e) {
        if (e instanceof HFCreditExhaustedError) {
          hfCreditExhausted = true;
          errors.push(`HF credits exhausted — skipping HF video providers (spending-safe ON)`);
          console.warn('[MediaGen] HF credit exhausted — skipping remaining HF video providers');
        } else {
          errors.push(`CogVideoX-5B: ${(e as Error).message}`);
          console.warn('[MediaGen] CogVideoX-5B failed:', (e as Error).message);
        }
      }
    }

    // 2. Wan2.2-TI2V-5B (cinematic 720P, T2V+I2V — skip if credits gone)
    if (!hfCreditExhausted) {
      try {
        return await generateVideoWithWan22(req);
      } catch (e) {
        if (e instanceof HFCreditExhaustedError) {
          hfCreditExhausted = true;
          errors.push(`HF credits exhausted — skipping HF video providers (spending-safe ON)`);
          console.warn('[MediaGen] HF credit exhausted on Wan2.2');
        } else {
          errors.push(`Wan2.2-TI2V-5B: ${(e as Error).message}`);
          console.warn('[MediaGen] Wan2.2 failed:', (e as Error).message);
        }
      }
    }
  } else {
    console.info('[MediaGen] HF inference disabled (HF_INFERENCE_ENABLED=false) — Pollinations video only');
  }

  // 3. Pollinations video (no key, ALWAYS FREE — tried regardless of HF setting)
  try {
    return await generateVideoWithPollinations(req);
  } catch (e) {
    errors.push(`Pollinations Video: ${(e as Error).message}`);
    console.warn('[MediaGen] Pollinations video failed:', (e as Error).message);
  }

  // 4. AnimateDiff GIF fallback — only if HF enabled and credits still available
  if (HF_INFERENCE_ENABLED && !hfCreditExhausted) {
    try {
      return await generateAnimatedGifWithHuggingFace(req);
    } catch (e) {
      if (e instanceof HFCreditExhaustedError) {
        errors.push(`HF credits exhausted — no AnimateDiff fallback (spending-safe ON)`);
        console.warn('[MediaGen] HF credit exhausted on AnimateDiff');
      } else {
        errors.push(`HF AnimateDiff: ${(e as Error).message}`);
        console.warn('[MediaGen] HF AnimateDiff failed:', (e as Error).message);
      }
    }
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

/** Exported status flags for health checks & settings UI */
export const HF_COST_SAFE_MODE     = HF_SPENDING_SAFE;
export const HF_INFERENCE_ACTIVE   = HF_INFERENCE_ENABLED;

export const MEDIA_PROVIDERS = {
  image: {
     active: [
       {
         name:      'Modal.com — Z-Image-Turbo (T4 GPU) [BEST — deploy first]',
         models:    ['Z-Image-Turbo'],
         licence:   'Apache-2.0',
         free:      true,
         keyNeeded: false,
         envVar:    'MODAL_IMAGE_URL',
         deployCmd: 'cd services/modal-media && modal deploy image_generate.py',
         quality:   'excellent',
         cost:      '~$0.0001/image | $30/mo free = ~300,000 images/mo',
         note:      'GPU-quality Z-Image-Turbo on YOUR Modal account. Set MODAL_IMAGE_URL after deploying.',
       },
      {
        name:      'Pollinations AI (FLUX.1-schnell) [DEFAULT fallback]',
        models:    ['FLUX.1-schnell', 'SDXL', 'Turbo'],
        licence:   'Apache-2.0',
        free:      true,
        keyNeeded: false,
        quality:   'excellent',
        note:      'No key needed. Free forever. Used when MODAL_IMAGE_URL is not set.',
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
        name:      'FLUX.1-schnell on Modal.com',
        modelId:   'black-forest-labs/FLUX.1-schnell',
        licence:   'Apache-2.0',
        why:       'Modal A10G: ~$0.0002/image. $30/mo free credits = ~150,000 images free. Sub-second on GPU.',
        blocker:   'Needs Modal deployment (see services/modal-media/ for template). Account ready.',
      },
      {
        name:      'Qwen-Image-2.0 (Alibaba, 20B)',
        modelId:   'Qwen/Qwen-Image',
        licence:   'Apache-2.0',
        why:       '20B MMDiT, 2K native resolution, unified generation+editing, excellent text rendering.',
        blocker:   'Not yet on HF free inference API. Available via paid API (~$0.021/image). Skip for now.',
      },
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
        why:       '6B distilled, ultra-fast, excellent text rendering (bilingual), matches FLUX.2 quality. Now active via Modal.',
        blocker:   'Active via Modal. HF inference available as fallback when confirmed on free tier.',
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
         name:      'Modal.com — Wan2.2-TI2V-5B (A10G GPU) [BEST — deploy first]',
         models:    ['Wan-AI/Wan2.2-TI2V-5B'],
         licence:   'Apache-2.0',
         free:      true,
         keyNeeded: false,
         envVar:    'MODAL_VIDEO_URL',
         deployCmd: 'cd services/modal-media && modal deploy video_generate.py',
         quality:   'excellent',
         cost:      '~$0.092/video | $30/mo free = ~325 videos/mo',
         note:      'GPU-quality Wan2.2-TI2V-5B on YOUR Modal account. Set MODAL_VIDEO_URL after deploying.',
       },
       {
         name:      'HuggingFace — CogVideoX-5B (FALLBACK)',
         models:    ['THUDM/CogVideoX-5b'],
         licence:   'Apache-2.0',
         free:      true,
         keyNeeded: true,
         keyEnv:    'HUGGINGFACE_API_KEY',
         quality:   'excellent',
         note:      '5B, T2V+I2V, cinematic quality. Apache-2.0. Fallback when Modal unavailable.',
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
         name:    'CogVideoX-5B on Modal.com (FALLBACK)',
         modelId: 'THUDM/CogVideoX-5b',
         licence: 'Apache-2.0',
         why:     'Modal A10G: ~2 min/video → $0.037/video. $30/mo free = ~800 videos FREE. Apache-2.0.',
         blocker: 'Needs separate Modal endpoint deployment. Currently HF-only fallback.',
       },
       {
         name:    'LTX-Video 2.3 (Lightricks, Mar 2026)',
        modelId: 'Lightricks/LTX-2.3',
        licence: 'Apache-2.0',
        why:     'Real-time generation, native audio sync. Best OSS video 2026. Needs ≥16GB VRAM.',
        blocker: 'High VRAM — needs Modal A10G (48GB) or L40S. Fast once deployed.',
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
        blocker: '13B params, 60-80GB VRAM — too heavy for HF free serverless. Possible on Modal L40S.',
      },
    ],
    blocked: [
      'Seedance 2.0 (ByteDance — closed weights, paid API only via Fal.ai/PiAPI)',
      'Kling (paid API — free web tier only, no API)',
      'Runway Gen-3/Gen-4 (paid)',
      'Sora (paid, OpenAI)',
      'Pika Labs (paid)',
      'Kling (paid)',
      'Fal.ai (paid credits)',
      'Replicate (paid credits)',
    ],
  },
};
