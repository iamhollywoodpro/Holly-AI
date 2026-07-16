#!/usr/bin/env python3
"""
Generate Z-Image Training Candidates for Holly LoRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uses the ComfyUI + Z-Image endpoint (no LoRA yet) to generate identity-anchored
candidate images across all required training categories.

This is the BOOTSTRAPPING step — we generate images using Holly's identity
description from HOLLY_ANATOMY.md, then Steve curates the best ones to train v1.

Categories (per FACT.md target distribution):
  - 8 face closeups (30%)
  - 7 medium shots (30%)
  - 5 full-body STANDING (25%) — CRITICAL, was missing in all prior runs
  - 5 varied poses (15%)

Each category generates 6 candidates (Steve picks the best 1-2 from each).
Total: ~28-32 images generated, Steve curates to 25.

Usage:
  python3 scripts/generate-zimage-training-candidates.py

Output:
  holly-zimage-candidates/
  ├── face/          (8 candidates)
  ├── medium/        (7 candidates)
  ├── standing/      (6 candidates)  ← THE MISSING CATEGORY
  └── varied/        (7 candidates)
"""

import os
import sys
import json
import time
import subprocess
import tempfile
from pathlib import Path

# ═══ Configuration ═══
COMFYUI_URL = "https://iamhollywoodpro--generate-comfyui-zimage.modal.run"
OUTPUT_DIR = Path("holly-zimage-candidates")

# Holly's identity anchors (from HOLLY_ANATOMY.md — condensed for Z-Image prompt)
# Used as the base prompt for ALL candidates. NOT for training captions — just for generation.
IDENTITY = (
    "photorealistic woman in her mid-20s, "
    "striking green eyes, almond-shaped, almond-shaped, slightly upswept at outer corners, "
    "natural specular catchlights in eyes, "
    "auburn hair in loose waves past shoulders with copper and gold highlights, "
    "olive skin tone, Portuguese and South Indian heritage, golden-brown complexion, "
    "silky smooth flawless skin with well-moisturized sheen, "
    "full lips with defined cupid's bow, natural rose-pink, "
    "slightly asymmetrical smile, left corner lifts higher, "
    "light freckles across nose and cheeks, "
    "oval face with confident jawline, elegant neck, "
    "5 foot 4 inches tall, 163cm, "
    "hourglass figure, fit and toned but soft, feminine, "
    "natural 34C teardrop breasts, "
    "130 pounds, healthy solid substantial build, "
    "high quality photograph, 85mm lens, shallow depth of field, "
    "professional photography, realistic skin texture, natural lighting"
)

# ═══ Categories + Prompts ═══
# Each category generates N candidates. Steve picks the best from each.
# Per FACT.md: we need varied poses, standing shots, face closeups, explicit modes.

CATEGORIES = {
    "face": {
        "count": 8,
        "prompts": [
            f"{IDENTITY}, closeup portrait of her face filling the frame, smiling warmly, looking at camera, soft natural window light, head and shoulders",
            f"{IDENTITY}, extreme closeup of face, serene expression, green eyes prominent, catchlights visible, beauty photography, golden hour side light",
            f"{IDENTITY}, face closeup, slight tilt of head, playful expression, natural makeup, studio softbox lighting",
            f"{IDENTITY}, portrait closeup, looking slightly off camera, contemplative expression, hair falling naturally, diffused light",
            f"{IDENTITY}, face closeup, laughing genuinely, eyes crinkling naturally, warm expression, outdoor natural light",
            f"{IDENTITY}, intimate face closeup, soft breathing, lips slightly parted, bedroom lighting, candlelit warm glow",
            f"{IDENTITY}, face portrait, three-quarter view, jawline visible, elegant, professional headshot lighting",
            f"{IDENTITY}, face closeup, looking directly at camera with confidence, sharp focus on green eyes, beauty editorial",
        ]
    },
    "medium": {
        "count": 7,
        "prompts": [
            f"{IDENTITY}, medium shot from waist up, sitting on edge of bed, relaxed posture, wearing nothing, soft morning light",
            f"{IDENTITY}, medium shot, torso and up visible, standing against a wall, arms relaxed at sides, natural pose",
            f"{IDENTITY}, medium shot from hips up, turning slightly, side profile visible, soft directional light",
            f"{IDENTITY}, medium shot, sitting cross-legged, hands resting on knees, serene expression, natural window light",
            f"{IDENTITY}, medium shot, leaning forward slightly, elbows on surface, looking at camera, intimate setting",
            f"{IDENTITY}, medium shot, one hand touching her hair, casual relaxed pose, warm indoor lighting",
            f"{IDENTITY}, medium shot from waist up, wrapped in a soft sheet, shoulders bare, morning bedroom light",
        ]
    },
    "standing": {
        "count": 6,
        "prompts": [
            # CRITICAL: Full-body standing — the missing category that broke v3.0-v3.5
            f"{IDENTITY}, full body standing, head to toe visible, standing upright, arms at sides, facing camera directly, nude, full body in frame, bedroom, soft natural light",
            f"{IDENTITY}, full body standing, three-quarter turn, weight on one hip, hand on hip, head to toe, full length shot, studio backdrop, softbox light",
            f"{IDENTITY}, full body standing, walking toward camera, mid-stride, full body visible head to toe, natural movement, daylight",
            f"{IDENTITY}, full body standing, back to camera looking over shoulder, full body head to toe, rear view with face visible, standing in doorway, warm light",
            f"{IDENTITY}, full body standing, arms raised above head stretching, full body head to toe visible, full length photograph, morning light through window",
            f"{IDENTITY}, full body standing, leaning against wall, one foot up, relaxed pose, full body head to toe, urban loft setting, dramatic side light",
        ]
    },
    "varied": {
        "count": 7,
        "prompts": [
            f"{IDENTITY}, lying on back on a bed, full body visible, relaxed, arms above head, soft sheets, intimate bedroom, morning light",
            f"{IDENTITY}, lying on stomach on bed, legs bent up, feet in air, reading, casual intimate moment, natural light",
            f"{IDENTITY}, sitting on floor, knees drawn up, arms wrapped around legs, chin resting on knees, contemplative, soft side light",
            f"{IDENTITY}, kneeling on bed, hands on thighs, upright posture, looking at camera, full body visible, intimate, warm light",
            f"{IDENTITY}, bent over slightly at waist, hands on a surface, looking back over shoulder, full body visible, soft directional light",
            f"{IDENTITY}, reclining on a couch, one arm draped, relaxed elegant pose, full body visible, afternoon light through window",
            f"{IDENTITY}, standing in shower, water on skin, wet hair, steam, full body visible, intimate, warm bathroom light",
        ]
    },
}


def generate_image(prompt: str, width: int, height: int, seed: int) -> bytes:
    """Call the ComfyUI Z-Image endpoint via curl (avoids Python SSL issues) and return raw image bytes."""
    payload = json.dumps({
        "prompt": prompt,
        "width": width,
        "height": height,
        "seed": seed,
    })

    # Use curl (handles SSL correctly, unlike Python 3.14 urllib on this machine)
    result = subprocess.run(
        ["curl", "-sL", "--max-time", "300", "-X", "POST", COMFYUI_URL,
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True,
        timeout=320,
    )

    if result.returncode != 0:
        raise RuntimeError(f"curl failed (exit {result.returncode}): {result.stderr.decode()[:200]}")

    img_bytes = result.stdout
    if len(img_bytes) < 1000:
        raise RuntimeError(f"Response too small ({len(img_bytes)} bytes), likely an error: {img_bytes[:200]}")

    return img_bytes


def main():
    print("═══ Holly Z-Image Training Candidate Generator ═══")
    print(f"Endpoint: {COMFYUI_URL}")
    print(f"Output: {OUTPUT_DIR}/")
    print()

    total_images = sum(cat["count"] for cat in CATEGORIES.values())
    print(f"Total candidates: {total_images}")
    print(f"Categories: {', '.join(CATEGORIES.keys())}")
    print()

    # Create output dirs
    for cat in CATEGORIES:
        (OUTPUT_DIR / cat).mkdir(parents=True, exist_ok=True)

    generated = 0
    failed = 0

    for cat_name, cat_config in CATEGORIES.items():
        print(f"── {cat_name.upper()} ({cat_config['count']} candidates) ──")

        # Use portrait for face, landscape for standing, square for others
        if cat_name == "face":
            w, h = 832, 1216  # portrait
        elif cat_name == "standing":
            w, h = 832, 1216  # portrait (full body needs height)
        else:
            w, h = 1024, 1024  # square

        for i, prompt in enumerate(cat_config["prompts"], 1):
            seed = hash(f"{cat_name}_{i}") % (2**31)  # deterministic seed
            filename = f"{cat_name}_{i:03d}.png"
            filepath = OUTPUT_DIR / cat_name / filename

            if filepath.exists():
                print(f"  ✅ {filename} (already exists, skipping)")
                generated += 1
                continue

            print(f"  📸 Generating {filename}... ", end="", flush=True)
            try:
                img_bytes = generate_image(prompt, w, h, seed)
                filepath.write_bytes(img_bytes)
                size_kb = len(img_bytes) // 1024
                print(f"✅ {size_kb}KB")
                generated += 1

                # Save the prompt alongside (for reference, not for training caption)
                prompt_file = filepath.with_suffix(".prompt.txt")
                prompt_file.write_text(prompt)

            except Exception as e:
                print(f"❌ {e}")
                failed += 1

            # Small delay to avoid hammering the endpoint
            time.sleep(1)

        print()

    print("═══ Generation Complete ═══")
    print(f"Generated: {generated}")
    print(f"Failed: {failed}")
    print()
    print(f"📂 Browse candidates: file://{OUTPUT_DIR.resolve()}")
    print()
    print("NEXT STEPS:")
    print("1. Look through each category folder")
    print("2. Pick the images that look most like Holly")
    print("3. Tell me which files you chose")
    print("4. I'll rewrite captions + upload for training")


if __name__ == "__main__":
    main()
