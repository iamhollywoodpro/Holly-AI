#!/usr/bin/env python3
"""
HOLLY Body LoRA Training Dataset Generator v2.0
=================================================
Generates 84 full-body reference images + Civitai caption files (.txt)
for training h0lly-body v1.0 LoRA on Civitai.

- 3 attempts per image, auto-selects best (largest file = most detail)
- Brazilian wax smooth pubic area (completely hairless)
- Realistic anatomically correct genitalia (vulva + anus)
- Anti-artifact prompting for hands, feet, limbs
- Context-aware genitalia detail based on camera angle

Usage:
    python scripts/generate-body-lora-dataset.py           # Generate all
    python scripts/generate-body-lora-dataset.py --start 10 # Resume from image 10
    python scripts/generate-body-lora-dataset.py --count 5   # First 5 only (test)
    python scripts/generate-body-lora-dataset.py --attempts 1 # Single attempt (faster)

Requirements:
    pip install requests
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path

MODAL_URL = "https://iamhollywoodpro--generate-holly.modal.run"
OUTPUT_DIR = Path(__file__).parent.parent / "holly-body-lora-dataset"
ATTEMPTS_DIR = OUTPUT_DIR / "_attempts"

# ─── Body Description (injected into every generation prompt) ──────────────
# Uses h0lly trigger (face LoRA) so the face is consistent in every shot

BODY_PREFIX = (
    "h0lly, "
    "hair length exactly three inches past shoulders ending at mid-chest level, "
    "small feminine feet size 6 with high arches and five perfect toes, "
    "delicate hands with five slender fingers, "
    "silky smooth flawless skin with well-moisturized sheen, skin stretches taut when extending and creases naturally when bending, "
)

# Extra details only for NUDE images — keeps clothed prompts clean
NUDE_BODY_EXTRA = (
    "waxed smooth pussy completely smooth and clean, "
)

# ─── Context-Aware Nude Body Details ──────────────────────────────────────
# Added based on camera angle — what the camera would actually see

NUDE_FRONT = (
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "waxed smooth pussy, labia majora meeting evenly at rest, "
    "rosy-pink nipples slightly upturned, medium circular areolas, "
)

NUDE_BACK = (
    "visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "heart-shaped butt with natural crease underneath, "
    "two small dimples on lower back, silky smooth even skin, "
)

NUDE_LYING_FRONT = (
    "breasts settled naturally to sides, rosy-pink nipples pointing slightly upward, "
    "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
    "single small vertical innie navel in correct position below ribs, "
    "waxed smooth pussy, "
)

NUDE_LYING_OPEN = (
    "breasts settled naturally to sides, nipples pointing up, "
    "realistic vulva positioned very low on the pelvis directly below the pubic bone, "
    "slightly parted labia and visible inner lips, "
    "small vaginal opening slightly visible, "
    "single small vertical innie navel in correct position, "
    "waxed smooth pussy, "
)

NUDE_LYING_STOMACH = (
    "breasts pressed against surface, silky smooth back visible, "
    "two small dimples on lower back, graceful spine curve, "
    "heart-shaped butt pressed slightly, feet with five toes visible, "
)

NUDE_BEND_BACK = (
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
    "heart-shaped butt, visible small pink-brown anus positioned very high between the buttocks directly below the vulva, "
    "separated only by the extremely short one-inch perineum, slightly darker pigmentation, "
    "realistic radial wrinkled sphincter texture, anatomically correct, "
    "silky smooth even skin, "
)

# ─── Anti-Artifact Suffix (appended to ALL nude generation prompts) ──────
# POSITIVE FRAMING: describe what IS visible (bare skin), not what ISN'T
# Diffusion models respond much better to positive descriptions than negations

# This opener goes FIRST in the prompt for nude images — the model pays the
# most attention to the beginning of the prompt
NUDE_OPENER = (
    "FULLY NUDE naked woman, completely bare body from neck to toes, "
)

NUDE_SUFFIX = (
    "flawless silky smooth even skin tone across entire body, perfectly clean and uniform, "
    "realistic skin stretching and folding at joints, "
    "two arms two legs with five fingers and five toes each, "
    "correct proportions realistic human anatomy, "
)

CLOTHED_SUFFIX = (
    "realistic opaque clothing with visible fabric texture weave and folds, "
    "clothing drapes naturally over body with proper fit and weight, "
    "two arms two legs with five fingers and five toes each, "
    "realistic proportions, "
)

# ─── Caption Template (for Civitai .txt files) ───────────────────────────
# Uses h0lly-body trigger word (different from face LoRA h0lly)

CAPTION_BODY = (
    "h0lly-body, olive skin tone, 5'4\" petite frame, hourglass figure, "
    "26-inch waist, 37-inch hips, flat stomach with faint abs, "
    "natural 34C breasts teardrop shape, plump round heart-shaped butt, "
    "clear flawless smooth skin, Brazilian wax smooth pubic area, "
    "small feminine feet with five perfect toes, "
    "delicate hands with five slender fingers, "
    "shapely legs, two small dimples on lower back"
)

# ─── All 84 Training Images ───────────────────────────────────────────────

IMAGES = []

# ━━━ FRONT-FACING (15 images) ━━━

IMAGES += [
    {
        "id": "001", "name": "front-standing-neutral",
        "nude": True, "view": "front",
        "pose": "standing facing camera, arms relaxed at sides, full nude, neutral calm expression, "
                "correct single navel, realistic proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, arms at sides, full nude, "
                   "auburn hair loose waves, green eyes, neutral expression, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "002", "name": "front-standing-neutral-slight-left",
        "nude": True, "view": "front",
        "pose": "standing facing camera slightly turned left, arms at sides, full nude, neutral expression, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front slight left angle, arms at sides, full nude, "
                   "auburn hair loose waves, green eyes, neutral expression, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "003", "name": "front-standing-neutral-slight-right",
        "nude": True, "view": "front",
        "pose": "standing facing camera slightly turned right, arms relaxed at sides, full nude, "
                "bare body fully exposed, neutral expression, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front slight right angle, arms at sides, full nude, "
                   "auburn hair loose waves, green eyes, neutral expression, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "004", "name": "front-hands-on-hips-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, hands on hips, confident pose, full nude, "
                "bare body fully exposed, "
                "slight smile, correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, hands on hips, full nude, "
                   "confident pose, auburn hair loose waves, green eyes, slight smile, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "005", "name": "front-arms-raised-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, arms raised above head stretching, full nude, "
                "bare body exposed, relaxed expression, "
                "correct anatomy two arms only, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, arms raised above head, full nude, "
                   "stretching, auburn hair loose waves, green eyes, relaxed, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "006", "name": "front-hand-behind-head-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, right hand behind head, full nude, "
                "bare body exposed, flirty expression, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, hand behind head, full nude, "
                   "flirty expression, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "007", "name": "front-walking-nude",
        "nude": True, "view": "front",
        "pose": "walking toward camera mid-stride, full nude, bare body bare legs, "
                "dynamic natural movement, correct leg anatomy, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, walking toward camera mid-stride, full nude, "
                   "dynamic pose, auburn hair loose waves, green eyes, natural movement, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "008", "name": "front-form-fitting-dress",
        "nude": False, "view": "front",
        "pose": "standing facing camera, wearing tight black form-fitting dress showing hourglass figure, "
                "arms at sides, confident pose, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, tight black form-fitting dress, "
                   "hourglass figure visible, confident pose, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "009", "name": "front-bikini",
        "nude": False, "view": "front",
        "pose": "standing facing camera, wearing white string bikini, arms at sides, "
                "beach setting, sunny natural lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, white string bikini, "
                   "beach setting, auburn hair loose waves, green eyes, warm smile, photorealistic, full body shot, natural lighting",
    },
    {
        "id": "010", "name": "front-athletic-wear",
        "nude": False, "view": "front",
        "pose": "standing facing camera, wearing black leggings and grey sports bra, "
                "athletic pose, gym setting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, black leggings and grey sports bra, "
                   "athletic, auburn hair ponytail, green eyes, confident, photorealistic, full body shot, gym lighting",
    },
    {
        "id": "011", "name": "front-casual",
        "nude": False, "view": "front",
        "pose": "standing facing camera, wearing fitted blue jeans and white t-shirt, "
                "casual relaxed pose, urban setting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, fitted blue jeans and white t-shirt, "
                   "casual, auburn hair loose waves, green eyes, relaxed smile, photorealistic, full body shot, natural lighting",
    },
    {
        "id": "012", "name": "front-lingerie",
        "nude": False, "view": "front",
        "pose": "standing facing camera, wearing black lace bra and matching lace bottoms, "
                "seductive pose, bedroom setting, soft warm lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, black lace lingerie set, "
                   "seductive pose, auburn hair loose waves, green eyes, alluring, photorealistic, full body shot, warm lighting",
    },
    {
        "id": "013", "name": "front-standing-nude-warm",
        "nude": True, "view": "front",
        "pose": "standing facing camera, arms relaxed at sides, full nude, bare body exposed, "
                "warm smile, soft golden hour lighting, correct proportions, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, arms relaxed, full nude, "
                   "warm smile, auburn hair catching light, green eyes, photorealistic, full body shot, golden hour lighting",
    },
    {
        "id": "014", "name": "front-standing-nude-looking-down",
        "nude": True, "view": "front",
        "pose": "standing facing camera, looking down slightly, arms at sides, full nude, "
                "bare body fully exposed, shy expression, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, looking down, full nude, "
                   "shy expression, auburn hair falling forward, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "015", "name": "front-crossed-arms-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, arms crossed below chest, full nude, "
                "bare body exposed, confident expression, "
                "correct anatomy two arms only, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, arms crossed, full nude, "
                   "confident expression, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
]

# ━━━ BACK-FACING (10 images) ━━━

IMAGES += [
    {
        "id": "016", "name": "back-standing-nude",
        "nude": True, "view": "back",
        "pose": "standing back to camera, arms at sides, full nude, looking straight ahead, "
                "smooth back, spine curve, dimples, correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, arms at sides, full nude, "
                   "smooth back, graceful spine curve, dimples on lower back, small pink anus, auburn hair down back, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "017", "name": "back-standing-nude-angle",
        "nude": True, "view": "back",
        "pose": "standing back to camera slightly angled, arms at sides, full nude, "
                "smooth back, dimples, correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera slight angle, arms at sides, full nude, "
                   "smooth back, auburn hair down back, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "018", "name": "back-looking-over-shoulder-nude",
        "nude": True, "view": "back",
        "pose": "standing back to camera, looking over right shoulder, full nude, "
                "slight smile, smooth back, correct single nipple visible on side breast, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, looking over shoulder, full nude, "
                   "slight smile, smooth back, dimples, auburn hair over shoulder, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "019", "name": "back-hands-on-hips-nude",
        "nude": True, "view": "back",
        "pose": "standing back to camera, hands on hips, full nude, confident pose, "
                "smooth back, dimples, correct anatomy two arms, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, hands on hips, full nude, "
                   "confident, smooth back, dimples, heart-shaped butt, auburn hair down back, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "020", "name": "back-arms-raised-nude",
        "nude": True, "view": "back",
        "pose": "standing back to camera, arms raised above head, full nude, stretching, "
                "smooth back, dimples, correct anatomy two arms, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, arms raised, full nude, "
                   "stretching, smooth back, dimples, auburn hair up, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "021", "name": "back-bikini",
        "nude": False, "view": "back",
        "pose": "standing back to camera, wearing white string bikini, looking over shoulder, "
                "beach setting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, white string bikini, "
                   "looking over shoulder, beach, smooth back, dimples, auburn hair down back, photorealistic, full body shot, natural lighting",
    },
    {
        "id": "022", "name": "back-nude-hair-up",
        "nude": True, "view": "back",
        "pose": "standing back to camera, hair up in messy bun, arms at sides, full nude, "
                "showing neck and shoulders, smooth back, dimples, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, hair up, arms at sides, full nude, "
                   "neck and shoulders visible, smooth back, dimples, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "023", "name": "back-form-fitting-dress",
        "nude": False, "view": "back",
        "pose": "standing back to camera, wearing tight black form-fitting dress, "
                "looking over shoulder, elegant pose, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, tight black dress, "
                   "looking over shoulder, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "024", "name": "back-lingerie",
        "nude": False, "view": "back",
        "pose": "standing back to camera, wearing matching black lace bra and lace thong bottoms, "
                "bare back visible, looking over shoulder, soft warm lighting, "
                "full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, matching black lace bra and thong, "
                   "bare back, dimples, auburn hair over shoulder, green eyes, photorealistic, full body shot, warm lighting",
    },
    {
        "id": "025", "name": "back-nude-slight-bend",
        "nude": True, "view": "back_bend",
        "pose": "standing back to camera, slight natural bend at waist, full nude, "
                "smooth back, dimples, correct anatomy, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back to camera, slight bend, full nude, "
                   "natural pose, smooth back, dimples, heart-shaped butt, auburn hair down, photorealistic, full body shot, studio lighting",
    },
]

# ━━━ SIDE / PROFILE (10 images) ━━━

IMAGES += [
    {
        "id": "026", "name": "left-profile-standing-nude",
        "nude": True, "view": "front",
        "pose": "left profile standing, arms at sides, full nude, bare chest bare body, "
                "side view showing hourglass figure, correct proportions, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, left profile standing, arms at sides, full nude, "
                   "side view, hourglass figure, flat stomach, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "027", "name": "left-profile-standing-nude-2",
        "nude": True, "view": "front",
        "pose": "left profile standing, slight turn toward camera, full nude, "
                "bare chest bare body fully exposed, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, left profile standing, slight turn, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "028", "name": "right-profile-standing-nude",
        "nude": True, "view": "front",
        "pose": "right profile standing, arms at sides, full nude, "
                "bare chest bare body fully exposed, "
                "side view showing hourglass figure, correct proportions, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, right profile standing, arms at sides, full nude, "
                   "side view, hourglass figure, flat stomach, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "029", "name": "right-profile-standing-nude-2",
        "nude": True, "view": "front",
        "pose": "right profile standing, slight turn toward camera, full nude, "
                "bare body fully exposed, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, right profile standing, slight turn, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "030", "name": "three-quarter-left-nude",
        "nude": True, "view": "front",
        "pose": "three-quarter view from left, standing, full nude, bare body exposed, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, three-quarter view left, standing, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "031", "name": "three-quarter-right-nude",
        "nude": True, "view": "front",
        "pose": "three-quarter view from right, standing, full nude, bare body exposed, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, three-quarter view right, standing, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "032", "name": "left-profile-bikini",
        "nude": False, "view": "front",
        "pose": "left profile standing, wearing white string bikini, beach setting, "
                "full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, left profile standing, white bikini, beach, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, natural lighting",
    },
    {
        "id": "033", "name": "right-profile-athletic",
        "nude": False, "view": "front",
        "pose": "right profile standing, wearing black leggings and sports bra, "
                "gym setting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, right profile standing, black leggings and sports bra, "
                   "athletic, hourglass figure, auburn hair ponytail, green eyes, photorealistic, full body shot, gym lighting",
    },
    {
        "id": "034", "name": "left-profile-dress",
        "nude": False, "view": "front",
        "pose": "left profile standing, wearing red evening gown, elegant pose, "
                "full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, left profile standing, red evening gown, elegant, "
                   "hourglass figure, auburn hair up, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "035", "name": "right-profile-lingerie",
        "nude": False, "view": "front",
        "pose": "right profile standing, wearing black lace bra and matching lace bottoms, "
                "bedroom setting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, right profile standing, black lace lingerie, bedroom, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, warm lighting",
    },
]

# ━━━ SEATED / LYING (12 images) ━━━

IMAGES += [
    {
        "id": "036", "name": "sitting-chair-front-nude",
        "nude": True, "view": "front",
        "pose": "sitting on chair facing camera, legs together, full nude, "
                "bare body exposed, relaxed pose, correct leg anatomy two legs, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, sitting on chair front view, legs together, full nude, "
                   "relaxed, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "037", "name": "sitting-chair-side-nude",
        "nude": True, "view": "front",
        "pose": "sitting on chair side view, legs crossed naturally, full nude, "
                "bare body exposed, elegant pose, correct leg anatomy, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, sitting on chair side view, legs crossed, full nude, "
                   "elegant, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "038", "name": "sitting-floor-knees-up-nude",
        "nude": True, "view": "front",
        "pose": "sitting on floor, knees up, arms resting on knees, full nude, "
                "bare body exposed, two feet visible with five toes each, correct limb count, "
                "relaxed expression, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, sitting on floor, knees up, full nude, "
                   "relaxed, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "039", "name": "lying-back-nude-above",
        "nude": True, "view": "lying_open",
        "pose": "lying on back seen from above, full nude, arms relaxed at sides, "
                "single innie navel in correct position below ribs, "
                "realistic vulva positioned very low on the pelvis directly below the pubic bone, "
                "correct arm length, soft gaze, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on back seen from above, full nude, arms relaxed, "
                   "breasts settled naturally, single innie navel, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "040", "name": "lying-back-nude-side-angle",
        "nude": True, "view": "lying_front",
        "pose": "lying on back seen from slight angle, full nude, "
                "realistic vulva positioned very low on the pelvis directly below the pubic bone, "
                "single innie navel, correct proportions, "
                "relaxed, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on back seen from angle, full nude, "
                   "relaxed, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "041", "name": "lying-stomach-nude",
        "nude": True, "view": "lying_stomach",
        "pose": "lying on stomach, full nude, head turned to side, relaxed expression, "
                "five perfect toes on each foot, smooth even skin on butt, "
                "smooth back, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on stomach, full nude, head turned, "
                   "smooth back, dimples, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "042", "name": "lying-stomach-nude-angle",
        "nude": True, "view": "lying_stomach",
        "pose": "lying on stomach seen from slight angle, full nude, looking at camera, "
                "five perfect toes visible, smooth even skin, "
                "five separate distinct fingers on each hand, "
                "smooth back, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on stomach seen from angle, full nude, looking at camera, "
                   "smooth back, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "043", "name": "lying-side-nude",
        "nude": True, "view": "front",
        "pose": "lying on side, full nude, propped on one elbow, looking at camera, "
                "five perfectly formed toes on each foot in correct order, "
                "correct leg anatomy two legs, smooth clean skin, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on side, full nude, propped on elbow, "
                   "hourglass figure from side, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "044", "name": "sitting-chair-front-casual",
        "nude": False, "view": "front",
        "pose": "sitting on chair facing camera, legs crossed naturally, "
                "wearing white tank top and denim shorts, casual pose, "
                "correct leg anatomy, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, sitting on chair front view, legs crossed, "
                   "white tank top and denim shorts, casual, auburn hair loose waves, green eyes, photorealistic, full body shot, natural lighting",
    },
    {
        "id": "045", "name": "lying-back-lingerie",
        "nude": False, "view": "front",
        "pose": "lying on back on silk sheets, wearing red lace bra and matching red lace bottoms, "
                "complete body visible from head to toe with all four limbs, "
                "soft warm lighting, bedroom, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on back on silk sheets, red lace lingerie set, "
                   "soft warm lighting, hourglass figure, auburn hair spread, green eyes, photorealistic, full body shot, warm lighting",
    },
    {
        "id": "046", "name": "sitting-floor-nude-bright",
        "nude": True, "view": "front",
        "pose": "sitting on floor, legs spread casually, full nude, "
                "smooth clear skin on arms and legs, bare body exposed, "
                "bright studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, sitting on floor, legs spread, full nude, "
                   "bright lighting, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, bright studio lighting",
    },
    {
        "id": "047", "name": "lying-stomach-reading",
        "nude": False, "view": "front",
        "pose": "lying on stomach on bed, propped up on elbows, "
                "wearing white cotton bra and matching white cotton panties, "
                "both visible and properly fitted, smooth back, "
                "relaxed, bedroom, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on stomach on bed, propped on elbows, "
                   "white cotton bra and panties, relaxed, smooth back, dimples, auburn hair loose, photorealistic, full body shot, warm lighting",
    },
]

# ━━━ DYNAMIC / ACTION (8 images) ━━━

IMAGES += [
    {
        "id": "048", "name": "bending-over-back-nude",
        "nude": True, "view": "back_bend",
        "pose": "gentle natural forward bend from behind, hands touching knees, full nude, "
                "realistic well-proportioned body, smooth back, dimples, "
                "correct anatomy two arms two legs, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, gentle forward bend from behind, full nude, "
                   "smooth back, dimples, heart-shaped butt, auburn hair hanging down, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "049", "name": "bending-over-side-nude",
        "nude": True, "view": "front",
        "pose": "gentle forward bend from side view, full nude, "
                "bare chest bare body fully exposed, realistic well-proportioned body, "
                "correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, gentle forward bend side view, full nude, "
                   "hourglass figure, auburn hair loose, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "050", "name": "reaching-upward-nude",
        "nude": True, "view": "front",
        "pose": "reaching upward with both arms, standing, full nude, "
                "realistic anatomically correct vulva positioned very low on the pelvis directly below the pubic bone, "
                "dynamic pose, correct anatomy two arms, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, reaching upward, standing, full nude, "
                   "dynamic, hourglass figure, auburn hair loose waves, green eyes looking up, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "051", "name": "stretching-back-arched-nude",
        "nude": True, "view": "front",
        "pose": "stretching with arms up and back arched, standing, full nude, "
                "flat stomach, correct anatomy two arms, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, stretching arms up back arched, standing, full nude, "
                   "flat stomach, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "052", "name": "crouching-nude",
        "nude": True, "view": "front",
        "pose": "crouching squatting position, full nude, bare body exposed, "
                "correct leg anatomy, two feet with five toes, "
                "natural pose, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, crouching squatting, full nude, "
                   "natural pose, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "053", "name": "twisting-nude",
        "nude": True, "view": "back",
        "pose": "standing with torso twisted to look back, full nude, "
                "two arms only correct limb count, "
                "realistic well-shaped butt, "
                "dynamic twist, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing torso twisted looking back, full nude, "
                   "dynamic twist, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "054", "name": "hands-in-hair-nude",
        "nude": True, "view": "front",
        "pose": "standing with both hands in auburn hair, full nude, "
                "bare body exposed, two arms only five fingers each, "
                "sensual pose, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing hands in hair, full nude, "
                   "sensual, hourglass figure, auburn hair messy, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "055", "name": "walking-away-nude",
        "nude": True, "view": "back",
        "pose": "walking away from camera, full nude, mid-step, "
                "smooth even skin under breasts, smooth even skin texture, "
                "natural movement, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, walking away from camera, full nude, mid-step, "
                   "smooth back, dimples, heart-shaped butt, auburn hair down back, photorealistic, full body shot, studio lighting",
    },
]

# ━━━ DETAIL SHOTS (10 images) ━━━

IMAGES += [
    {
        "id": "056", "name": "torso-front-nude",
        "nude": True, "view": "detail_front",
        "pose": "close-up torso shot from chest to upper thighs, front view, full nude, "
                "natural 34C breasts teardrop shape, "
                "flawless silky smooth even skin texture, "
                "waxed smooth pussy, "
                "studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, torso close-up front view, full nude, "
                   "34C breasts teardrop shape, flat stomach with faint abs, single innie navel, "
                   "hourglass waist, Brazilian wax smooth pubic area, clear flawless smooth skin, photorealistic, studio lighting",
    },
    {
        "id": "057", "name": "torso-front-nude-2",
        "nude": True, "view": "detail_front",
        "pose": "close-up torso shot from chest to upper thighs, front view slightly angled, full nude, "
                "smooth even skin on breasts, smooth even skin texture, "
                "waxed smooth pussy, "
                "studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, torso close-up front angled, full nude, "
                   "34C breasts, flat stomach, faint abs, hourglass waist, "
                   "Brazilian wax smooth pubic area, clear flawless smooth skin, photorealistic, studio lighting",
    },
    {
        "id": "058", "name": "torso-side-nude",
        "nude": True, "view": "detail_front",
        "pose": "close-up torso shot from side view, full nude, "
                "single nipple on each breast correct anatomy, "
                "flawless silky smooth even skin texture, "
                "breast profile teardrop shape, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, torso close-up side view, full nude, "
                   "breast profile teardrop shape, flat stomach, hourglass figure, "
                   "clear flawless smooth skin, photorealistic, studio lighting",
    },
    {
        "id": "059", "name": "back-closeup-nude",
        "nude": True, "view": "detail_back",
        "pose": "close-up back shot from shoulders to upper thighs, full nude, "
                "realistic anatomically correct anatomy, visible small pink anus positioned very high between buttocks directly below vulva, "
                "spine curve and dimples, smooth even skin, "
                "studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, back close-up shoulders to butt, full nude, "
                   "smooth back, graceful spine curve, two dimples, small pink anus, "
                   "clear flawless skin, photorealistic, studio lighting",
    },
    {
        "id": "060", "name": "hip-waist-detail",
        "nude": True, "view": "detail_front",
        "pose": "close-up hip and waist detail shot, showing waist-to-hip ratio, "
                "natural 34C breasts full teardrop shape visible at top of frame, "
                "smooth olive skin, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, hip waist detail close-up, nude, "
                   "26-inch waist 37-inch hips, dramatic hourglass ratio, "
                   "smooth olive skin, clear flawless skin, photorealistic, studio lighting",
    },
    {
        "id": "061", "name": "legs-closeup",
        "nude": True, "view": "front",
        "pose": "close-up legs shot from thighs to knees, standing, full nude, "
                "bare legs bare body, auburn hair ending at mid-chest level, "
                "toned soft thighs, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, legs close-up thighs to knees, "
                   "toned but soft, shapely, smooth olive skin, slight thigh gap, "
                   "clear flawless skin, photorealistic, studio lighting",
    },
    {
        "id": "062", "name": "feet-closeup",
        "nude": True, "view": "front",
        "pose": "close-up feet shot, standing, showing five perfectly formed toes on each foot, "
                "high arches, narrow heels, perfect tapered toes in neat descending order, "
                "small feminine size 6 feet, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, feet close-up, size 6, high arches, "
                   "narrow heels, five perfect tapered toes in neat order, "
                   "smooth skin, photorealistic, studio lighting",
    },
    {
        "id": "063", "name": "hands-closeup",
        "nude": False, "view": "front",
        "pose": "close-up hands shot, two separate hands with five slender fingers each, "
                "delicate wrists, natural short nails, relaxed natural pose, "
                "correct hand anatomy, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, hands close-up, small delicate, "
                   "five slender fingers each hand, narrow wrists, natural short nails, "
                   "soft palms, photorealistic, studio lighting",
    },
    {
        "id": "064", "name": "lower-back-dimples",
        "nude": True, "view": "detail_back",
        "pose": "close-up lower back view from behind showing two small dimples above butt, "
                "full nude, smooth olive skin, heart-shaped butt visible, "
                "strictly back view from behind, "
                "studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, lower back close-up from behind, "
                   "two small dimples above butt, smooth olive skin, heart-shaped butt, "
                   "clear flawless skin, photorealistic, studio lighting",
    },
    {
        "id": "065", "name": "collarbone-shoulders",
        "nude": True, "view": "detail_front",
        "pose": "close-up collarbone and shoulders shot, showing elegant neck and feminine shoulder slope, "
                "flawless silky smooth even skin on chest and collarbone, "
                "auburn hair framing face, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, collarbone and shoulders close-up, "
                   "elegant neck, feminine shoulder slope, smooth olive skin, "
                   "auburn hair framing face, clear flawless smooth skin, photorealistic, studio lighting",
    },
]

# ━━━ ADDITIONAL NUDE FOR CONSISTENCY (7 images) ━━━

IMAGES += [
    {
        "id": "066", "name": "front-nude-confident-wide",
        "nude": True, "view": "front",
        "pose": "standing wide confident stance, full nude, arms at sides, "
                "bare body exposed, correct proportions matching 26-inch waist 37-inch hips, "
                "confident powerful expression, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing wide stance, full nude, "
                   "confident powerful, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "067", "name": "front-nude-arms-behind-back",
        "nude": True, "view": "front",
        "pose": "standing facing camera, arms behind back, full nude, "
                "bare body exposed, two arms only, slight smile, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front facing camera, arms behind back, full nude, "
                   "slight smile, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "068", "name": "three-quarter-nude-reaching",
        "nude": True, "view": "front",
        "pose": "three-quarter view reaching toward camera, full nude, "
                "waxed smooth pussy, "
                "dynamic, correct anatomy, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, three-quarter view reaching, full nude, "
                   "dynamic, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "069", "name": "back-nude-twist-looking-back",
        "nude": True, "view": "back",
        "pose": "standing back to camera, torso twisted to look back at camera, full nude, "
                "two arms only correct limb count, smooth back, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, back to camera twisted looking back, full nude, "
                   "smooth back, dimples, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "070", "name": "lying-side-nude-curved",
        "nude": True, "view": "front",
        "pose": "lying on side curved elegantly, full nude, "
                "single vulva only correct anatomy, two legs in natural position, "
                "smooth clean skin on legs, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on side curved elegantly, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "071", "name": "kneeling-front-nude",
        "nude": True, "view": "front",
        "pose": "kneeling on floor facing camera, full nude, hands resting on thighs, "
                "waxed smooth pussy, bare body exposed, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, kneeling on floor facing camera, hands on thighs, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "072", "name": "front-nude-natural-outdoor",
        "nude": True, "view": "front",
        "pose": "standing in natural outdoor setting, full nude, bare chest bare body, "
                "relaxed natural pose, dappled sunlight, "
                "correct proportions, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing in nature, full nude, "
                   "relaxed natural pose, hourglass figure, auburn hair in breeze, green eyes, photorealistic, full body shot, natural dappled lighting",
    },
]

# ━━━ ADDITIONAL POSES — replacing pubic variety (12 images) ━━━
# All images use Brazilian wax smooth pubic area. These add pose variety for better LoRA training.

IMAGES += [
    {
        "id": "073", "name": "front-weight-shift-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, weight shifted to right leg, left hand on hip, "
                "full nude, bare body exposed, relaxed confident, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front, weight on right leg, hand on hip, full nude, "
                   "relaxed confident, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "074", "name": "back-three-quarter-turn-nude",
        "nude": True, "view": "back",
        "pose": "standing back to camera, three-quarter turn, looking down, full nude, "
                "smooth back, dimples, correct anatomy, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing back three-quarter turn, looking down, full nude, "
                   "smooth back, dimples, hourglass figure, auburn hair, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "075", "name": "sitting-crosslegged-nude",
        "nude": True, "view": "front",
        "pose": "sitting cross-legged on floor, hands on knees, full nude, "
                "bare body exposed, correct leg anatomy, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, sitting cross-legged on floor, full nude, "
                   "hands on knees, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "076", "name": "lying-back-one-knee-nude",
        "nude": True, "view": "lying_front",
        "pose": "lying on back, right knee bent up, left leg extended, full nude, "
                "single innie navel, realistic vulva positioned very low on the pelvis directly below the pubic bone, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on back, one knee bent, full nude, "
                   "relaxed, auburn hair spread, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "077", "name": "front-arms-behind-head-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, both hands behind head, legs slightly apart, full nude, "
                "bare body exposed, correct proportions 26-inch waist 37-inch hips, "
                "confident, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front, arms behind head, legs apart, full nude, "
                   "confident, hourglass figure, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "078", "name": "standing-hands-on-lower-back-nude",
        "nude": True, "view": "front",
        "pose": "standing facing camera, hands resting on lower back, slight back arch, full nude, "
                "bare body exposed, correct anatomy, "
                "studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing front, hands on lower back, slight arch, full nude, "
                   "hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "079", "name": "stomach-navel-detail",
        "nude": True, "view": "detail_front",
        "pose": "close-up stomach detail, showing single small vertical innie navel below ribs, "
                "flat stomach with faint abs, smooth even skin texture, "
                "waxed smooth pussy below, studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, stomach close-up detail, single innie navel, "
                   "flat stomach with faint abs, smooth olive skin, "
                   "Brazilian wax smooth pubic area, photorealistic, studio lighting",
    },
    {
        "id": "080", "name": "breast-detail-nude",
        "nude": True, "view": "detail_front",
        "pose": "close-up breast detail showing natural 34C teardrop shape, "
                "single rosy-pink nipple on each breast, medium circular areolas, "
                "smooth even skin texture, "
                "studio lighting, photorealistic, high detail",
        "caption": f"{CAPTION_BODY}, breast detail close-up, natural 34C teardrop shape, "
                   "rosy-pink nipples, medium circular areolas, clear flawless smooth skin, "
                   "photorealistic, studio lighting",
    },
    {
        "id": "081", "name": "standing-casual-lean-nude",
        "nude": True, "view": "front",
        "pose": "standing, casual lean against wall, one shoulder touching wall, "
                "full nude, bare body exposed, relaxed natural expression, "
                "correct proportions, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing casual lean against wall, full nude, "
                   "relaxed natural, hourglass figure, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "082", "name": "crouching-low-side-nude",
        "nude": True, "view": "front",
        "pose": "crouching low, side view, full nude, "
                "correct leg anatomy, two feet with five toes, "
                "bare body exposed, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, crouching low side view, full nude, "
                   "correct anatomy, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "083", "name": "standing-side-stretch-nude",
        "nude": True, "view": "front",
        "pose": "standing, side bend stretch with right arm reaching over head to left, "
                "full nude, bare body exposed, "
                "correct anatomy two arms, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, standing side stretch, arm over head, full nude, "
                   "hourglass figure, flat stomach, auburn hair loose waves, green eyes, photorealistic, full body shot, studio lighting",
    },
    {
        "id": "084", "name": "lying-stomach-feet-up-nude",
        "nude": True, "view": "lying_stomach",
        "pose": "lying on stomach, feet crossed up behind, looking back at camera over shoulder, "
                "five perfect toes visible, smooth even skin, "
                "smooth back, studio lighting, full body shot, photorealistic",
        "caption": f"{CAPTION_BODY}, lying on stomach, feet up behind, looking back, "
                   "smooth back, dimples, auburn hair, green eyes, photorealistic, full body shot, studio lighting",
    },
]

# ─── View-to-Detail Mapping ───────────────────────────────────────────────

VIEW_DETAILS = {
    "front": NUDE_FRONT,
    "back": NUDE_BACK,
    "back_bend": NUDE_BEND_BACK,
    "lying_front": NUDE_LYING_FRONT,
    "lying_open": NUDE_LYING_OPEN,
    "lying_stomach": NUDE_LYING_STOMACH,
    "detail_front": NUDE_DETAIL_FRONT,
    "detail_back": NUDE_DETAIL_BACK,
}

# ─── Generation ────────────────────────────────────────────────────────────

def build_prompt(entry: dict) -> str:
    """Build the full generation prompt from an image entry."""
    if entry["nude"]:
        # Nude images: NUDE_OPENER first (highest attention), then body + nude extras, then suffix
        full_prompt = NUDE_OPENER + BODY_PREFIX + NUDE_BODY_EXTRA
        view = entry.get("view", "front")
        if view in VIEW_DETAILS:
            full_prompt += VIEW_DETAILS[view]
        full_prompt += NUDE_SUFFIX
    else:
        # Clothed images: body prefix only (NO pubic area details), then clothing suffix
        full_prompt = BODY_PREFIX + CLOTHED_SUFFIX

    full_prompt += entry["pose"]
    return full_prompt


def generate_image(entry: dict, attempts: int = 3) -> bool:
    """Generate a training image with multiple attempts, keep the best (largest file)."""
    img_id = entry["id"]
    name = entry["name"]
    full_prompt = build_prompt(entry)
    caption = entry["caption"]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    best_data = None
    best_size = 0
    best_attempt = 0

    for attempt in range(1, attempts + 1):
        # Different seed per attempt
        seed = int(img_id) * [137, 251, 373][(attempt - 1) % 3] + [42, 99, 157][(attempt - 1) % 3]

        payload = {
            "prompt": full_prompt,
            "width": 1024,
            "height": 1024,
            "num_inference_steps": 32,
            "guidance_scale": 3.5,
            "seed": seed,
            "format": "webp",
        }

        try:
            resp = requests.post(MODAL_URL, json=payload, timeout=300)

            if resp.status_code != 200:
                print(f"  ❌ [{img_id}] Attempt {attempt}: Modal returned {resp.status_code}")
                continue

            content_type = resp.headers.get("Content-Type", "")
            if "image" not in content_type:
                print(f"  ❌ [{img_id}] Attempt {attempt}: Non-image response")
                continue

            size = len(resp.content)
            if size > best_size:
                best_size = size
                best_data = resp.content
                best_attempt = attempt

        except Exception as e:
            print(f"  ❌ [{img_id}] Attempt {attempt}: {e}")

        # Rate limit between attempts
        if attempt < attempts:
            time.sleep(2)

    if best_data:
        # Save best image
        img_path = OUTPUT_DIR / f"{img_id}_{name}.webp"
        with open(img_path, "wb") as f:
            f.write(best_data)

        # Save caption
        caption_path = OUTPUT_DIR / f"{img_id}_{name}.txt"
        with open(caption_path, "w") as f:
            f.write(caption)

        size_kb = best_size / 1024
        print(f"  ✅ [{img_id}] {name} — attempt {best_attempt} ({size_kb:.0f} KB) + caption")
        return True
    else:
        print(f"  ❌ [{img_id}] {name} — ALL {attempts} attempts failed")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate Holly Body LoRA training dataset v2.0")
    parser.add_argument("--count", type=int, help="Only generate first N images (for testing)")
    parser.add_argument("--start", type=int, default=1, help="Start from image number N")
    parser.add_argument("--attempts", type=int, default=1, help="Attempts per image (default: 1)")
    args = parser.parse_args()

    images = IMAGES
    if args.start > 1:
        images = [img for img in images if int(img["id"]) >= args.start]
    if args.count:
        images = images[:args.count]

    print(f"\n🚀 Holly Body LoRA Dataset Generator v2.0")
    print(f"   Output: {OUTPUT_DIR}")
    print(f"   Images: {len(images)}")
    print(f"   Attempts per image: {args.attempts}")
    print(f"   Total API calls: {len(images) * args.attempts}")
    print(f"   Est. time: ~{len(images) * args.attempts * 45 // 60} min")
    print(f"   Trigger word: h0lly-body")
    print(f"   Pubic: Brazilian wax (smooth)")
    print(f"   Genitalia: realistic anatomically correct")
    print()

    success = 0
    failed = 0
    failed_names = []

    for i, entry in enumerate(images, 1):
        print(f"[{i}/{len(images)}]", end="")
        ok = generate_image(entry, args.attempts)
        if ok:
            success += 1
        else:
            failed += 1
            failed_names.append(f"{entry['id']}_{entry['name']}")

        # Rate limit between images
        if i < len(images):
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"✅ Generated: {success}/{len(images)}")
    if failed:
        print(f"❌ Failed: {failed}/{len(images)}")
        for name in failed_names:
            print(f"   - {name}")
    print(f"{'='*60}")

    # Upload instructions
    print(f"\n📦 TO UPLOAD TO CIVITAI:")
    print(f"   1. Zip: cd {OUTPUT_DIR.parent} && zip -r holly-body-lora-dataset.zip holly-body-lora-dataset/")
    print(f"   2. Civitai → Create → Training")
    print(f"   3. Upload zip (images + .txt captions)")
    print(f"   4. Trigger: h0lly-body")
    print(f"   5. Settings: 15 epochs, lr 0.0001, dim 64, alpha 32, res 1024")
    print(f"   6. Flip augmentation: OFF")
    print()


if __name__ == "__main__":
    main()
