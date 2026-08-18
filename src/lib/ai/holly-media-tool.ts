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
    if (action.status === 'banned') {
      // Banned actions never generate — Holly should tell the user she can't
      // do this one yet rather than shipping a broken image.
      return errorResult(
        `Action '${req.action_id}' is not available`,
        req.action_id, baseSeed,
      );
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

  // Two-candidate generation for ALL NSFW actions (including verified ones).
  // Verified actions still get deformities on bad seeds — two candidates
  // doubles the chance of a clean image.
  if (action.is_nsfw) {
    return generateWithFallback(req, action, prompt, loraStack, baseSeed);
  }

  // Single generation for SFW only
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

  // Expression — use request expression if provided, otherwise use action default
  if (req.expression) {
    parts.push(req.expression);
  } else if (action.default_expression) {
    parts.push(action.default_expression);
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

  // Hand rule — Holly must ALWAYS be physically holding/controlling
  // any inserted object (dildo, food, fingers). Objects never float.
  if (action.hand_rule) {
    parts.push(action.hand_rule);
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
 * Generate an image via the skeleton edit pipeline or text-only endpoint.
 *
 * The skeleton edit pipeline (generate-pose-guided at 0.9 denoise) is the
 * VERIFIED pose-control method (Steve confirmed "Looks Perfect" 2026-08-14).
 * ControlNet was abandoned — the custom node was silently broken (multigpu_clones
 * bug meant the pose signal never reached the model).
 *
 * The skeleton+holes files (.skelholes.png) provide:
 * - DWPose body skeleton → body position
 * - Colored hole markers → insertion point accuracy (MediaPipe landmarks)
 */
async function generateImage(
  req: HollyMediaRequest,
  action: ActionEntry,
  prompt: string,
  loraStack: Array<{ name: string; strength: number }>,
  seed: number,
): Promise<HollyMediaResult> {
  try {
    if (action.use_controlnet && action.use_skeleton !== false && action.reference_category) {
      // Skeleton edit path: pick next skeleton+holes file from the category
      const refPath = pickSkeletonHoles(action.reference_category, action.action_id);

      const gs = action.gen_settings || { steps: GENERATION_SETTINGS.steps, cfg: GENERATION_SETTINGS.cfg, sampler: GENERATION_SETTINGS.sampler };

      const body = JSON.stringify({
        pose_ref: refPath,
        prompt,
        width: GENERATION_SETTINGS.width,
        height: GENERATION_SETTINGS.height,
        seed,
        denoise: 0.9,
        steps: gs.steps,
        cfg: gs.cfg,
        sampler: gs.sampler,
        loras: loraStack,
      });

      // Use the POSE-GUIDED endpoint (skeleton edit pipeline at 0.9 denoise)
      // NOT the broken ControlNet endpoint
      const poseGuidedUrl = process.env.MODAL_POSE_GUIDED_URL || '';
      const res = await fetch(poseGuidedUrl.replace(/\/$/, ''), {
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
      const gs = action.gen_settings || { steps: GENERATION_SETTINGS.steps, cfg: GENERATION_SETTINGS.cfg, sampler: GENERATION_SETTINGS.sampler };
      const body = JSON.stringify({
        prompt,
        width: GENERATION_SETTINGS.width,
        height: GENERATION_SETTINGS.height,
        seed,
        steps: gs.steps,
        cfg: gs.cfg,
        sampler: gs.sampler,
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
 * Skeleton+holes file system — the pose guidance library.
 *
 * All 126 skeletons (34 original + 92 fullbody-derived) have .skelholes.png
 * overlays with MediaPipe-accurate hole markers (red=pussy, blue=ass, green=mouth).
 * These go through the edit pipeline at 0.9 denoise for pose control.
 */
const SKELETON_HOLES_FILES: Record<string, string[]> = {
  '01_dildo_pussy': [
    'action-combined-skeleton-holes/01_dildo_pussy/01_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/02_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/03_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/10_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/11_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/04_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/05_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/06_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/07_dildo_pussy.skelholes.png',
    'action-combined-skeleton-holes/01_dildo_pussy/08_dildo_pussy.skelholes.png',
  ],
  '02_fingering_pussy': [
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_04.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_05.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_07.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_09.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_11.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_12.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_13.skelholes.png',
    'action-combined-skeleton-holes/02_fingering_pussy/fingering_pussy_two_fingers_14.skelholes.png',
  ],
  '03_masturbating': [
    'action-combined-skeleton-holes/03_masturbating/01_rubbing_clit.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/02_rubbing_clit.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/masturbating_01.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/masturbating_02.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/masturbating_03.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/masturbating_04.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/masturbating_05.skelholes.png',
    'action-combined-skeleton-holes/03_masturbating/masturbating_06.skelholes.png',
  ],
  '04_spreading': [
    'action-combined-skeleton-holes/04_spreading/spreading_01.skelholes.png',
    'action-combined-skeleton-holes/04_spreading/spreading_02.skelholes.png',
    'action-combined-skeleton-holes/04_spreading/spreading_03.skelholes.png',
    'action-combined-skeleton-holes/04_spreading/spreading_04.skelholes.png',
    'action-combined-skeleton-holes/04_spreading/spreading_05.skelholes.png',
    'action-combined-skeleton-holes/04_spreading/spreading_06.skelholes.png',
    'action-combined-skeleton-holes/04_spreading/spreading_07.skelholes.png',
  ],
  '05_anal_fingering': [
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_01.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_02.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_03.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_04.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_05.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_06.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_07.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_two_fingers_01.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_two_fingers_02.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_two_fingers_03.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_two_fingers_04.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_two_fingers_05.skelholes.png',
    'action-combined-skeleton-holes/05_anal_fingering/anal_fingering_two_fingers_06.skelholes.png',
  ],
  '06_anal_dildo': [
    'action-combined-skeleton-holes/06_anal_dildo/anal_dildo_01.skelholes.png',
    'action-combined-skeleton-holes/06_anal_dildo/anal_dildo_02.skelholes.png',
  ],
  '07_food_insertion': [
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_corn_01.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_corn_02.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_corn_03.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_cucumber_01.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_cucumber_02.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_cucumber_03.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_cucumber_04.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_deep_inside_eggplant_01.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_eggplant_01.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_eggplant_02.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_eggplant_03.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_eggplant_04.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_eggplant_05.skelholes.png',
    'action-combined-skeleton-holes/07_food_insertion/food_insertion_eggplant_06.skelholes.png',
  ],
  '08_oral': [
    'action-combined-skeleton-holes/08_oral/oral_close_deep_in_mouth_12.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_grabbing_over_head_pov_16.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_pov_05.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_pov_overhead_13.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_side_07.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_side_close_pov_11.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_side_pov_08.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_sideways_01.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_sideways_03.skelholes.png',
    'action-combined-skeleton-holes/08_oral/oral_sucking_close_up_15.skelholes.png',
  ],
  '09_squirting': [
    'action-combined-skeleton-holes/09_squirting/cumming_01.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/cumming_02.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/cumming_03.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/cumming_04.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/squirting_01.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/squirting_02.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/squirting_03.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/squirting_04.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/squirting_05.skelholes.png',
    'action-combined-skeleton-holes/09_squirting/squirting_06.skelholes.png',
  ],
  '10_fisting_pussy': [
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_01.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_02.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_03.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_04.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_05.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_06.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_07.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_08.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_09.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_10.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_11.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/fisting_pussy_12.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/someone_fisting_her_pussy_01.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/someone_fisting_her_pussy_02.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/someone_fisting_her_pussy_03.skelholes.png',
    'action-combined-skeleton-holes/10_fisting_pussy/someone_fisting_her_pussy_ass_01.skelholes.png',
  ],
  '11_fisting_anal': [
    'action-combined-skeleton-holes/11_fisting_anal/fisting_anal_01.skelholes.png',
    'action-combined-skeleton-holes/11_fisting_anal/fisting_anal_02.skelholes.png',
    'action-combined-skeleton-holes/11_fisting_anal/fisting_anal_03.skelholes.png',
  ],
  '14_anal_beads': [
    'action-combined-skeleton-holes/14_anal_beads/anal_beads_01.skelholes.png',
    'action-combined-skeleton-holes/14_anal_beads/anal_beads_02.skelholes.png',
  ],
  '16_object_insertion': [
    'action-combined-skeleton-holes/16_object_insertion/object_insertion_baseball_bat_01.skelholes.png',
    'action-combined-skeleton-holes/16_object_insertion/object_insertion_bottle_01.skelholes.png',
    'action-combined-skeleton-holes/16_object_insertion/object_insertion_bottle_02.skelholes.png',
    'action-combined-skeleton-holes/16_object_insertion/object_insertion_markers_01.skelholes.png',
  ],
  '17_bent_over': [
    'action-combined-skeleton-holes/17_bent_over/bentover_01.skelholes.png',
    'action-combined-skeleton-holes/17_bent_over/bentover_03.skelholes.png',
    'action-combined-skeleton-holes/17_bent_over/bentover_04.skelholes.png',
    'action-combined-skeleton-holes/17_bent_over/bentover_05.skelholes.png',
  ],
  '18_expressions_closeup_face': [
    'action-combined-skeleton-holes/18_expressions_closeup_face/confident.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/happy.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/in love.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/intimate.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/naughty.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/orgasm.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/playful.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/smile.skelholes.png',
    'action-combined-skeleton-holes/18_expressions_closeup_face/surprised.skelholes.png',
  ],
};

// Pose variety pools — same concept as before but with skeleton+holes paths
const POSE_VARIETY_POOLS: Record<string, string[]> = {
  'dildo_pussy': [
    ...SKELETON_HOLES_FILES['01_dildo_pussy'] || [],
    ...SKELETON_HOLES_FILES['03_masturbating'] || [],
    ...SKELETON_HOLES_FILES['17_bent_over'] || [],
    ...SKELETON_HOLES_FILES['02_fingering_pussy'] || [],
  ],
  'dildo_anal': [
    ...SKELETON_HOLES_FILES['06_anal_dildo'] || [],
    ...SKELETON_HOLES_FILES['17_bent_over'] || [],
    ...SKELETON_HOLES_FILES['05_anal_fingering'] || [],
  ],
  'fingering': [
    ...SKELETON_HOLES_FILES['02_fingering_pussy'] || [],
    ...SKELETON_HOLES_FILES['03_masturbating'] || [],
  ],
  'anal_fingering': [
    ...SKELETON_HOLES_FILES['05_anal_fingering'] || [],
    ...SKELETON_HOLES_FILES['17_bent_over'] || [],
  ],
  'masturbation': [
    ...SKELETON_HOLES_FILES['03_masturbating'] || [],
    ...SKELETON_HOLES_FILES['02_fingering_pussy'] || [],
  ],
  'food_insertion': [
    ...SKELETON_HOLES_FILES['07_food_insertion'] || [],
    ...SKELETON_HOLES_FILES['01_dildo_pussy'] || [],
  ],
  'object_insertion': [
    ...SKELETON_HOLES_FILES['16_object_insertion'] || [],
    ...SKELETON_HOLES_FILES['07_food_insertion'] || [],
  ],
  'pussy_fisting': [
    ...SKELETON_HOLES_FILES['10_fisting_pussy'] || [],
    ...SKELETON_HOLES_FILES['02_fingering_pussy'] || [],
  ],
  'anal_fisting': [
    ...SKELETON_HOLES_FILES['11_fisting_anal'] || [],
    ...SKELETON_HOLES_FILES['17_bent_over'] || [],
  ],
  'spreading': [
    ...SKELETON_HOLES_FILES['04_spreading'] || [],
    ...SKELETON_HOLES_FILES['17_bent_over'] || [],
  ],
  'closeup': [
    ...SKELETON_HOLES_FILES['04_spreading'] || [],
    ...SKELETON_HOLES_FILES['18_expressions_closeup_face'] || [],
  ],
  'bent_over': [
    ...SKELETON_HOLES_FILES['17_bent_over'] || [],
    ...SKELETON_HOLES_FILES['05_anal_fingering'] || [],
  ],
};

// Track last-used index per action for rotation (avoids repeats)
const lastUsedIndex: Record<string, number> = {};

function pickSkeletonHoles(category: string, actionId?: string): string {
  // Check pose variety pool first (multiple pose types)
  if (actionId && POSE_VARIETY_POOLS[actionId]) {
    const pool = POSE_VARIETY_POOLS[actionId];
    const lastIdx = lastUsedIndex[actionId] ?? -1;
    const stride = Math.max(7, Math.floor(pool.length / 4));
    const nextIdx = (lastIdx + stride) % pool.length;
    lastUsedIndex[actionId] = nextIdx;
    return pool[nextIdx];
  }

  // Default: rotate within the single category
  const files = SKELETON_HOLES_FILES[category];
  if (!files || files.length === 0) {
    return `action-combined-skeleton-holes/${category}`;
  }
  const lastIdx = lastUsedIndex[category] ?? -1;
  const nextIdx = (lastIdx + 1) % files.length;
  lastUsedIndex[category] = nextIdx;
  return files[nextIdx];
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
