/**
 * Holly Media Tool — the create_holly_media function.
 *
 * Holly (or the user) calls this with creative intent.
 * The backend resolves it to the correct LoRA stack, reference photo,
 * ControlNet settings, and generation pipeline.
 *
 * Holly NEVER chooses filenames. She chooses meaning (action_id, framing, etc).
 * The backend chooses: exact LoRA files, weights, references, settings.
 */

import { ActionEntry, GENERATION_SETTINGS, matchAction, getAction } from './action-registry';

const MODAL_CONTROLNET_URL = process.env.MODAL_CONTROLNET_URL || process.env.MODAL_HOLLY_LORA_URL || '';
const MODAL_GENERATE_URL = process.env.MODAL_HOLLY_LORA_URL || '';

export interface HollyMediaRequest {
  type: 'image' | 'video';
  /** What Holly/user wants — natural language */
  request: string;
  /** Approved action identifier from the registry */
  action_id?: string;
  /** Framing */
  framing?: 'selfie' | 'portrait' | 'half_body' | 'full_body';
  /** Facial expression */
  expression?: string;
  /** Clothing/wardrobe (for SFW) */
  wardrobe?: string;
  /** Setting/location */
  setting?: string;
  /** Seed for reproducibility (random if not provided) */
  seed?: number;
  /** Whether this was initiated by Holly or the user */
  initiated_by?: 'user' | 'holly';
}

export interface HollyMediaResult {
  url: string;        // data:image/png;base64,... or data:video/mp4;base64,...
  provider: string;
  action_id: string;
  seed: number;
  lora_stack: string[];
  prompt_used: string;
  success: boolean;
  error?: string;
}

/**
 * Create Holly media (image or video).
 *
 * This is the single entry point Holly should call.
 * The backend handles all asset selection, LoRA routing, and generation.
 */
export async function createHollyMedia(req: HollyMediaRequest): Promise<HollyMediaResult> {
  const seed = req.seed ?? Math.floor(Math.random() * 999_999_999);

  // Resolve the action — either from explicit action_id or by matching the request
  let action: ActionEntry | null = null;

  if (req.action_id) {
    action = getAction(req.action_id);
    if (!action) {
      return errorResult(`Unknown action_id: ${req.action_id}`, req.action_id, seed);
    }
  } else {
    action = matchAction(req.request);
    // Default to SFW if no action matched
    if (!action) {
      action = getAction('sfw_clothed')!;
    }
  }

  // Build the generation prompt from structured parameters
  const prompt = buildPrompt(req, action);

  // Build the LoRA stack: [action LoRA @ 0.7] → [combined-v1 @ 1.0 LAST]
  const loraStack = buildLoRAStack(action);

  // Generate
  if (req.type === 'video') {
    return generateVideo(req, action, prompt, loraStack, seed);
  }

  return generateImage(req, action, prompt, loraStack, seed);
}

/**
 * Build the generation prompt from structured parameters.
 * Trigger words + scene description. No anatomy anchors for actions.
 */
function buildPrompt(req: HollyMediaRequest, action: ActionEntry): string {
  const parts: string[] = ['h0lly, h0lly-body'];

  // Action trigger fragment
  if (action.prompt_fragment) {
    parts.push(action.prompt_fragment);
  }

  // User's request (their specific intent)
  if (req.request) {
    parts.push(req.request);
  }

  // Framing
  if (req.framing === 'selfie' || req.framing === 'portrait') {
    parts.push('looking at camera');
  }

  // Expression
  if (req.expression) {
    parts.push(req.expression);
  }

  // Wardrobe (for SFW — must be explicitly clothed)
  if (action.action_id === 'sfw_clothed' && req.wardrobe) {
    parts.push(`wearing ${req.wardrobe}`);
  } else if (action.is_nsfw) {
    parts.push('nude');
  }

  // Setting
  if (req.setting) {
    parts.push(req.setting);
  }

  return parts.join(', ');
}

/**
 * Build the LoRA stack for ComfyUI.
 * Order: [action LoRA first] → [combined-v1 LAST = strongest influence]
 */
function buildLoRAStack(action: ActionEntry): Array<{ name: string; strength: number }> {
  const stack: Array<{ name: string; strength: number }> = [];

  // Action LoRA first (if any)
  if (action.image_lora && action.image_lora_weight > 0) {
    stack.push({ name: action.image_lora, strength: action.image_lora_weight });
  }

  // Identity LoRA LAST — always
  stack.push({ name: GENERATION_SETTINGS.identity_lora, strength: GENERATION_SETTINGS.identity_weight });

  return stack;
}

/**
 * Generate an image via the ComfyUI ControlNet or text-only endpoint.
 */
async function generateImage(
  req: HollyMediaRequest,
  action: ActionEntry,
  prompt: string,
  loraStack: Array<{ name: string; strength: number }>,
  seed: number,
): Promise<HollyMediaResult> {
  try {
    if (action.use_controlnet && action.reference_category && MODAL_CONTROLNET_URL) {
      // ControlNet path: pick a random reference photo from the category
      const refPath = pickReferencePhoto(action.reference_category);

      const body = JSON.stringify({
        pose_skeleton: refPath,
        prompt,
        width: GENERATION_SETTINGS.width,
        height: GENERATION_SETTINGS.height,
        seed,
        controlnet_strength: action.controlnet_strength,
        steps: GENERATION_SETTINGS.steps,
        cfg: GENERATION_SETTINGS.cfg,
        loras: loraStack,
      });

      const res = await fetch(MODAL_CONTROLNET_URL.replace(/\/$/, ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(500_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`ControlNet error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      const dataUri = `data:image/png;base64,${base64}`;

      return {
        url: dataUri,
        provider: 'modal-comfyui-klein-controlnet',
        action_id: action.action_id,
        seed,
        lora_stack: loraStack.map(l => l.name),
        prompt_used: prompt,
        success: true,
      };
    } else {
      // Text-only path (SFW, nude poses, no ControlNet)
      const body = JSON.stringify({
        prompt,
        width: GENERATION_SETTINGS.width,
        height: GENERATION_SETTINGS.height,
        seed,
        steps: GENERATION_SETTINGS.steps,
        cfg: GENERATION_SETTINGS.cfg,
        loras: loraStack,
        disable_routing: true,
      });

      const res = await fetch(MODAL_GENERATE_URL.replace(/\/$/, ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(500_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Generate error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      const dataUri = `data:image/png;base64,${base64}`;

      return {
        url: dataUri,
        provider: 'modal-comfyui-klein',
        action_id: action.action_id,
        seed,
        lora_stack: loraStack.map(l => l.name),
        prompt_used: prompt,
        success: true,
      };
    }
  } catch (e) {
    return {
      url: '',
      provider: 'modal-comfyui-klein',
      action_id: action.action_id,
      seed,
      lora_stack: loraStack.map(l => l.name),
      prompt_used: prompt,
      success: false,
      error: (e as Error).message,
    };
  }
}

/**
 * Generate a video: first create a still image, then animate it via HunyuanVideo I2V.
 */
async function generateVideo(
  req: HollyMediaRequest,
  action: ActionEntry,
  prompt: string,
  loraStack: Array<{ name: string; strength: number }>,
  seed: number,
): Promise<HollyMediaResult> {
  const videoI2vUrl = process.env.MODAL_VIDEO_I2V_URL || '';

  if (!videoI2vUrl) {
    return errorResult('Video I2V endpoint not configured', action.action_id, seed);
  }

  try {
    // Step 1: Generate a still image first
    const imageResult = await generateImage(req, action, prompt, loraStack, seed);
    if (!imageResult.success) {
      return errorResult(`Image generation failed: ${imageResult.error}`, action.action_id, seed);
    }

    // Step 2: Animate via HunyuanVideo I2V
    const videoBody = JSON.stringify({
      image_url: imageResult.url,
      prompt: req.request || 'subtle natural motion',
      duration: 2,
      fps: 24,
    });

    const videoRes = await fetch(videoI2vUrl.replace(/\/$/, ''), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: videoBody,
      signal: AbortSignal.timeout(600_000),
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      throw new Error(`Video I2V error ${videoRes.status}: ${errText.slice(0, 200)}`);
    }

    const videoBuf = await videoRes.arrayBuffer();
    const videoBase64 = Buffer.from(videoBuf).toString('base64');
    const videoDataUri = `data:video/mp4;base64,${videoBase64}`;

    return {
      url: videoDataUri,
      provider: 'modal-hunyuanvideo-i2v',
      action_id: action.action_id,
      seed,
      lora_stack: loraStack.map(l => l.name),
      prompt_used: prompt,
      success: true,
    };
  } catch (e) {
    return {
      url: '',
      provider: 'modal-hunyuanvideo-i2v',
      action_id: action.action_id,
      seed,
      lora_stack: loraStack.map(l => l.name),
      prompt_used: prompt,
      success: false,
      error: (e as Error).message,
    };
  }
}

/**
 * Pick a random reference photo from a category on the Modal volume.
 * Returns a path like "action-refs/01_dildo_pussy/01_dildo_pussy.webp"
 *
 * NOTE: This currently returns a generic path. Phase 2 (reference selector)
 * will make this intelligent — ranking by pose, angle, framing.
 */
function pickReferencePhoto(category: string): string {
  // For now, return the category directory path.
  // The ControlNet endpoint will need a specific filename.
  // Phase 2 will list the directory and pick intelligently.
  // For now, the caller (chat route) will need to provide a specific ref,
  // or we hardcode known files per category.

  // Known first file per category (from volume listing)
  const knownFiles: Record<string, string> = {
    '01_dildo_pussy': 'action-refs/01_dildo_pussy/01_dildo_pussy.webp',
    '02_fingering_pussy': 'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_09.png',
    '03_masturbating': 'action-refs/03_masturbating/01_rubbing_clit.png',
    '04_spreading': 'action-refs/04_spreading/spreading_01.png',
    '05_anal_fingering': 'action-refs/05_anal_fingering/anal_fingering_01.png',
    '06_anal_dildo': 'action-refs/06_anal_dildo/anal_dildo_01.png',
    '07_food_insertion': 'action-refs/07_food_insertion/food_insertion_cucumber_01.png',
    '08_oral': 'action-refs/08_oral/oral_01.png',
    '09_squirting': 'action-refs/09_squirting/squirting_01.png',
    '10_fisting_pussy': 'action-refs/10_fisting_pussy/fisting_pussy_01.png',
    '11_fisting_anal': 'action-refs/11_fisting_anal/fisting_anal_01.png',
    '14_anal_beads': 'action-refs/14_anal_beads/anal_beads_01.png',
    '16_object_insertion': 'action-refs/16_object_insertion/object_insertion_bottle_01.png',
    '17_bent_over': 'action-refs/17_bent_over/bent_over_01.png',
    '18_expressions_closeup_face': 'action-refs/18_expressions_closeup_face/confident.png',
  };

  return knownFiles[category] || `action-refs/${category}`;
}

function errorResult(error: string, actionId: string, seed: number): HollyMediaResult {
  return {
    url: '',
    provider: 'error',
    action_id: actionId,
    seed,
    lora_stack: [],
    prompt_used: '',
    success: false,
    error,
  };
}
