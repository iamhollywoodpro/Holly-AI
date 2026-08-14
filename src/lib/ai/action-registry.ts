/**
 * Holly Action Registry — maps creative intent to technical assets.
 *
 * Holly (or the user) picks an action_id. The backend resolves it to the
 * correct LoRA, reference photo category, trigger words, and settings.
 * Holly NEVER chooses filenames — she chooses meaning.
 *
 * VERIFIED RESULTS (Steve-confirmed, 2026-08-13):
 *   dildo_pussy    → ✅ PERFECT
 *   fingering      → ✅ PASS
 *   closeup        → ✅ PASS
 *   sfw_clothed    → ✅ PERFECT
 *
 * ALL action LoRAs at 0.7 strength (verified safe — preserves identity + limbs).
 * combined-v1 @ 1.0 is ALWAYS appended last by the generation function.
 */

export interface ActionEntry {
  /** The action identifier Holly selects */
  action_id: string;
  /** Natural-language aliases for intent matching */
  aliases: string[];
  /** LoRA filename on the Modal volume */
  image_lora: string;
  /** LoRA strength (always 0.7 unless specifically tested otherwise) */
  image_lora_weight: number;
  /** Reference photo category on action-refs/ volume */
  reference_category: string;
  /** Tags for reference photo ranking */
  reference_tags: string[];
  /** Prompt fragment appended to the generation prompt */
  prompt_fragment: string;
  /** Whether this action involves NSFW content */
  is_nsfw: boolean;
  /** Whether ControlNet reference photo guidance should be used */
  use_controlnet: boolean;
  /** ControlNet strength (0.0-1.0, lower = more freedom, higher = more tracing) */
  controlnet_strength: number;
  /** Target hole for insertion actions — enables hole-mapping overlay */
  target_hole?: 'pussy' | 'ass' | 'mouth';
  /** Hand rule — Holly must always be physically holding the inserted object */
  hand_rule?: string;
  /** Default facial expression for this action (pleasure/pain based on intensity) */
  default_expression?: string;
  /** Verified status from Steve */
  status: 'verified' | 'close' | 'untested' | 'banned';
  /** Notes about this action */
  notes?: string;
}

/**
 * The master action registry. Each entry maps an action to its assets.
 * Adding a new action = adding one entry here. No code changes needed elsewhere.
 */
export const ACTION_REGISTRY: Record<string, ActionEntry> = {
  // ─── SFW ──────────────────────────────────────────────────────
  sfw_clothed: {
    action_id: 'sfw_clothed',
    aliases: ['selfie', 'portrait', 'clothed', 'dressed', 'wearing', 'outfit', 'clothes', 'smiling', 'self portrait'],
    image_lora: '',  // No action LoRA for SFW — combined-v1 only
    image_lora_weight: 0,
    reference_category: '',  // No reference photo for SFW
    reference_tags: [],
    prompt_fragment: '',  // The wardrobe/expression comes from the tool params
    is_nsfw: false,
    use_controlnet: false,
    controlnet_strength: 0,
    default_expression: 'soft genuine smile',
    status: 'verified',
    notes: 'SFW always uses combined-v1 only. Clothing must fully cover. No transparency.',
  },

  // ─── Nude poses (no action) ──────────────────────────────────
  nude_pose: {
    action_id: 'nude_pose',
    aliases: ['nude', 'naked', 'topless', 'bare', 'undressed', 'stripped'],
    image_lora: '',  // No action LoRA — just nude
    image_lora_weight: 0,
    reference_category: '',
    reference_tags: [],
    prompt_fragment: 'nude',
    is_nsfw: true,
    use_controlnet: false,
    controlnet_strength: 0,
    default_expression: 'confident relaxed expression',
    status: 'verified',
    notes: 'Simple nude pose. combined-v1 handles identity + body.',
  },

  // ─── Dildo actions ───────────────────────────────────────────
  dildo_pussy: {
    action_id: 'dildo_pussy',
    aliases: ['dildo', 'toy', 'vibrator', 'dildo masturbation', 'fuck her with dildo', 'using a dildo', 'dildo in her', 'dildo inside', 'toy in her', 'toy inside'],
    image_lora: 'FK_dildoinsertion.safetensors',
    image_lora_weight: 0.7,
    reference_category: '01_dildo_pussy',
    reference_tags: ['dildo', 'insertion', 'pussy', 'lying', 'full_body'],
    prompt_fragment: 'dildo inside her vagina, her hand holding the dildo',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes half closed, mouth slightly open, expression of pleasure, flushed cheeks',
    status: 'verified',
    notes: 'PERFECT per Steve. FK only for dildo — turns everything into dildo if misused.',
  },

  dildo_anal: {
    action_id: 'dildo_anal',
    aliases: ['dildo in her ass', 'dildo in ass', 'dildo in anus', 'dildo in asshole', 'anal dildo', 'toy in ass', 'toy in her ass', 'anal toy', 'fuck her ass with dildo'],
    image_lora: 'plug_that_hole_anal.safetensors',
    image_lora_weight: 0.7,
    reference_category: '06_anal_dildo',
    reference_tags: ['dildo', 'anal', 'insertion', 'bent_over', 'rear'],
    prompt_fragment: 'object is inserted into her anus, her hand reaching behind holding it',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'ass',
    default_expression: 'biting her lip, eyes squinting, mix of pleasure and discomfort',
    status: 'untested',
    notes: 'Trigger word from creator: "object is inserted into her anus". Only 2 reference photos available.',
  },

  // ─── Fingering actions ───────────────────────────────────────
  fingering: {
    action_id: 'fingering',
    aliases: ['fingering', 'finger her', 'finger your', 'fingers in her', 'fingers inside', 'finger fuck', 'finger her pussy'],
    image_lora: 'insert_kit.safetensors',
    image_lora_weight: 0.7,
    reference_category: '02_fingering_pussy',
    reference_tags: ['fingering', 'insertion', 'pussy', 'fingers', 'lying'],
    prompt_fragment: 'fingers inside her vagina, her hand between her legs',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes closed, soft moaning expression, parted lips',
    status: 'verified',
    notes: 'PASS per Steve. INSERT Kit trained on wide variety of insertions.',
  },

  anal_fingering: {
    action_id: 'anal_fingering',
    aliases: ['finger her ass', 'finger your ass', 'finger your asshole', 'finger in ass', 'finger in her ass', 'fingering ass', 'fingering asshole', 'anal finger', 'finger her asshole'],
    image_lora: 'insert_kit.safetensors',
    image_lora_weight: 0.7,
    reference_category: '05_anal_fingering',
    reference_tags: ['fingering', 'anal', 'fingers', 'bent_over'],
    prompt_fragment: 'fingers inside her ass',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'ass',
    default_expression: 'biting her lip, expression of intense pleasure and slight pain',
    status: 'close',
    notes: 'INSERT Kit handles both holes. 13 reference photos available.',
  },

  // ─── Fisting actions ─────────────────────────────────────────
  pussy_fisting: {
    action_id: 'pussy_fisting',
    aliases: ['fist her pussy', 'fist your pussy', 'fist in pussy', 'fist in her pussy', 'fisting pussy', 'fisting her pussy', 'hand in her pussy', 'hand in your pussy'],
    image_lora: 'self_fisting_anal.safetensors',
    image_lora_weight: 0.7,
    reference_category: '10_fisting_pussy',
    reference_tags: ['fisting', 'pussy', 'hand', 'insertion'],
    prompt_fragment: 'she is fisting her own pussy, she has her hand in her pussy',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes rolled back, mouth wide open, intense expression of pleasure and pain, sweaty',
    status: 'close',
    notes: 'Uses self_fisting_anal LoRA redirected to pussy trigger. 16 reference photos.',
  },

  anal_fisting: {
    action_id: 'anal_fisting',
    aliases: ['fist her ass', 'fisting ass', 'fist in ass', 'fist her asshole', 'self anal fisting', 'fisting her ass', 'hand in her ass', 'fist your ass'],
    image_lora: 'self_fisting_anal.safetensors',
    image_lora_weight: 0.7,
    reference_category: '11_fisting_anal',
    reference_tags: ['fisting', 'anal', 'hand', 'insertion'],
    prompt_fragment: 'she is self fisting her ass, she has her hand in her ass',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'ass',
    default_expression: 'eyes rolled back, mouth wide open, gasping, intense pain and pleasure, sweaty',
    status: 'close',
    notes: 'Action works at 1.0 but causes limb issues. At 0.7 action is weaker. Needs pose tuning.',
  },

  // ─── Food/object insertion ───────────────────────────────────
  food_insertion: {
    action_id: 'food_insertion',
    aliases: ['cucumber', 'eggplant', 'corn', 'banana', 'food in pussy', 'vegetable', 'fruit insertion'],
    image_lora: 'insert_kit.safetensors',
    image_lora_weight: 0.7,
    reference_category: '07_food_insertion',
    reference_tags: ['food', 'insertion', 'pussy', 'object'],
    prompt_fragment: 'her hand holding the object, pushing it inside her pussy',  // food/object
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes wide, mouth open, surprised expression mixed with pleasure',
    status: 'close',
    notes: 'INSERT Kit trained on "wide variety of common objects". 14 reference photos.',
  },

  object_insertion: {
    action_id: 'object_insertion',
    aliases: ['bottle', 'baseball bat', 'object insertion', 'stuffing', 'object in pussy'],
    image_lora: 'insert_kit.safetensors',
    image_lora_weight: 0.7,
    reference_category: '16_object_insertion',
    reference_tags: ['object', 'insertion', 'pussy', 'stuffing'],
    prompt_fragment: 'her hand holding the object, pushing it inside her pussy',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes wide, mouth open, surprised expression mixed with pleasure',
    status: 'close',
    notes: 'INSERT Kit handles objects. 4 reference photos.',
  },

  // ─── Masturbation ────────────────────────────────────────────
  masturbation: {
    action_id: 'masturbation',
    aliases: ['masturbate', 'masturbating', 'touching herself', 'touch your', 'rubbing clit', 'rub your clit', 'playing with pussy', 'play with your', 'self pleasure', 'rubbing pussy', 'rub your pussy', 'pleasure your'],
    image_lora: 'insert_kit.safetensors',
    image_lora_weight: 0.7,
    reference_category: '03_masturbating',
    reference_tags: ['masturbation', 'rubbing', 'touching', 'pussy', 'hand'],
    prompt_fragment: 'touching herself',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes closed, head tilted back, expression of building pleasure',
    status: 'close',
    notes: 'SEXGOD LoRA removed (failed 3x). INSERT Kit handles this.',
  },

  // ─── Oral ────────────────────────────────────────────────────
  oral: {
    action_id: 'oral',
    aliases: ['blowjob', 'sucking dick', 'oral sex', 'sucking cock', 'giving head'],
    image_lora: 'insert_kit.safetensors',
    image_lora_weight: 0.7,
    reference_category: '08_oral',
    reference_tags: ['oral', 'mouth', 'sucking'],
    prompt_fragment: '',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'mouth',
    default_expression: 'eyes looking up, mouth full, focused expression',
    status: 'untested',
    notes: '10 reference photos available. INSERT Kit for insertion concept.',
  },

  // ─── Spreading / closeup ─────────────────────────────────────
  spreading: {
    action_id: 'spreading',
    aliases: ['spreading pussy', 'spread open', 'legs spread', 'pussy spread', 'vulva', 'labia'],
    image_lora: 'pussydiffusion-f2-klein-9b_v2.safetensors',
    image_lora_weight: 0.7,
    reference_category: '04_spreading',
    reference_tags: ['spreading', 'pussy', 'closeup', 'hands'],
    prompt_fragment: 'spreading her pussy open',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'naughty playful smile, looking at camera',
    status: 'verified',
    notes: 'pussydiffusion verified PASS for closeups. 7 reference photos.',
  },

  closeup: {
    action_id: 'closeup',
    aliases: ['closeup pussy', 'pussy closeup', 'close up', 'intimate closeup', 'vulva closeup'],
    image_lora: 'pussydiffusion-f2-klein-9b_v2.safetensors',
    image_lora_weight: 0.7,
    reference_category: '04_spreading',
    reference_tags: ['closeup', 'pussy', 'detail'],
    prompt_fragment: '',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'aroused expression, flushed cheeks, parted lips',
    status: 'verified',
    notes: 'pussydiffusion verified PASS. Uses spreading refs for pose guidance.',
  },

  // ─── Bent over / from behind ─────────────────────────────────
  bent_over: {
    action_id: 'bent_over',
    aliases: ['bent over', 'all fours', 'doggy', 'doggiestyle', 'from behind', 'rear view', 'on her knees'],
    image_lora: 'femaleasshole-f2-klein-9b-musubituner.safetensors',
    image_lora_weight: 0.7,
    reference_category: '17_bent_over',
    reference_tags: ['bent_over', 'ass', 'rear', 'anus'],
    prompt_fragment: '',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'ass',
    default_expression: 'looking back over shoulder with a naughty expression',
    status: 'verified',
    notes: 'FACT.md PERFECT for bent_over. musubituner handles anus/rear geometry.',
  },

  // ─── Other actions ───────────────────────────────────────────
  self_suck: {
    action_id: 'self_suck',
    aliases: ['suck your nipple', 'suck her nipple', 'sucking own nipple', 'licking own nipple', 'lick your nipple', 'breast suck', 'self suck', 'suck your own'],
    image_lora: 'self_suck_breasts.safetensors',
    image_lora_weight: 0.7,
    reference_category: '18_expressions_closeup_face',
    reference_tags: ['breast', 'sucking', 'nipple', 'expression'],
    prompt_fragment: 'S3lfT1tSu3k, she is sucking her own nipple',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    default_expression: 'eyes closed, focused expression of self pleasure',
    status: 'untested',
    notes: 'Trigger word from creator. Uses expression refs for pose.',
  },

  panties_aside: {
    action_id: 'panties_aside',
    aliases: ['panties aside', 'panties pulled aside', 'panties down', 'underwear aside'],
    image_lora: 'pull_play_panties.safetensors',
    image_lora_weight: 0.7,
    reference_category: '',
    reference_tags: ['panties', 'underwear'],
    prompt_fragment: 'panties pulled aside',
    is_nsfw: true,
    use_controlnet: false,
    controlnet_strength: 0,
    default_expression: 'shy blushing expression, looking away slightly',
    status: 'untested',
    notes: 'Concept LoRA for panties displaced. No reference category needed.',
  },

  squirting: {
    action_id: 'squirting',
    aliases: ['squirting', 'squirting pussy', 'cumming', 'orgasm', 'female ejaculation'],
    image_lora: 'pussydiffusion-f2-klein-9b_v2.safetensors',
    image_lora_weight: 0.7,
    reference_category: '09_squirting',
    reference_tags: ['squirting', 'orgasm', 'pussy', 'fluid'],
    prompt_fragment: '',
    is_nsfw: true,
    use_controlnet: true,
    controlnet_strength: 0.45,
    target_hole: 'pussy',
    default_expression: 'eyes rolled back, mouth wide open screaming, body trembling, climax expression',
    status: 'untested',
    notes: '10 reference photos. pussydiffusion for anatomy detail.',
  },
};

/**
 * Match a user prompt to an action_id using keyword aliases.
 * Returns the best matching action entry, or null if no match.
 */
export function matchAction(userPrompt: string): ActionEntry | null {
  const prompt = userPrompt.toLowerCase();

  // Detect if the prompt specifies anal (ass/anus/asshole/butt/butthole)
  // This disambiguates dildo_pussy vs dildo_anal, fingering vs anal_fingering, etc.
  const isAnal = /\b(ass|anus|asshole|butt|butthole|anal)\b/.test(prompt);

  let bestMatch: ActionEntry | null = null;
  let bestScore = 0;

  for (const entry of Object.values(ACTION_REGISTRY)) {
    let score = 0;
    for (const alias of entry.aliases) {
      if (prompt.includes(alias.toLowerCase())) {
        score += alias.length;
      }
    }

    // Priority bonus: if prompt mentions anal AND this action is anal-specific,
    // boost its score so it beats the generic version.
    // dildo_anal beats dildo_pussy, anal_fingering beats fingering, etc.
    if (isAnal && entry.action_id.includes('anal')) {
      score += 50; // Strong boost — anal context should win
    }

    // Penalty: if prompt mentions anal but this action is pussy-specific
    // (not anal), reduce its score to avoid misdetection.
    if (isAnal && (entry.action_id === 'dildo_pussy' || entry.action_id === 'fingering')) {
      score = Math.floor(score * 0.3);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

/**
 * Get an action entry by its action_id.
 */
export function getAction(actionId: string): ActionEntry | null {
  return ACTION_REGISTRY[actionId] || null;
}

/**
 * List all available action_ids with their aliases (for tool schema generation).
 */
export function listActionIds(): string[] {
  return Object.keys(ACTION_REGISTRY);
}

/**
 * Default generation settings for the ComfyUI pipeline.
 * These are verified values — do not change without Steve's approval.
 */
export const GENERATION_SETTINGS = {
  steps: 8,
  cfg: 1.2,
  sampler: 'euler',
  scheduler: 'simple',
  width: 1024,
  height: 1024,
  negative_prompt: (
    'extra arms, extra hands, extra legs, extra fingers, missing fingers, ' +
    'fused fingers, deformed hands, malformed limbs, extra limbs, ' +
    'mutated, disfigured, bad anatomy, conjoined, duplicate, ' +
    'text, watermark, signature, low quality, blurry'
  ),
  identity_lora: 'holly-combined-v1.safetensors',
  identity_weight: 1.0,  // Always last, always 1.0
};
