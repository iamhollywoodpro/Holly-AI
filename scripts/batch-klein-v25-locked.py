#!/usr/bin/env python3
"""
HOLLY Body LoRA v2.5 — KLEIN BATCH (LOCKED RECIPES ONLY)
═══════════════════════════════════════════════════════════════════════
Generates the 5 LOCKED Klein categories for Holly v2.5 training dataset.

CANONICAL ANATOMY SOURCE: HOLLY_ANATOMY.md v3.4 (LOCKED CANON)
  - Perineum: 1.5 inches (3-4 cm) — typical adult female range
  - Pelvic proportions table documented in HOLLY_ANATOMY.md
  - Visibility-by-pose rules documented in HOLLY_ANATOMY.md
  - Any anatomy changes require Steve's explicit approval

These recipes were verified working through 8 rounds of testing (R1-R8):
  - T2 dildo (R4_T2 / R6_T2 — PERFECT)
  - T2-alt dildo masturbation (R7_T2 — PERFECT)
  - T2-squirt dildo orgasm (R8_T2 — needs cum color fix)
  - T4 bent over (R3_T4 — PERFECTION)
  - T5 closeup (R4_T5 — PERFECT)

Missing categories (T1 masturbation, T3 spread) are handled by Civitai
onsite generation (see CIVITAI-PROMPTS.md).

ENDPOINT: https://iamdoregosteve--generate-holly-a100.modal.run
COST: ~$0.10/image × 180 images = ~$18 total
TIME: ~30s/image = ~90 minutes total

USAGE:
    # Generate ALL categories (default = 180 images)
    python scripts/batch-klein-v25-locked.py

    # Generate single category for testing
    python scripts/batch-klein-v25-locked.py --category dildo --limit 5

    # Resume after interruption (skips existing files)
    python scripts/batch-klein-v25-locked.py --resume

Categories:
  dildo        — 40 images (T2 dildo insertion variations)
  dildo_mast   — 40 images (T2-alt dildo self-pleasure)
  dildo_squirt — 30 images (T2-squirt dildo orgasm)
  bent_over    — 40 images (T4 bent over from behind)
  closeup      — 30 images (T5 pussy closeup)
"""

import argparse
import os
import sys
import time
import json
from pathlib import Path
from typing import List, Dict

import requests

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
ENDPOINT = "https://iamhollywoodpro--generate-holly-a100.modal.run"
HEALTH = "https://iamhollywoodpro--holly-health-a100.modal.run"
OUTPUT_ROOT = Path("/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25/klein-batch-v25")

NUDE = "completely nude woman, fully naked, bare skin, not wearing any clothing, "
# Per Steve's correction: CLEAR fluid with SLIGHT white tint, NOT milky, NOT orange
CUM_CLEAR = (
    "clear fluid with slight white tint, watery slick moisture, "
    "glistening wetness, translucent natural lubrication, "
    "slightly cloudy but mostly clear, not milky, not white, not orange"
)
# Anatomy anchors — proven to prevent limb drops and multi-body horror
# Smoke2 fix: Added explicit limb-attachment language (was still producing
# legs-from-knees, hand-from-leg, hands-from-thighs, missing right leg)
# Smoke4 fix: Added GLOBAL butt description (Steve wants bigger/plumper/rounder)
# Smoke8 fix: Strengthened foot/leg count anchors (was producing 4 feet in
# bent-over-from-behind poses, and missing/duplicated feet in lying-on-back)
ANATOMY = (
    "single woman, one body, one head, exactly two arms, exactly two legs, "
    "her arms are attached to her shoulders, her hands are at the ends of her arms not attached to her thighs, "
    "both legs fully visible from hips to feet, right leg on right side and left leg on left side, both legs visible, "
    "exactly two feet total, one left foot and one right foot, single pair of feet, only two feet in the entire image, "
    "five toes on each foot, ten toes total, "
    "two hands visible with five fingers each, "
    "very large plump round juicy butt, thick full bubble-butt cheeks, generous curvy wide voluptuous ass proportional to her hourglass frame, "
    "wide hips, thick shapely thighs"
)

# ─────────────────────────────────────────────────────────────────────────────
# LOCKED RECIPES — proven working through R1-R8
# Each recipe = prompt template + LoRA stack
# ─────────────────────────────────────────────────────────────────────────────

# T2 dildo — penetration with toy (PERFECT in R4_T2/R6_T2)
# Smoke3 decision: DELETED prompts[0] (extra legs from knees) and prompts[3]
# (hand from leg) — these poses persistently fail on Klein across 2 smoke tests.
# Keeping only the 3 prompts that produced PERFECT results. These cycle through
# 40 images for variety (each prompt used ~13 times with different seeds).
# Smoke8: Added explicit pussy wetness language to all 3 prompts (Steve's
# feedback: "she should be a bit wet on her pussy from the dildo masturbation").
DILDO_PROMPTS: List[str] = [
    # Smoke9 fix (June 20): Removed "leaning back on one hand" which caused
    # 3-arm rendering on iamhollywoodpro (hand behind body = ambiguous).
    # Both arms now explicitly anchored with visible hand positions.
    NUDE + ANATOMY + ", "
    "sitting on edge of bed facing camera, "
    "both arms visible reaching from her shoulders, exactly two arms, "
    "her right hand holding pink silicone dildo between her thighs, "
    "her left hand resting on the bed beside her hip, both hands visible in front of her body, "
    "dildo penetrating her pussy, shaft visibly entering her body, "
    "her pussy visibly wet and aroused, " + CUM_CLEAR + " glistening around the dildo base, "
    "slick moisture visible on her inner labia and vulva, pussy dripping with arousal, "
    "legs spread apart, looking down at her own penetration, "
    "auburn hair falling over one shoulder, "
    "soft window light, photorealistic, explicit",

    # Smoke9 fix (June 20): Added explicit left-hand placement (was unmentioned
    # → 3-arm rendering). Both arms now anchored with visible positions.
    NUDE + ANATOMY + ", "
    "kneeling on bed facing camera, knees apart, "
    "both arms visible reaching from her shoulders, exactly two arms, "
    "her right hand between her thighs holding glass dildo, dildo penetrating her pussy, "
    "shaft half buried inside her body, toy visibly inside her, "
    "her left hand resting on her left thigh, both hands visible in front of her body, "
    "her pussy visibly wet, " + CUM_CLEAR + " coating the dildo shaft, "
    "slick aroused wetness visible on her inner labia and around the penetration, "
    "looking down at the penetration, lips parted, "
    "auburn hair in loose ponytail, "
    "warm bedroom lighting, photorealistic, explicit",

    # Smoke9 fix (June 20): Added explicit left-hand placement on stomach
    # (was unmentioned → 3-arm risk). Both arms anchored.
    NUDE + ANATOMY + ", "
    "lying on her back on white sheets, knees up and legs spread wide open, "
    "both legs visible, both feet flat on bed, "
    "both arms visible reaching from her shoulders, exactly two arms, "
    "her right hand holding glass dildo, dildo penetrating her pussy, shaft half inside her, "
    "her left hand resting on her stomach, both hands visible, "
    "her pussy dripping wet, " + CUM_CLEAR + " pooling around the dildo base, "
    "slick visible wetness on her vulva, inner labia glossy with arousal, "
    "flushed cheeks, mouth open in moan, eyes half closed, "
    "head back on pillow, auburn hair loose, "
    "soft bedroom lighting, photorealistic, explicit",
]

# T2-alt dildo masturbation (R7_T2 PERFECT) — explicit self-pleasure with toy
# Smoke3 decision: DELETED old prompt[2] (kneeling — hands from thighs persisted
# across 2 smoke tests). Keeping prompts[0] and [1] (both Perfect), added 1 new
# standing variation for variety. 3 prompts cycle through 40 images.
DILDO_MAST_PROMPTS: List[str] = [
    # Smoke9 fix (June 20): Added explicit left-hand placement (was unmentioned
    # → 3-arm risk on iamhollywoodpro). Both arms now anchored.
    NUDE + ANATOMY + ", "
    "lying on her back on white sheets, "
    "knees bent and legs spread wide apart, "
    "both arms visible reaching from her shoulders, exactly two arms, "
    "her right hand holding a glass dildo between her thighs, "
    "her left hand resting beside her head on the pillow, both hands visible, "
    "dildo INSERTED inside her own pussy, she is penetrating herself with the toy, "
    "shaft half buried inside her, her hand visibly controlling the dildo, "
    "dildo enters her body, penetration visible in frame, "
    + CUM_CLEAR + " visible around the dildo base, "
    "flushed cheeks, mouth open in pleasure, eyes half closed, "
    "head back on pillow, auburn hair loose, "
    "soft bedroom lighting, photorealistic, explicit intimate",

    # Smoke9 fix (June 20): Added explicit left-arm/hand placement (was
    # unmentioned → 3-arm risk). Both arms anchored.
    NUDE + ANATOMY + ", "
    "lying on her back propped on pillows, knees bent and legs spread, "
    "both legs visible, right leg on right side and left leg on left side, both feet flat on bed, "
    "both arms visible reaching from her shoulders, exactly two arms, "
    "her right arm reaches from her shoulder down to her right hand, "
    "her right hand between her thighs holding glass dildo, dildo inside her pussy, "
    "her left hand resting on her thigh, left arm visible from shoulder to hand, "
    "she is fucking herself with the toy, dildo penetrates her, "
    "shaft visibly enters her body, self-pleasure with toy, "
    "head tilted back in pleasure, auburn hair spread on pillows, "
    "soft lighting, photorealistic, explicit",

    # NEW prompt (smoke4) — standing in doorway variation (avoids the kneeling
    # hands-from-thighs issue by keeping arms straight down from shoulders)
    NUDE + ANATOMY + ", "
    "standing with her back against a wall, one foot up on the edge of the bed, "
    "both arms visible reaching down from her shoulders to her hands, "
    "her right hand between her thighs holding a glass dildo, "
    "dildo penetrating her pussy, shaft half inside her, she is pleasuring herself with the toy, "
    "her left hand gripping the wall for balance, "
    "both legs visible, right foot on bed, left foot on floor, "
    "head tilted back against the wall, eyes half closed, mouth open, "
    "auburn hair falling over her shoulders, "
    "soft warm lighting, photorealistic, explicit intimate",
]

# T2-squirt POST-DILDO ORGASM (Smoke5 — MIDDLE GROUND)
# ════════════════════════════════════════════════════════════════════════════════
# Smoke4 overcorrected — Steve said "went completely the other way, faucet on drip"
# Steve wants: VISIBLE STREAM (not dribble, not milk explosion)
#
# LoRA switch: PussyDiffusion → KLEIN-Unchained-V2 (broader NSFW training,
# understands fluid dynamics that PussyDiffusion doesn't)
#
# Fluid language: "visible steady stream", "fluid flowing", "puddle spreading"
#   NOT "small bead" (too little)
#   NOT "spraying arcs" (too much)
#   MIDDLE: "visible stream of clear fluid flowing from her pussy"
DILDO_SQUIRT_PROMPTS: List[str] = [
    NUDE + ANATOMY + ", "
    "lying on her back on white bed sheets in intense orgasm, "
    "knees bent and legs spread apart, both legs visible, both feet flat on bed, "
    "her pussy is the ONLY source of fluid, fluid emerges ONLY from her vaginal opening, "
    "no other holes anywhere on her body, no extra orifices, "
    "a visible steady stream of clear fluid flowing from her pussy, "
    "clear fluid streaming out of her vaginal opening in a visible flow, "
    "moderate amount of fluid, a visible stream not a dribble not an explosion, "
    "clear fluid pooling on the white sheets beneath her, wet patch spreading, "
    "fluid is clear and watery with slight white tint, glistening, realistic female ejaculation, "
    "NOT milky, NOT thick, NOT slime, NOT a tiny drip, a visible flowing stream, "
    "her pussy visibly swollen and flushed pink, smooth Brazilian wax, vaginal opening visibly pulsing, "
    "a glass dildo lies on the bed BESIDE her thigh, she just removed it, dildo is NOT inside her, "
    "dildo is resting on the sheets next to her, clearly outside her body, "
    "fluid does NOT come from the dildo, fluid comes from her pussy only, "
    "back arched in climax, flushed red chest and face, mouth open in moan, "
    "eyes squeezed shut in pleasure, auburn hair wild on pillow, "
    "soft warm bedroom lighting, photorealistic, explicit intense orgasm with visible female ejaculation",

    NUDE + ANATOMY + ", "
    "sitting up on the edge of the bed, legs parted wide, in active squirting orgasm, "
    "both legs visible, both feet on the floor, "
    "her pussy is the ONLY source of fluid, fluid emerges ONLY from her vaginal opening, "
    "no other holes anywhere on her body, no extra orifices, "
    "a visible stream of clear fluid squirting from her pussy onto the sheet, "
    "clear fluid flowing outward from her vaginal opening in a visible stream, "
    "fluid is clear and watery, glistening, realistic female ejaculation, "
    "moderate visible flow, a steady stream not a drip not an explosion, "
    "wet patch on the white sheet beneath her where fluid is pooling, "
    "NOT milky, NOT thick, NOT slime, a realistic visible stream of fluid, "
    "her pussy visibly flushed and engorged, smooth Brazilian wax, inner labia pink and swollen, "
    "a glass dildo rests on the bed beside her, she just set it down after orgasm, "
    "dildo is NOT touching her body, NOT inside her, "
    "fluid comes ONLY from her pussy NOT from the dildo, "
    "back arched, mouth wide open screaming in pleasure, eyes squeezed shut, "
    "flushed chest and face, sweat on skin, auburn hair wild, "
    "soft warm lighting, photorealistic, explicit intense squirting orgasm",

    NUDE + ANATOMY + ", "
    "kneeling on all fours on the bed, head down, ass raised, in intense orgasm, "
    "both arms visible reaching from shoulders to hands on the mattress, "
    "both legs visible, knees on the bed, "
    "her pussy is the ONLY source of fluid, fluid emerges ONLY from her vaginal opening, "
    "no other holes anywhere on her body, no extra orifices, "
    "a visible stream of clear fluid flowing from her pussy down onto the sheets, "
    "clear fluid dripping and flowing from her vaginal opening in a visible stream, "
    "moderate amount, realistic visible flow, NOT a dribble, NOT an explosion, "
    "wet patch on the white sheets beneath her hips where fluid is pooling, "
    "fluid is clear and watery with slight white tint, glistening, "
    "NOT milky, NOT thick, NOT slime, a realistic steady stream of female ejaculate, "
    "her pussy flushed and swollen between her thighs, smooth Brazilian wax, "
    "a glass dildo lies on the bed beside her knee, NOT inside her, NOT touching her, "
    "fluid does NOT come from the dildo, fluid comes from her pussy, "
    "back arched in climax, auburn hair falling forward over her shoulders, "
    "flushed skin, mouth open in moan, eyes half closed, "
    "soft warm bedroom lighting, photorealistic, explicit intense orgasm with visible fluid stream",
]

# T4 bent over from behind (R3_T4 PERFECTION)
# Smoke6 fixes:
#   - STRIPPED ALL NEGATIVE LANGUAGE — smoke5 proved that "no duplicate anus",
#     "no extra assholes", "no second butthole" BACKFIRED (model renders the key words)
#   - Positive-only descriptions: "correct human anatomy", "proper body proportions"
#   - Retained butt description from smoke4 (Steve approved the size)
#   - 002/004 were PERFECT across smoke4 AND smoke5 — locked
BENT_OVER_PROMPTS: List[str] = [
    # Simple, positive-only. No negative language.
    NUDE + "bare back, bare chest, wearing nothing, " + ANATOMY + ", "
    "bent over forward at waist, legs shoulder-width apart, "
    "viewed from directly behind, camera positioned behind her, "
    "her back fully to camera, "
    "her very large plump round butt filling the frame, thick full butt cheeks, "
    "her pussy and anus visible between her thighs and buttocks, "
    "1.5 inch perineum of skin between her vaginal opening and her anus, correct anatomical spacing, "
    "correct human anatomy, proper body proportions, "
    "auburn hair falling down her back, face not visible, "
    "soft warm lighting, photorealistic, explicit anatomical detail",

    # Simple, positive-only. No negative language.
    NUDE + "bare back, bare chest, wearing nothing, " + ANATOMY + ", "
    "on all fours on bed, viewed from directly behind, "
    "camera positioned directly behind her, "
    "her very large plump round butt raised up, thick full butt cheeks, "
    "her pussy and anus visible between her thighs, "
    "1.5 inch perineum of skin between her vaginal opening and her anus, correct anatomical spacing, "
    "correct human anatomy, proper body proportions, "
    "back arched, auburn hair falling forward, face not visible, "
    "soft warm lighting, photorealistic, explicit anatomical detail",

    # bent_over_002 was PERFECT across smoke4 AND smoke5 — LOCKED
    NUDE + "bare back, bare chest, wearing nothing, " + ANATOMY + ", "
    "bent over the edge of the bed, chest resting on mattress, "
    "viewed from directly behind, camera positioned directly behind her, "
    "legs straight and shoulder-width apart, "
    "her very large plump round butt raised, thick full butt cheeks, "
    "her pussy and anus visible between her thighs and buttocks, "
    "1.5 inch perineum of skin between her vaginal opening and her anus, correct anatomical spacing, "
    "auburn hair spread on the mattress, face turned to side, "
    "soft warm lighting, photorealistic, explicit anatomical detail",

    # bent_over_004 was PERFECT across smoke4 AND smoke5 — LOCKED
    NUDE + "bare back, bare chest, wearing nothing, " + ANATOMY + ", "
    "standing bent over forward at waist, hands resting on her knees, "
    "viewed from directly behind, camera positioned directly behind her, "
    "legs shoulder-width apart, "
    "her very large plump round butt filling the frame, thick full butt cheeks, "
    "her pussy and anus visible between her thighs, "
    "1.5 inch perineum of skin between her vaginal opening and her anus, correct anatomical spacing, "
    "auburn hair falling forward over her shoulders, face hidden, "
    "soft warm lighting, photorealistic, explicit anatomical detail",
]

# T5 pussy closeup (R4_T5 PERFECT) — pussy is focal point, face NOT in frame
# Smoke5 fixes:
#   - closeup_000 was PERFECT — LOCKED (untouched)
#   - closeup_001 (cycles to _003): anus visible when shouldn't be + ass too small → hidden anus
#   - closeup_002 was PERFECT — LOCKED (untouched)
#   - closeup_003 (cycles to _004): 4 arms + hands from legs → strengthened arm anchors
#   - closeup_004 (cycles to _001): pubic hair → explicit "bald, hairless, zero hair"
CLOSEUP_PROMPTS: List[str] = [
    # Smoke9 fix (June 20): Two issues fixed —
    # 1. 3-arm issue: Left arm was unmentioned → model added phantom third arm.
    #    Now both arms explicitly anchored with visible hand positions.
    # 2. Pubic hair on mons pubis: Added explicit "bald mons pubis" language
    #    (was only saying "zero pubic hair" but model still rendered hair on top).
    NUDE + ANATOMY + ", "
    "close-up photo between her spread legs, "
    "her pussy up close, pussy is the focal point of the image, "
    "completely bald hairless pussy, smooth Brazilian wax, silky bare skin everywhere, "
    "bald hairless mons pubis, smooth bare pubic mound above her pussy, zero hair anywhere on her body, "
    "small neat proportional inner labia, labia relaxed at rest, not stretched, not pulled, "
    "both arms visible reaching from her shoulders, exactly two arms, "
    "her right hand gently touching her inner labia, two fingers visible, five fingers on that hand, "
    "her left hand resting on her inner thigh, five fingers on left hand, both hands visible, "
    "fingers gently resting not pulling, labia at natural rest size, "
    "soft natural lighting, "
    "photorealistic, intimate, face not in frame",

    # closeup_001/_003/_004 (all cycle here): SMOKE6 FIX
    # Smoke5 lesson: NEGATIVE LANGUAGE BACKFIRES. Stripped ALL "NOT" phrasing.
    # Smoke5 result: "NOT growing from legs" produced hands-from-legs,
    # "no extra arms" produced 4 arms, "anus NOT visible" rendered duplicate anus.
    # Smoke6 fix: POSITIVE-ONLY descriptions. Perineum spacing for correct anatomy.
    NUDE + ANATOMY + ", "
    "extreme close-up between her spread legs, frontal view from directly in front, "
    "her pussy filling most of frame, pussy is the focal point, "
    "completely bald hairless pussy, smooth Brazilian wax, silky bare skin everywhere, "
    "small neat proportional inner labia, labia at relaxed natural rest size, "
    "both her arms reaching down from her shoulders to her hands, exactly two arms visible, "
    "her hands framing the view on either side of her thighs, "
    "five fingers on each hand visible, hands open and relaxed, fingers gently resting near her labia, "
    "vaginal opening visible, clitoris visible at top, smooth bare mons pubis, "
    "1.5 inch perineum of skin below her vaginal opening, correct anatomical spacing, "
    "correct female anatomy, proper body proportions, anatomically correct detail, "
    "ten toes total, five on each foot, toes relaxed and natural, "
    "soft focus background, clinical anatomical detail in foreground, "
    "professional explicit photography, photorealistic, face not in frame",

    # Smoke9 fix (June 20): "No hands in frame" produced 4 arms + deformed
    # hands (Klein renders the word "hands" regardless of "no"). Now both
    # hands explicitly placed at her sides. Added bald mons pubis language.
    NUDE + ANATOMY + ", "
    "close-up photo between her legs from front, "
    "her pussy filling most of the frame, pussy is the focal point, "
    "completely bald hairless pussy, smooth Brazilian wax, "
    "bald hairless mons pubis, smooth bare pubic mound above her pussy, "
    "small neat proportional inner labia, labia relaxed and at natural rest size, "
    "both arms resting at her sides, both hands resting on the bed beside her hips, "
    "five fingers on each hand, hands relaxed and natural, "
    "soft natural lighting, photorealistic, intimate, face not in frame",
]

# ─────────────────────────────────────────────────────────────────────────────
# LoRA stacks per category (proven strengths)
# ─────────────────────────────────────────────────────────────────────────────
LORA_DILDO = [{"file": "FK_dildoinsertion.safetensors", "strength": 1.0}]
LORA_DILDO_MAST = [{"file": "FK_dildoinsertion.safetensors", "strength": 1.0}]
# Smoke5: Switched from PussyDiffusion to KLEIN-Unchained-V2.
# PussyDiffusion only knows STATIC pussy detail (no fluid dynamics → dribble).
# KLEIN-Unchained-V2 is a broad NSFW LoRA trained on diverse explicit content
# including fluid/ejaculation scenes. At 0.7 strength it should render visible
# squirting without over-baking.
LORA_DILDO_SQUIRT = [{"file": "KLEIN-Unchained-V2.safetensors", "strength": 0.7}]
# Smoke8: Switched from flux2klein_vulva_and_anus_from_behind_v1 @ 1.20 to
# femaleasshole-f2-klein-9b-musubituner @ 1.0.
# Smoke7 head-to-head: Musubi-Tuner produced 3/3 clean bent_over images with
# correct 1.5-inch perineum spacing. Old LoRA kept producing anus-too-close
# and double-anus artifacts. Musubi-Tuner is the new locked winner.
LORA_BENT_OVER = [{"file": "femaleasshole-f2-klein-9b-musubituner.safetensors", "strength": 1.0}]
LORA_CLOSEUP = [{"file": "pussydiffusion-f2-klein-9b_v2.safetensors", "strength": 1.0}]

# ════════════════════════════════════════════════════════════════════════════════
# SMOKE7 NEW LoRA TESTS (June 19 2026) — One variable changed per test
# Each category tests a single new LoRA against the locked recipe baseline.
# Default target=0 so production batch doesn't run them.
# Invoke explicitly: python batch-klein-v25-locked.py --category 7a_squirt_cum --limit 3
# ════════════════════════════════════════════════════════════════════════════════

# Test 7A — ❌ FAILED (smoke7): Cum_on_Face is actually a FACIAL CUMSHOT LoRA
# (cum ON face), not a squirting LoRA. Page title "Cum Anywhere Concept" was
# misleading — filename tells the truth. Produced: cum from mouth, panties on,
# conjoined bodies. Squirting moved to Civitai SNOFS permanently.
LORA_CUM_ANYWHERE = [{"file": "Cum_on_Face.safetensors", "strength": 0.7}]

# Test 7B — ✅ WINNER (smoke7): Promoted to production LORA_BENT_OVER above.
# 3/3 clean images with correct 1.5-inch perineum spacing. Replaces the old
# flux2klein_vulva_and_anus_from_behind_v1 LoRA.
LORA_BENT_OVER_MUSUBI = [{"file": "femaleasshole-f2-klein-9b-musubituner.safetensors", "strength": 1.0}]

# Test 7C — 🟡 MIXED (smoke7): 2/3 good but K3nk not clearly better than
# FK_dildoinsertion on consistency. K3nk limb issue on image 001 (missing hand).
# Keeping FK_dildoinsertion as production dildo LoRA.
LORA_DILDO_K3NK = [{"file": "klein-dildo-7epoc-k3nk.safetensors", "strength": 1.0}]

# Test 7D — ❌ FAILED (smoke7): Stacking two background enhancers at 0.3 strength
# each still breaks Klein Distilled. Confirmed: max ONE action LoRA per image.
# ExcellentFullNude + Realism_Engine biased toward modesty poses, mangled dildo
# into "weird object in hands." Klein 9B Distilled cannot stack enhancer LoRAs.
LORA_NUDE_REALISM_STACK = [
    {"file": "ExcellentFullNude_F2K9B_1.safetensors", "strength": 0.3},
    {"file": "Realism_Engine_Klein_V2.safetensors", "strength": 0.3},
]

CATEGORIES = {
    "dildo":        {"prompts": DILDO_PROMPTS,        "lora": LORA_DILDO,        "target": 40, "folder": "T2_dildo"},
    "dildo_mast":   {"prompts": DILDO_MAST_PROMPTS,   "lora": LORA_DILDO_MAST,   "target": 40, "folder": "T2alt_dildo_masturbation"},
    # ⚠️ MOVED TO CIVITAI (smoke5): Klein 9B cannot render squirting reliably.
    # Tried 3 LoRAs across 4 rounds (smoke2→smoke5): FK biases fluid to dildo,
    # PussyDiffusion produces dribble only, KLEIN-Unchained-V2 breaks anatomy
    # completely (extra limbs, panties on, fluid from belly button).
    # Squirting will be generated on Civitai SNOFS base instead.
    "dildo_squirt": {"prompts": DILDO_SQUIRT_PROMPTS, "lora": LORA_DILDO_SQUIRT, "target": 0,  "folder": "T2squirt_dildo_orgasm"},
    "bent_over":    {"prompts": BENT_OVER_PROMPTS,    "lora": LORA_BENT_OVER,    "target": 40, "folder": "T4_bent_over"},
    "closeup":      {"prompts": CLOSEUP_PROMPTS,      "lora": LORA_CLOSEUP,      "target": 30, "folder": "T5_closeup"},

    # ─── SMOKE7 TESTS (target=0 so default batch skips them) ────────────────
    "7a_squirt_cum": {
        "prompts": DILDO_SQUIRT_PROMPTS,
        "lora": LORA_CUM_ANYWHERE,
        "target": 0,
        "folder": "T7A_squirt_cum_anywhere",
    },
    "7b_bent_musubi": {
        "prompts": BENT_OVER_PROMPTS,
        "lora": LORA_BENT_OVER_MUSUBI,
        "target": 0,
        "folder": "T7B_bent_over_musubi",
    },
    "7c_dildo_k3nk": {
        "prompts": DILDO_PROMPTS,
        "lora": LORA_DILDO_K3NK,
        "target": 0,
        "folder": "T7C_dildo_k3nk",
    },
    "7d_mast_stack": {
        "prompts": DILDO_MAST_PROMPTS,
        "lora": LORA_NUDE_REALISM_STACK,
        "target": 0,
        "folder": "T7D_mast_nude_realism",
    },
}


def health_check() -> bool:
    print(f"🩺 Health check...")
    try:
        r = requests.get(HEALTH, timeout=900)
        h = r.json()
        ok = h.get("status") == "healthy"
        print(f"   Status: {h.get('status')} | Model: {h.get('model')}")
        return ok
    except Exception as e:
        print(f"   ❌ {e}")
        return False


def generate_image(prompt: str, loras: list, seed: int | None = None) -> bytes:
    payload = {
        "prompt": prompt,
        "width": 1024,
        "height": 1024,
        "num_inference_steps": 8,
        "guidance_scale": 1.2,
        "format": "webp",
        "loras": loras,
    }
    if seed is not None:
        payload["seed"] = seed
    r = requests.post(ENDPOINT, json=payload, timeout=600)
    r.raise_for_status()
    return r.content


def run_category(cat_name: str, cat_cfg: dict, limit: int | None = None, resume: bool = False) -> dict:
    folder = OUTPUT_ROOT / cat_cfg["folder"]
    folder.mkdir(parents=True, exist_ok=True)

    target = limit if limit else cat_cfg["target"]

    # Disabled category (target=0) — skip cleanly without creating files
    if target <= 0:
        print(f"\n📦 Category: {cat_name} (DISABLED — skipping)")
        print(f"   Reason: target=0 (moved to Civitai or dropped)")
        return {"category": cat_name, "generated": 0, "skipped": 0, "target": 0, "disabled": True}
    prompts = cat_cfg["prompts"]
    loras = cat_cfg["lora"]

    print(f"\n📦 Category: {cat_name} ({target} images)")
    print(f"   Folder: {folder}")
    print(f"   LoRAs: {loras}")

    existing = len(list(folder.glob("*.webp")))
    if resume and existing >= target:
        print(f"   ✅ Already have {existing}/{target}, skipping (resume mode)")
        return {"category": cat_name, "generated": 0, "skipped": existing}

    start_idx = existing if resume else 0
    print(f"   Starting at index {start_idx}, generating {target - start_idx} new images\n")

    success = 0
    fail = 0
    for i in range(start_idx, target):
        # Cycle through prompts with seed variation for diversity
        prompt = prompts[i % len(prompts)]
        seed = 42000 + hash(cat_name + str(i)) % 100000  # Deterministic seed per image

        out_path = folder / f"{cat_name}_{i:03d}.webp"
        if resume and out_path.exists():
            print(f"   [{i+1}/{target}] skip (exists)")
            continue

        # Save prompt alongside
        (folder / f"{cat_name}_{i:03d}.txt").write_text(
            f"Category: {cat_name}\nIndex: {i}\nSeed: {seed}\n\nPROMPT:\n{prompt}\n\nLORAS:\n{loras}\n",
            encoding="utf-8",
        )

        print(f"   [{i+1}/{target}] {out_path.name}")
        print(f"      prompt: {prompt[:80]}...")
        t0 = time.time()
        try:
            img_bytes = generate_image(prompt, loras, seed=seed)
            elapsed = time.time() - t0
            out_path.write_bytes(img_bytes)
            print(f"      ✅ {len(img_bytes):,} bytes | {elapsed:.1f}s")
            success += 1
        except Exception as e:
            print(f"      ❌ {e}")
            fail += 1
            time.sleep(2)  # Back off before retry

    return {"category": cat_name, "generated": success, "failed": fail, "target": target}


def main():
    global OUTPUT_ROOT
    parser = argparse.ArgumentParser(description="Holly v2.5 Klein Batch Generator")
    parser.add_argument("--category", choices=list(CATEGORIES.keys()),
                        help="Generate only this category (default: all)")
    parser.add_argument("--limit", type=int,
                        help="Limit images per category (for testing)")
    parser.add_argument("--resume", action="store_true",
                        help="Skip existing images")
    parser.add_argument("--output", type=str,
                        help="Override output root folder (for clean test runs)")
    args = parser.parse_args()

    if args.output:
        OUTPUT_ROOT = Path(args.output)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("HOLLY v2.5 KLEIN BATCH GENERATOR")
    print("=" * 70)
    print(f"Endpoint: {ENDPOINT}")
    print(f"Output:   {OUTPUT_ROOT}/")
    if args.category:
        print(f"Mode:     SINGLE CATEGORY ({args.category})")
    else:
        print(f"Mode:     ALL CATEGORIES")
    if args.limit:
        print(f"Limit:    {args.limit} images per category")
    if args.resume:
        print(f"Resume:   ENABLED (skipping existing)")
    print()

    if not health_check():
        print("❌ Endpoint unhealthy — aborting")
        sys.exit(1)

    cats_to_run = [args.category] if args.category else list(CATEGORIES.keys())
    summary = []
    t_start = time.time()

    for cat_name in cats_to_run:
        cfg = CATEGORIES[cat_name]
        result = run_category(cat_name, cfg, limit=args.limit, resume=args.resume)
        summary.append(result)

    total_time = time.time() - t_start

    # Summary
    summary_path = OUTPUT_ROOT / "_batch_summary.json"
    summary_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_time_s": round(total_time, 1),
        "endpoint": ENDPOINT,
        "categories": summary,
    }
    summary_path.write_text(json.dumps(summary_data, indent=2))

    print("\n" + "=" * 70)
    print("BATCH COMPLETE")
    print("=" * 70)
    for s in summary:
        print(f"  {s['category']:<15} {s.get('generated', 0)}/{s.get('target', '?')} generated")
    print(f"\nTotal time: {total_time/60:.1f} min")
    print(f"Summary:    {summary_path}")
    print(f"\nNext: Combine with Civitai-generated images for v2.5 training.")


if __name__ == "__main__":
    main()
