#!/usr/bin/env python3
"""
HOLLY Body LoRA Training Dataset Generator v2.5 (NSFW Expansion)
=================================================================
300-image NSFW expansion for h0lly-body v2.5 LoRA training on Civitai.

PHASES:
  --test        Generate 10 riskiest images (Phase A — quality verification)
  --category X  Generate only specific category
                (recovery_v1, arousal, self_pleasure, frontal_spread,
                 outfit, location, lighting, pov, partial_clothed,
                 cross_lighting, outfit_pose, arousal_pose, expression)
  (no flag)     Generate all 300 images

CRITICAL ANTI-ARTIFACT STRATEGY:
  - Every explicit image includes EXPLICIT_ANTI_ARTIFACT block
  - All penetration prompts explicitly state "enters existing opening only"
  - Reinforces "no extra orifices, no duplicate genitals" throughout
  - All hand/toy shots reinforce "two arms, five fingers each"
  - Test batch MUST pass review before mass generation

LORA STACKING (v2 — requires endpoint v1.3.0+):
  Each image attaches a per-scene LoRA stack that the Modal endpoint
  layers on top of the baked face+body LoRAs. Stack = 1 universal NSFW
  enabler + 1-2 pose/act specialists. All filenames MUST exist on the
  holly-lora-weights Modal volume.

Usage:
    python scripts/generate-body-lora-dataset-v25.py --test
    python scripts/generate-body-lora-dataset-v25.py --category recovery_v1
    python scripts/generate-body-lora-dataset-v25.py --start 50
    python scripts/generate-body-lora-dataset-v25.py --attempts 5

Requirements:
    pip install requests
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path

MODAL_URL = "https://iamhollywoodpro--generate-holly-a100.modal.run"
OUTPUT_DIR = Path(__file__).parent.parent / "holly-body-lora-dataset-v25"
ATTEMPTS_DIR = OUTPUT_DIR / "_attempts"

# ─── Body Description (Holly canon — SAME AS V1, DO NOT MODIFY) ──────────
# V1 LoRA is trained on these exact tokens. Changing them breaks v2.5 alignment.

BODY_PREFIX = (
    "h0lly, "
    "hair length exactly three inches past shoulders ending at mid-chest level, "
    "small feminine feet size 6 with high arches and five perfect toes, "
    "delicate hands with five slender fingers, "
    "silky smooth flawless skin with well-moisturized sheen, skin stretches taut when extending and creases naturally when bending, "
)

NUDE_BODY_EXTRA = (
    "waxed smooth pussy completely smooth and clean, "
)

# ─── View-Specific Nude Details (same as v1) ─────────────────────────────

NUDE_FRONT = (
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "waxed smooth pussy, labia majora meeting evenly at rest, "
    "rosy-pink nipples slightly upturned, medium circular areolas, "
)

NUDE_BACK = (
    "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, "
    "visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "heart-shaped butt with natural crease underneath, "
    "two small dimples on lower back, silky smooth even skin, "
)

NUDE_LYING_OPEN = (
    "breasts settled naturally to sides, nipples pointing up, "
    "realistic vulva positioned very low on the pelvis directly below the pubic bone, "
    "slightly parted labia and visible inner lips, "
    "small vaginal opening slightly visible, "
    "single small vertical innie navel in correct position, "
    "waxed smooth pussy, "
)

NUDE_BEND_BACK = (
    "gluteal cleft begins directly below the two sacral dimples on lower back and ends exactly at the top of the anus, "
    "visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "heart-shaped butt round and full from behind, "
    "silky smooth even skin on back and legs, "
)

NUDE_DETAIL_FRONT = (
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "waxed smooth pussy, "
    "natural 34C breasts teardrop shape, single nipple on each breast, "
    "silky smooth even skin texture, "
)

NUDE_DETAIL_BACK = (
    "silky smooth back, graceful spine curve, two small dimples on lower back, "
    "gluteal cleft begins directly below the two sacral dimples and ends exactly at the top of the anus, "
    "heart-shaped butt, visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, slightly darker pigmentation, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "silky smooth even skin, "
)

NUDE_OPENER = (
    "FULLY NUDE naked woman, completely bare body from neck to toes, "
)

NUDE_SUFFIX = (
    "flawless silky smooth even skin tone across entire body, perfectly clean and uniform, "
    "realistic skin stretching and folding at joints, "
    "two arms two legs with five fingers and five toes each, "
    "correct proportions realistic human anatomy, "
)

# ─── EXPLICIT Anti-Artifact Block (NEW for v2.5 — CRITICAL) ──────────────
# This block is injected into every explicit image to fight:
#  - Extra orifices (model invents holes when fingers/toys penetrate)
#  - Fused fingers (fingers melt into skin instead of showing insertion)
#  - Duplicate genitals (model panics and creates second vulva/anus)
#  - Phantom limbs (hands between legs spawn extra hands)

EXPLICIT_ANTI_ARTIFACT = (
    "two arms two legs with five fingers and five toes each, "
    "single vaginal opening only, no extra orifices, no duplicate genitals, "
    "single anus only, correct human anatomy, "
    "finger and toy enter existing openings only, do not create new holes, "
    "no additional orifices anywhere in frame, "
    "fingers remain distinct and separate from skin, no fusing, "
    "two hands maximum visible in frame, ten fingers total, "
)

# ─── Dynamic LoRA Stacks (Phase A — T01-T10) ──────────────────────────────
# Each entry is a list of {file, strength} dicts. The Modal endpoint layers
# these on top of the baked face+body LoRAs at request time, then unloads.
#
# Strategy:
#   - 1 universal NSFW enabler (klein-unchained-v2 OR flux-klein-nsfw-v2)
#   - 1-2 pose/act specialists matched to the scene
#   - optional realism booster (ultra-real-v4) for soft-light scenes
#
# All filenames below MUST exist on the holly-lora-weights Modal volume.
# (See `modal volume ls holly-lora-weights` to verify.)

T_LORA_STACKS = {
    # T01 self-pleasure hand between legs — insertion + realism
    "T01": [
        {"file": "klein-unchained-v2.safetensors", "strength": 0.80},
        {"file": "insertkit.safetensors",           "strength": 0.65},
        {"file": "ultra-real-v4.safetensors",       "strength": 0.40},
    ],
    # T02 single finger insertion closeup — insertion + pussy detail
    "T02": [
        {"file": "flux-klein-nsfw-v2.safetensors",  "strength": 0.80},
        {"file": "insertkit.safetensors",           "strength": 0.70},
        {"file": "pusfix-klein.safetensors",        "strength": 0.50},
    ],
    # T03 dildo insertion medium — insertion specialist
    "T03": [
        {"file": "klein-unchained-v2.safetensors",  "strength": 0.80},
        {"file": "insertkit.safetensors",           "strength": 0.70},
    ],
    # T04 vibrator on clit closeup — external, pussy detail only
    "T04": [
        {"file": "flux-klein-nsfw-v2.safetensors",  "strength": 0.80},
        {"file": "pusfix-klein.safetensors",        "strength": 0.60},
    ],
    # T05 hands spreading vulva — spread specialist + pussy detail
    "T05": [
        {"file": "klein-unchained-v2.safetensors",  "strength": 0.80},
        {"file": "spread-pussy-v1.safetensors",     "strength": 0.70},
        {"file": "pusfix-klein.safetensors",        "strength": 0.50},
    ],
    # T06 bent-over from behind — from-behind anal/vulva specialist
    "T06": [
        {"file": "klein-unchained-v2.safetensors",      "strength": 0.80},
        {"file": "thong-over-anus-v1.safetensors",      "strength": 0.70},
    ],
    # T07 all-fours from behind — anal + ass volume
    "T07": [
        {"file": "klein-unchained-v2.safetensors",      "strength": 0.85},
        {"file": "thong-over-anus-v1.safetensors",      "strength": 0.70},
        {"file": "phat-ass-v1.safetensors",             "strength": 0.40},
    ],
    # T08 spreading cheeks closeup — anal detail + pussy detail
    "T08": [
        {"file": "flux-klein-nsfw-v2.safetensors",      "strength": 0.80},
        {"file": "thong-over-anus-v1.safetensors",      "strength": 0.70},
        {"file": "pusfix-klein.safetensors",            "strength": 0.50},
    ],
    # T09 one-leg-up bent from behind — anal detail
    "T09": [
        {"file": "klein-unchained-v2.safetensors",      "strength": 0.80},
        {"file": "thong-over-anus-v1.safetensors",      "strength": 0.70},
    ],
    # T10 post-orgasm wet arousal — no insertion, just realism + enabler
    "T10": [
        {"file": "klein-unchained-v2.safetensors",  "strength": 0.75},
        {"file": "ultra-real-v4.safetensors",       "strength": 0.50},
    ],
}

# ─── Caption Template (same trigger as v1) ───────────────────────────────

CAPTION_BODY = (
    "h0lly-body, olive skin tone, 5'4\" petite frame, hourglass figure, "
    "26-inch waist, 37-inch hips, flat stomach with faint abs, "
    "natural 34C breasts teardrop shape, plump round heart-shaped butt, "
    "clear flawless smooth skin, Brazilian wax smooth pubic area, "
    "small feminine feet with five perfect toes, "
    "delicate hands with five slender fingers, "
    "shapely legs, two small dimples on lower back, "
    "small labia minora, single vaginal opening only, "
    "single anus only, correct human anatomy"
)

# ─── View-to-Detail Mapping ───────────────────────────────────────────────

VIEW_DETAILS = {
    "front": NUDE_FRONT,
    "back": NUDE_BACK,
    "back_bend": NUDE_BEND_BACK,
    "lying_open": NUDE_LYING_OPEN,
    "detail_front": NUDE_DETAIL_FRONT,
    "detail_back": NUDE_DETAIL_BACK,
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE A — TEST BATCH (10 riskiest images)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# These MUST pass Steve's review before mass generation begins.
# If any produce extra orifices, fused fingers, or duplicate genitals,
# we iterate prompts BEFORE running the other 290 images.

TEST_IMAGES = [

    # T01: Self-pleasure hand between legs, lying back, full body
    {
        "id": "T01", "name": "self-pleasure-hand-pubic-lying-back",
        "nude": True, "view": "front", "explicit": True,
        "pose": (
            "lying on back on bed with head on pillow, full body visible from above at slight angle, "
            "right hand resting on pubic mound with middle finger gently inserting into single vaginal opening, "
            "finger disappears into existing opening only, no other holes anywhere, "
            "left hand resting naturally on left breast, "
            "eyes closed in pleasure, mouth slightly parted, "
            "flushed chest and cheeks, erect nipples, "
            "two arms two hands five fingers each, no extra fingers, "
            "single vulva with waxed smooth pussy, labia majora parted naturally by finger, "
            "small labia minora visible, single vaginal opening only, "
            "no extra orifices, no duplicate genitals, correct human anatomy, "
            "single innie navel, natural 34C breasts teardrop shape, "
            "auburn hair spread on pillow, photorealistic, full body shot, warm bedroom lighting"
        ),
        "caption": f"{CAPTION_BODY}, lying on back, hand between legs, self-pleasure, "
                   "eyes closed, flushed, photorealistic, full body shot, warm bedroom lighting",
    },

    # T02: Single finger insertion close-up
    {
        "id": "T02", "name": "single-finger-insertion-closeup",
        "nude": True, "view": "detail_front", "explicit": True,
        "pose": (
            "extreme close-up between legs from front, "
            "single right index finger gently inserting into single vaginal opening, "
            "finger visible entering existing opening, no extra orifices anywhere, "
            "labia majora parted naturally by finger, small labia minora visible, "
            "waxed smooth pussy, anatomically correct vulva positioned very low on pelvis, "
            "only one hand visible in frame with five fingers, "
            "correct hand anatomy, no extra fingers, no fusing with skin, "
            "no additional openings, no duplicate genitals, "
            "photorealistic, high detail, studio lighting"
        ),
        "caption": f"{CAPTION_BODY}, close-up finger insertion, single finger in vagina, "
                   "photorealistic, high detail, studio lighting",
    },

    # T03: Dildo insertion medium shot
    {
        "id": "T03", "name": "dildo-insertion-medium-shot",
        "nude": True, "view": "front", "explicit": True,
        "pose": (
            "lying back propped on elbows, medium shot from waist to mid-thigh, "
            "smooth pink silicone dildo entering single vaginal opening, "
            "toy disappears into existing orifice only, no new holes anywhere, "
            "two hands visible holding toy, five fingers each hand, no extra fingers, "
            "flushed skin, eyes half-closed looking down, mouth open in pleasure, "
            "no extra orifices, single vaginal opening only, no duplicate genitals, "
            "two arms, correct human anatomy, "
            "waxed smooth pussy, labia parted by toy, small labia minora visible, "
            "natural 34C breasts teardrop shape with erect nipples, "
            "photorealistic, medium shot, warm bedroom lighting"
        ),
        "caption": f"{CAPTION_BODY}, lying back, dildo insertion, two hands holding toy, "
                   "photorealistic, medium shot, warm lighting",
    },

    # T04: Vibrator on clit close-up
    {
        "id": "T04", "name": "vibrator-on-clit-closeup",
        "nude": True, "view": "detail_front", "explicit": True,
        "pose": (
            "extreme close-up between legs from front, "
            "pink wand vibrator resting on clitoral hood above vulva, no penetration, "
            "two hands visible holding vibrator, five fingers each hand, no extra fingers, "
            "single vulva visible, labia parted naturally, small labia minora visible, "
            "waxed smooth pussy, anatomically correct vulva positioned very low on pelvis, "
            "no extra orifices, no duplicate genitals, correct anatomy, "
            "vibrator head touches clitoral area only, does not create new openings, "
            "photorealistic, high detail, studio lighting"
        ),
        "caption": f"{CAPTION_BODY}, close-up vibrator on clitoris, two hands holding wand, "
                   "photorealistic, high detail, studio lighting",
    },

    # T05: Hands spreading vulva from front detail
    {
        "id": "T05", "name": "hands-spreading-vulva-front-detail",
        "nude": True, "view": "detail_front", "explicit": True,
        "pose": (
            "close-up between legs from front, "
            "two hands with five fingers each spreading outer labia apart to reveal inner anatomy, "
            "reveal labia minora, clitoral hood, single vaginal opening, "
            "no extra orifices, single vaginal opening only, no duplicate genitals, "
            "two hands only, ten fingers total, correct hand anatomy, no extra fingers, "
            "waxed smooth pussy, anatomically correct vulva positioned very low on pelvis, "
            "small labia minora visible, fingers separate from skin no fusing, "
            "photorealistic, high detail, studio lighting"
        ),
        "caption": f"{CAPTION_BODY}, close-up two hands spreading labia, revealing inner anatomy, "
                   "photorealistic, high detail, studio lighting",
    },

    # T06: Bent-over looking back spread (v1 recovery, full body)
    {
        "id": "T06", "name": "bent-over-looking-back-spread",
        "nude": True, "view": "back", "explicit": True,
        "pose": (
            "standing bent over from behind looking back over shoulder, "
            "hands on knees, legs slightly spread, "
            "both vulva and anus clearly visible from behind, "
            "extremely short one-inch perineum connecting vulva to anus, "
            "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
            "realistic anatomically correct vulva with natural cleft visible, "
            "labia majora meeting evenly, small labia minora visible, "
            "heart-shaped butt, correct anatomy, two arms two legs, "
            "silky smooth even skin, studio lighting, full body shot, photorealistic"
        ),
        "caption": f"{CAPTION_BODY}, bent over from behind looking back, "
                   "vulva and anus visible, short perineum, heart-shaped butt, "
                   "photorealistic, full body shot, studio lighting",
    },

    # T07: All-fours looking back spread (v1 recovery, full body)
    {
        "id": "T07", "name": "all-fours-looking-back-spread",
        "nude": True, "view": "back", "explicit": True,
        "pose": (
            "on all fours on bed, looking back over shoulder, "
            "both vulva and anus clearly visible from behind, "
            "extremely short one-inch perineum connecting vulva to anus, "
            "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
            "realistic anatomically correct vulva with natural cleft visible, "
            "labia majora meeting evenly, small labia minora visible, "
            "two hands on bed flat, five fingers each, no extra fingers, "
            "two knees on bed, two feet with five toes each, "
            "heart-shaped butt, correct anatomy two arms two legs, "
            "silky smooth even skin, studio lighting, full body shot, photorealistic"
        ),
        "caption": f"{CAPTION_BODY}, on all fours looking back, "
                   "vulva and anus visible, short perineum, heart-shaped butt, "
                   "photorealistic, full body shot, studio lighting",
    },

    # T08: Bent-over spreading cheeks closeup (v1 recovery, detail)
    {
        "id": "T08", "name": "bent-over-spreading-cheeks-closeup",
        "nude": True, "view": "detail_back", "explicit": True,
        "pose": (
            "close-up from behind, standing bent over, both hands spreading butt cheeks apart, "
            "two hands only, five fingers each, no extra fingers, fingers separate from skin, "
            "both vulva and anus clearly visible, "
            "extremely short one-inch perineum connecting bottom of vulva directly to top of anus, "
            "pink-brown anus with slightly darker pigmentation around opening, "
            "realistic radial wrinkled sphincter texture, "
            "realistic anatomically correct vulva with natural cleft, "
            "labia majora meeting evenly, small labia minora visible, "
            "no extra orifices, single vaginal opening, single anus only, "
            "silky smooth even skin, studio lighting, photorealistic, high detail"
        ),
        "caption": f"{CAPTION_BODY}, close-up bent over spreading cheeks, "
                   "vulva and anus visible, short perineum, sphincter texture, "
                   "photorealistic, studio lighting",
    },

    # T09: One-leg-up bent from behind (v1 recovery, full body)
    {
        "id": "T09", "name": "one-leg-up-bent-from-behind",
        "nude": True, "view": "back", "explicit": True,
        "pose": (
            "standing, one leg raised up resting on surface, bent forward slightly, "
            "looking back over shoulder, "
            "both vulva and anus clearly visible from behind, "
            "extremely short one-inch perineum connecting vulva to anus, "
            "pink-brown anus with slightly darker pigmentation and realistic radial wrinkled sphincter texture, "
            "realistic anatomically correct vulva with natural cleft visible, "
            "small labia minora visible, "
            "one foot on floor with five toes, one foot raised with five toes, "
            "two arms two legs, correct anatomy, "
            "heart-shaped butt, silky smooth even skin, "
            "studio lighting, full body shot, photorealistic"
        ),
        "caption": f"{CAPTION_BODY}, one leg up bent forward from behind, "
                   "vulva and anus visible, short perineum, heart-shaped butt, "
                   "photorealistic, full body shot, studio lighting",
    },

    # T10: Post-orgasm wet arousal (full body)
    {
        "id": "T10", "name": "post-orgasm-wet-arousal",
        "nude": True, "view": "front", "explicit": True,
        "pose": (
            "lying on back on rumpled sheets, head on pillow, "
            "post-orgasm afterglow, satisfied sleepy smile, eyes half-closed dreamily, "
            "flushed chest and cheeks, sweaty sheen across forehead and collarbone, "
            "glistening wetness on inner thighs and pubic mound evidence of natural arousal, "
            "wetness visible as natural lubrication on labia and upper thighs, "
            "hands resting at sides relaxed, two arms two hands five fingers each, no extra fingers, "
            "single vulva visible, waxed smooth pussy, no extra orifices, "
            "small labia minora visible, single vaginal opening only, no duplicate genitals, "
            "natural 34C breasts teardrop shape, single innie navel, "
            "auburn hair spread on pillow, photorealistic, full body shot, warm afterglow lighting"
        ),
        "caption": f"{CAPTION_BODY}, lying on back post-orgasm, satisfied smile, flushed, "
                   "wet inner thighs, sweaty sheen, photorealistic, full body shot, warm afterglow lighting",
    },
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OTHER CATEGORIES (placeholders — to be filled in after Phase A passes review)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOVERY_V1 = []  # T06-T09 cover these; will be removed from this list
AROUSAL = []       # 30 images — fill after Phase A
SELF_PLEASURE = [] # 25 images — fill after Phase A
FRONTAL_SPREAD = []
OUTFIT = []
LOCATION = []
LIGHTING = []
POV = []
PARTIAL_CLOTHED = []
CROSS_LIGHTING = []
OUTFIT_POSE = []
AROUSAL_POSE = []
EXPRESSION = []

CATEGORY_MAP = {
    "test": TEST_IMAGES,
    "recovery_v1": RECOVERY_V1,
    "arousal": AROUSAL,
    "self_pleasure": SELF_PLEASURE,
    "frontal_spread": FRONTAL_SPREAD,
    "outfit": OUTFIT,
    "location": LOCATION,
    "lighting": LIGHTING,
    "pov": POV,
    "partial_clothed": PARTIAL_CLOTHED,
    "cross_lighting": CROSS_LIGHTING,
    "outfit_pose": OUTFIT_POSE,
    "arousal_pose": AROUSAL_POSE,
    "expression": EXPRESSION,
}


# ─── Prompt Builder ──────────────────────────────────────────────────────

def build_prompt(entry: dict) -> str:
    """Build the full generation prompt from an image entry."""
    is_explicit = entry.get("explicit", False)

    if entry["nude"]:
        # Nude: opener first (highest attention), then body + nude extras
        full_prompt = NUDE_OPENER + BODY_PREFIX + NUDE_BODY_EXTRA
        view = entry.get("view", "front")
        if view in VIEW_DETAILS:
            full_prompt += VIEW_DETAILS[view]
        full_prompt += NUDE_SUFFIX

        # Explicit images get extra anti-artifact reinforcement
        if is_explicit:
            full_prompt += EXPLICIT_ANTI_ARTIFACT
    else:
        full_prompt = BODY_PREFIX + "realistic opaque clothing with visible fabric texture weave and folds, clothing drapes naturally over body with proper fit and weight, two arms two legs with five fingers and five toes each, realistic proportions, "

    full_prompt += entry["pose"]
    return full_prompt


# ─── Generation ──────────────────────────────────────────────────────────

def generate_image(entry: dict, attempts: int = 3, save_all: bool = True) -> bool:
    """Generate a training image with multiple attempts.

    Args:
        entry: Image definition dict
        attempts: Number of attempts per image
        save_all: If True, save every attempt separately for review.
                  If False, only save the best (largest file).

    Returns True if at least one attempt succeeded.
    """
    img_id = entry["id"]
    name = entry["name"]
    full_prompt = build_prompt(entry)
    caption = entry["caption"]

    # Resolve dynamic LoRA stack for this image.
    # Priority: entry["loras"] (per-entry override) > T_LORA_STACKS[id] > none
    lora_stack = entry.get("loras") or T_LORA_STACKS.get(img_id) or []
    if lora_stack:
        stack_str = ", ".join(f"{s['file']}@{s['strength']}" for s in lora_stack)
        print(f"  🎭 [{img_id}] LoRA stack: {stack_str}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if save_all:
        (ATTEMPTS_DIR / img_id).mkdir(parents=True, exist_ok=True)

    best_data = None
    best_size = 0
    best_attempt = 0
    best_headers = None
    attempt_datas = []  # [(attempt_num, data), ...]

    for attempt in range(1, attempts + 1):
        # Different seed per attempt
        seed = int(img_id.replace("T", "").replace("A", "").replace("B", "").replace("C", "").replace("D", "").replace("E", "").replace("F", "").lstrip("0") or "1") * [311, 467, 593, 701, 823][(attempt - 1) % 5] + [177, 283, 419, 503, 631][(attempt - 1) % 5]

        payload = {
            "prompt": full_prompt,
            "width": 1024,
            "height": 1024,
            "num_inference_steps": 32,
            "guidance_scale": 3.5,
            "seed": seed,
            "format": "webp",
        }
        if lora_stack:
            payload["loras"] = lora_stack

        try:
            t0 = time.time()
            resp = requests.post(MODAL_URL, json=payload, timeout=600, allow_redirects=True)
            elapsed = time.time() - t0

            if resp.status_code != 200:
                print(f"  ❌ [{img_id}] Attempt {attempt}/{attempts}: HTTP {resp.status_code} ({elapsed:.1f}s)")
                continue

            content_type = resp.headers.get("Content-Type", "")
            if "image" not in content_type:
                print(f"  ❌ [{img_id}] Attempt {attempt}/{attempts}: Non-image response ({elapsed:.1f}s)")
                continue

            size = len(resp.content)
            dyn_applied = resp.headers.get("X-Dynamic", "none")
            print(f"  🎨 [{img_id}] Attempt {attempt}/{attempts}: {size/1024:.0f} KB ({elapsed:.1f}s) | dyn={dyn_applied}")

            if size > best_size:
                best_size = size
                best_data = resp.content
                best_attempt = attempt
                best_headers = dict(resp.headers)

            if save_all:
                attempt_datas.append((attempt, resp.content, seed))

        except Exception as e:
            print(f"  ❌ [{img_id}] Attempt {attempt}/{attempts}: {e}")

        # Rate limit between attempts
        if attempt < attempts:
            time.sleep(2)

    if not best_data:
        print(f"  💀 [{img_id}] {name} — ALL {attempts} attempts failed")
        return False

    # Save best as primary
    img_path = OUTPUT_DIR / f"{img_id}_{name}.webp"
    with open(img_path, "wb") as f:
        f.write(best_data)

    # Save caption
    caption_path = OUTPUT_DIR / f"{img_id}_{name}.txt"
    with open(caption_path, "w") as f:
        f.write(caption)

    # Save all attempts separately if requested
    if save_all and attempt_datas:
        for attempt_num, data, seed in attempt_datas:
            attempt_path = ATTEMPTS_DIR / img_id / f"{img_id}_{name}_attempt{attempt_num}_seed{seed}.webp"
            with open(attempt_path, "wb") as f:
                f.write(data)

    size_kb = best_size / 1024
    print(f"  ✅ [{img_id}] {name} — best attempt {best_attempt} ({size_kb:.0f} KB)")
    if save_all:
        print(f"      All {len(attempt_datas)} attempts saved to: {ATTEMPTS_DIR / img_id}")
    return True


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate Holly Body LoRA v2.5 NSFW dataset")
    parser.add_argument("--test", action="store_true", help="Run only the 10-image test batch (Phase A)")
    parser.add_argument("--category", type=str, help="Run specific category (see CATEGORY_MAP)")
    parser.add_argument("--count", type=int, help="Only generate first N images")
    parser.add_argument("--start", type=int, default=0, help="Skip first N images")
    parser.add_argument("--attempts", type=int, default=3, help="Attempts per image (default: 3)")
    parser.add_argument("--no-save-all", action="store_true", help="Only save best attempt (skip per-attempt saves)")
    args = parser.parse_args()

    # Determine which images to generate
    if args.test:
        images = TEST_IMAGES
        print("\n🧪 PHASE A — TEST BATCH (10 riskiest images)")
    elif args.category:
        if args.category not in CATEGORY_MAP:
            print(f"❌ Unknown category: {args.category}")
            print(f"   Available: {', '.join(CATEGORY_MAP.keys())}")
            sys.exit(1)
        images = CATEGORY_MAP[args.category]
        if not images:
            print(f"⚠️  Category '{args.category}' is empty (placeholder — fill in after Phase A)")
            sys.exit(0)
        print(f"\n📦 CATEGORY: {args.category} ({len(images)} images)")
    else:
        all_images = []
        for cat_images in CATEGORY_MAP.values():
            all_images.extend(cat_images)
        images = all_images
        print(f"\n🚀 FULL DATASET ({len(images)} images)")

    # Apply --start and --count
    if args.start > 0:
        images = images[args.start:]
    if args.count:
        images = images[:args.count]

    if not images:
        print("❌ No images to generate.")
        sys.exit(0)

    save_all = not args.no_save_all

    print(f"\n{'='*60}")
    print(f"  Holly Body LoRA v2.5 Dataset Generator")
    print(f"{'='*60}")
    print(f"  Endpoint: {MODAL_URL}")
    print(f"  Output:   {OUTPUT_DIR}")
    print(f"  Images:   {len(images)}")
    print(f"  Attempts: {args.attempts} per image")
    print(f"  Save all: {save_all}")
    print(f"  Total API calls: {len(images) * args.attempts}")
    print(f"  Est. time: ~{len(images) * args.attempts * 35 // 60} min on A100")
    print(f"  Trigger: h0lly-body")
    print(f"{'='*60}\n")

    success = 0
    failed = 0
    failed_names = []
    skipped = 0

    for i, entry in enumerate(images, 1):
        img_id = entry["id"]
        name = entry["name"]

        # Resumable: skip if final image already exists
        final_path = OUTPUT_DIR / f"{img_id}_{name}.webp"
        if final_path.exists():
            print(f"[{i}/{len(images)}] ⏭️  [{img_id}] {name} — already exists, skipping")
            skipped += 1
            continue

        print(f"[{i}/{len(images)}] 🎨 Generating [{img_id}] {name}...")
        ok = generate_image(entry, args.attempts, save_all=save_all)
        if ok:
            success += 1
        else:
            failed += 1
            failed_names.append(f"{img_id}_{name}")

        # Rate limit between images
        if i < len(images):
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"✅ Generated: {success}")
    print(f"⏭️  Skipped:   {skipped}")
    if failed:
        print(f"❌ Failed:    {failed}")
        for name in failed_names:
            print(f"   - {name}")
    print(f"{'='*60}")

    if save_all and success > 0:
        print(f"\n📸 ALL ATTEMPTS SAVED FOR REVIEW:")
        print(f"   {ATTEMPTS_DIR}")
        print(f"   Each image has {args.attempts} attempts saved separately.")
        print(f"   Review these alongside the 'best' pick in {OUTPUT_DIR}")

    print(f"\n📦 TO UPLOAD TO CIVITAI (after Phase A review):")
    print(f"   1. Review all images in {OUTPUT_DIR}")
    print(f"   2. Reject/re-roll any with extra orifices, fused fingers, etc.")
    print(f"   3. Zip: cd {OUTPUT_DIR.parent} && zip -r holly-body-lora-dataset-v25.zip holly-body-lora-dataset-v25/")
    print(f"   4. Civitai → Create → Training")
    print(f"   5. Upload zip (images + .txt captions)")
    print(f"   6. Trigger: h0lly-body")
    print(f"   7. Settings: 15 epochs, lr 0.0001, dim 64, alpha 32, res 1024")
    print(f"   8. Flip augmentation: OFF")


if __name__ == "__main__":
    main()
