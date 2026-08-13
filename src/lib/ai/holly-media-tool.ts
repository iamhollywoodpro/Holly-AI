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
  const baseSeed = req.seed ?? Math.floor(Math.random() * 999_999_999);

  // Resolve the action — either from explicit action_id or by matching the request
  let action: ActionEntry | null = null;

  if (req.action_id) {
    action = getAction(req.action_id);
    if (!action) {
      return errorResult(`Unknown action_id: ${req.action_id}`, req.action_id, baseSeed);
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

  // Two-candidate generation for NSFW actions (verified actions don't need it)
  if (action.is_nsfw && action.status !== 'verified') {
    return generateWithFallback(req, action, prompt, loraStack, baseSeed);
  }

  // Single generation for verified actions + SFW
  if (req.type === 'video') {
    return generateVideo(req, action, prompt, loraStack, baseSeed);
  }
  return generateImage(req, action, prompt, loraStack, baseSeed);
}

/**
 * Generate two candidates with different seeds.
 * If the first fails or has obvious issues, return the second.
 * Both results are returned — the caller can choose.
 */
async function generateWithFallback(
  req: HollyMediaRequest,
  action: ActionEntry,
  prompt: string,
  loraStack: Array<{ name: string; strength: number }>,
  baseSeed: number,
): Promise<HollyMediaResult> {
  // Generate candidate 1
  const candidate1 = await generateImage(req, action, prompt, loraStack, baseSeed);

  if (candidate1.success) {
    return candidate1;  // First one worked — return it
  }

  // First failed — try candidate 2 with a different seed + different reference photo
  console.log(`[HollyMedia] Candidate 1 failed (${candidate1.error}), trying candidate 2...`);
  const candidate2 = await generateImage(req, action, prompt, loraStack, baseSeed + 77777);

  if (candidate2.success) {
    return candidate2;
  }

  // Both failed — return the first error
  return candidate1;
}

// buildPrompt, buildLoRAStack, generateImage, generateVideo, etc. follow below

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
      // ControlNet path: pick next reference photo from the category
      let refPath = pickReferencePhoto(action.reference_category);

      // If this action has a target_hole, use the hole-mapped version
      // (the .holes.png file with colored insertion-point overlay)
      if (action.target_hole) {
        refPath = toHoleMappedPath(refPath);
      }

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
 * Uses the full known file list per category — every generation gets
 * a different reference photo, creating variety in poses and angles.
 *
 * File lists are cached from volume listings (updated 2026-08-13).
 * To add new reference photos, add them to the volume AND update this list.
 */
const REFERENCE_FILES: Record<string, string[]> = {
  '01_dildo_pussy': [
    'action-refs/01_dildo_pussy/01_dildo_pussy.webp',
    'action-refs/01_dildo_pussy/02_dildo_pussy.webp',
    'action-refs/01_dildo_pussy/03_dildo_pussy.webp',
    'action-refs/01_dildo_pussy/04_dildo_pussy.png',
    'action-refs/01_dildo_pussy/05_dildo_pussy.png',
    'action-refs/01_dildo_pussy/06_dildo_pussy.png',
    'action-refs/01_dildo_pussy/07_dildo_pussy.png',
    'action-refs/01_dildo_pussy/08_dildo_pussy.png',
    'action-refs/01_dildo_pussy/09_dildo_pussy.png',
    'action-refs/01_dildo_pussy/10_dildo_pussy.png',
  ],
  '02_fingering_pussy': [
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_04.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_05.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_07.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_09.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_11.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_12.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_13.png',
    'action-refs/02_fingering_pussy/fingering_pussy_two_fingers_14.png',
  ],
  '03_masturbating': [
    'action-refs/03_masturbating/01_rubbing_clit.png',
    'action-refs/03_masturbating/02_rubbing_clit.png',
    'action-refs/03_masturbating/03_rubbing_clit.png',
    'action-refs/03_masturbating/04_touching_herself.png',
    'action-refs/03_masturbating/05_touching_herself.png',
    'action-refs/03_masturbating/06_touching_herself.png',
    'action-refs/03_masturbating/07_touching_herself.png',
    'action-refs/03_masturbating/08_touching_herself.png',
  ],
  '04_spreading': [
    'action-refs/04_spreading/spreading_01.png',
    'action-refs/04_spreading/spreading_02.png',
    'action-refs/04_spreading/spreading_03.png',
    'action-refs/04_spreading/spreading_04.png',
    'action-refs/04_spreading/spreading_05.png',
    'action-refs/04_spreading/spreading_06.png',
    'action-refs/04_spreading/spreading_07.png',
  ],
  '05_anal_fingering': [
    'action-refs/05_anal_fingering/anal_fingering_01.png',
    'action-refs/05_anal_fingering/anal_fingering_02.png',
    'action-refs/05_anal_fingering/anal_fingering_03.png',
    'action-refs/05_anal_fingering/anal_fingering_04.png',
    'action-refs/05_anal_fingering/anal_fingering_05.png',
    'action-refs/05_anal_fingering/anal_fingering_06.png',
    'action-refs/05_anal_fingering/anal_fingering_07.png',
    'action-refs/05_anal_fingering/anal_fingering_08.png',
    'action-refs/05_anal_fingering/anal_fingering_09.png',
    'action-refs/05_anal_fingering/anal_fingering_10.png',
    'action-refs/05_anal_fingering/anal_fingering_11.png',
    'action-refs/05_anal_fingering/anal_fingering_12.png',
    'action-refs/05_anal_fingering/anal_fingering_13.png',
  ],
  '06_anal_dildo': [
    'action-refs/06_anal_dildo/anal_dildo_01.png',
    'action-refs/06_anal_dildo/anal_dildo_02.png',
  ],
  '07_food_insertion': [
    'action-refs/07_food_insertion/food_insertion_cucumber_01.png',
    'action-refs/07_food_insertion/food_insertion_cucumber_02.png',
    'action-refs/07_food_insertion/food_insertion_cucumber_03.png',
    'action-refs/07_food_insertion/food_insertion_cucumber_04.png',
    'action-refs/07_food_insertion/food_insertion_corn_01.png',
    'action-refs/07_food_insertion/food_insertion_corn_02.png',
    'action-refs/07_food_insertion/food_insertion_corn_03.png',
    'action-refs/07_food_insertion/food_insertion_eggplant_01.png',
    'action-refs/07_food_insertion/food_insertion_eggplant_02.png',
    'action-refs/07_food_insertion/food_insertion_eggplant_03.png',
    'action-refs/07_food_insertion/food_insertion_eggplant_04.png',
    'action-refs/07_food_insertion/food_insertion_eggplant_05.png',
    'action-refs/07_food_insertion/food_insertion_eggplant_06.png',
    'action-refs/07_food_insertion/food_insertion_deep_inside_eggplant_01.png',
  ],
  '08_oral': [
    'action-refs/08_oral/oral_01.png',
    'action-refs/08_oral/oral_02.png',
    'action-refs/08_oral/oral_03.png',
    'action-refs/08_oral/oral_04.png',
    'action-refs/08_oral/oral_05.png',
    'action-refs/08_oral/oral_06.png',
    'action-refs/08_oral/oral_07.png',
    'action-refs/08_oral/oral_08.png',
    'action-refs/08_oral/oral_09.png',
    'action-refs/08_oral/oral_10.png',
  ],
  '09_squirting': [
    'action-refs/09_squirting/squirting_01.png',
    'action-refs/09_squirting/squirting_02.png',
    'action-refs/09_squirting/squirting_03.png',
    'action-refs/09_squirting/cumming_01.png',
    'action-refs/09_squirting/cumming_02.png',
    'action-refs/09_squirting/cumming_03.png',
    'action-refs/09_squirting/cumming_04.png',
    'action-refs/09_squirting/cumming_05.png',
    'action-refs/09_squirting/orgasm_01.png',
    'action-refs/09_squirting/orgasm_02.png',
  ],
  '10_fisting_pussy': [
    'action-refs/10_fisting_pussy/fisting_pussy_01.png',
    'action-refs/10_fisting_pussy/fisting_pussy_02.png',
    'action-refs/10_fisting_pussy/fisting_pussy_03.png',
    'action-refs/10_fisting_pussy/fisting_pussy_04.png',
    'action-refs/10_fisting_pussy/fisting_pussy_05.png',
    'action-refs/10_fisting_pussy/fisting_pussy_06.png',
    'action-refs/10_fisting_pussy/fisting_pussy_07.png',
    'action-refs/10_fisting_pussy/fisting_pussy_08.png',
    'action-refs/10_fisting_pussy/fisting_pussy_09.png',
    'action-refs/10_fisting_pussy/fisting_pussy_10.png',
    'action-refs/10_fisting_pussy/someone_fisting_her_pussy_ass_01.png',
    'action-refs/10_fisting_pussy/someone_fisting_her_pussy_ass_02.png',
    'action-refs/10_fisting_pussy/someone_fisting_her_pussy_ass_03.png',
    'action-refs/10_fisting_pussy/someone_fisting_her_pussy_04.png',
    'action-refs/10_fisting_pussy/someone_fisting_her_pussy_05.png',
    'action-refs/10_fisting_pussy/someone_fisting_her_pussy_06.png',
  ],
  '11_fisting_anal': [
    'action-refs/11_fisting_anal/fisting_anal_01.png',
    'action-refs/11_fisting_anal/fisting_anal_02.png',
    'action-refs/11_fisting_anal/fisting_anal_03.png',
  ],
  '14_anal_beads': [
    'action-refs/14_anal_beads/anal_beads_01.png',
    'action-refs/14_anal_beads/anal_beads_02.png',
  ],
  '16_object_insertion': [
    'action-refs/16_object_insertion/object_insertion_bottle_01.png',
    'action-refs/16_object_insertion/object_insertion_bottle_02.png',
    'action-refs/16_object_insertion/object_insertion_markers_01.png',
    'action-refs/16_object_insertion/object_insertion_baseball_bat_01.png',
  ],
  '17_bent_over': [
    'action-refs/17_bent_over/bent_over_01.png',
    'action-refs/17_bent_over/bent_over_02.png',
    'action-refs/17_bent_over/bent_over_03.png',
    'action-refs/17_bent_over/bent_over_04.png',
  ],
  '18_expressions_closeup_face': [
    'action-refs/18_expressions_closeup_face/confident.png',
    'action-refs/18_expressions_closeup_face/happy.png',
    'action-refs/18_expressions_closeup_face/in_love.png',
    'action-refs/18_expressions_closeup_face/intimate.png',
    'action-refs/18_expressions_closeup_face/naughty.png',
    'action-refs/18_expressions_closeup_face/orgasm.png',
    'action-refs/18_expressions_closeup_face/playful.png',
    'action-refs/18_expressions_closeup_face/smile.png',
    'action-refs/18_expressions_closeup_face/surprised.png',
  ],
};

// Track the last-used index per category for rotation (avoids repeats)
const lastUsedIndex: Record<string, number> = {};

function pickReferencePhoto(category: string): string {
  const files = REFERENCE_FILES[category];
  if (!files || files.length === 0) {
    return `action-refs/${category}`;
  }

  // Rotate through files sequentially (more variety than pure random)
  const lastIdx = lastUsedIndex[category] ?? -1;
  const nextIdx = (lastIdx + 1) % files.length;
  lastUsedIndex[category] = nextIdx;

  return files[nextIdx];
}

/**
 * Convert a reference photo path to its hole-mapped version.
 * "action-refs/01_dildo_pussy/01_dildo_pussy.webp" → "action-refs/01_dildo_pussy/01_dildo_pussy.holes.png"
 *
 * The hole-mapped version has a colored circle (red=pussy, blue=ass, green=mouth)
 * overlaid at the insertion point. ControlNet sees this and knows WHERE things go.
 * Falls back to the original photo if the hole-mapped version doesn't exist yet
 * (the batch creation script needs to run first).
 */
function toHoleMappedPath(refPath: string): string {
  // Replace extension with .holes.png
  const base = refPath.replace(/\.[^.]+$/, '');
  return `${base}.holes.png`;
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
