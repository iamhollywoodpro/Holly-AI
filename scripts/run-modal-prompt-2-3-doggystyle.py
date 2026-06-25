#!/usr/bin/env python3
"""
HOLLY v2.5 — MODAL A100 REPLACEMENT FOR CIVITAI PROMPT 2.3
═══════════════════════════════════════════════════════════════════════
Civitai Klein Distilled + 3-LoRA stack could not produce correct from-behind
orientation (pussy kept rendering upside-down, duplicate orifices, weird body
bending). Pivoted Prompt 2.3 to Modal A100 with the proven Smoke8 recipe:

  - LoRA: femaleasshole-f2-klein-9b-musubituner @ 1.0 (PERFECT in Smoke8)
  - Endpoint: iamhollywoodpro--generate-holly-a100.modal.run
  - Steps: 8 / CFG: 1.2 / Euler / 1024x1024 (locked Klein Distilled recipe)

OUTPUT: 10 images to T4_bent_over_v3_doggystyle/
This DOES NOT touch the existing 40 T4_bent_over images (proven Smoke8 batch).

CANONICAL ANATOMY SOURCE: HOLLY_ANATOMY.md v3.4 (LOCKED CANON)
  - Perineum: 1.5 inches (3-4 cm)
  - Doggystyle orientation: anus at top, vaginal opening below, perineum between

USAGE:
    python scripts/run-modal-prompt-2-3-doggystyle.py
"""

import sys
import time
import json
from pathlib import Path

import requests

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
ENDPOINT = "https://iamhollywoodpro--generate-holly-a100.modal.run"
HEALTH = "https://iamhollywoodpro--holly-health-a100.modal.run"
OUTPUT_FOLDER = Path(
    "/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25/"
    "klein-batch-v25-FINAL/T4_bent_over_v3_doggystyle"
)
TARGET_IMAGES = 10

# Proven anchors from batch-klein-v25-locked.py (DO NOT MODIFY)
NUDE = "completely nude woman, fully naked, bare skin, not wearing any clothing, "
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

# Locked LoRA (Smoke8 PERFECT winner, replaced flux2klein_vulva_and_anus_from_behind_v1)
LORA_STACK = [{"file": "femaleasshole-f2-klein-9b-musubituner.safetensors", "strength": 1.0}]

# Prompt 2.3 v3 — Doggystyle from behind
# Combines Steve's v3 doggystyle orientation language + proven ANATOMY anchors
# + locked 1.5-inch perineum canon. No spreading cheeks (proven recipe shows
# orifices naturally between parted thighs without manual spreading).
PROMPT = (
    NUDE
    + "bare back, bare chest, wearing nothing, "
    + ANATOMY + ", "
    + "in a doggystyle position on a bed — on all fours with her hands and knees on the mattress, "
    + "back flat and level, upper body weight borne by her hands pressing flat into the mattress, "
    + "breasts hanging naturally beneath her out of view from this rear angle, "
    + "butt raised and pointed directly at the camera, "
    + "legs parted knee-width apart, slender waist and taut flat midsection with no belly protrusion, "
    + "viewed from directly behind, camera positioned behind her at hip height, "
    + "her very large plump round butt filling the frame, thick full butt cheeks, "
    + "her pussy and anus visible between her thighs from behind in correct doggystyle orientation — "
    + "anus at the uppermost visible point closest to her lower back, "
    + "vaginal opening directly below the anus, "
    + "1.5 inch perineum of skin between them at correct adult female anatomical spacing, "
    + "swollen pink inner labia visible between her parted thighs, slick glistening wetness on her vulva, "
    + "correct human anatomy, proper body proportions, anatomically correct detail for from-behind doggystyle view, "
    + "face turned away from view, auburn hair hanging forward out of view, "
    + "soft warm lighting, photorealistic, explicit anatomical detail from behind"
)


def health_check() -> bool:
    print(f"🩺 Health check on iamhollywoodpro endpoint...")
    print(f"   (First cold start can take 30+ minutes if endpoint scaled down)")
    try:
        r = requests.get(HEALTH, timeout=1800)
        h = r.json()
        ok = h.get("status") == "healthy"
        print(f"   Status: {h.get('status')} | Model: {h.get('model')}")
        return ok
    except Exception as e:
        print(f"   ❌ {e}")
        return False


def generate_image(prompt: str, loras: list, seed: int) -> bytes:
    payload = {
        "prompt": prompt,
        "width": 1024,
        "height": 1024,
        "num_inference_steps": 8,
        "guidance_scale": 1.2,
        "format": "webp",
        "loras": loras,
        "seed": seed,
    }
    r = requests.post(ENDPOINT, json=payload, timeout=600)
    r.raise_for_status()
    return r.content


def main():
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("HOLLY v2.5 — MODAL REPLACEMENT FOR CIVITAI PROMPT 2.3")
    print("=" * 70)
    print(f"Endpoint: {ENDPOINT}")
    print(f"Output:   {OUTPUT_FOLDER}/")
    print(f"Target:   {TARGET_IMAGES} images")
    print(f"LoRA:     femaleasshole-f2-klein-9b-musubituner @ 1.0")
    print(f"Steps:    8 / CFG: 1.2 / Euler / 1024x1024")
    print()

    if not health_check():
        print("❌ Endpoint unhealthy — aborting")
        sys.exit(1)

    print(f"\n📋 Prompt ({len(PROMPT)} chars):")
    print(f"   {PROMPT[:200]}...")
    print()

    t_start = time.time()
    success = 0
    fail = 0

    for i in range(TARGET_IMAGES):
        seed = 52300 + i * 1000  # Distinct seeds, reproducible
        out_path = OUTPUT_FOLDER / f"doggystyle_v3_{i:03d}.webp"
        prompt_path = OUTPUT_FOLDER / f"doggystyle_v3_{i:03d}.txt"

        # Save prompt alongside
        prompt_path.write_text(
            f"Category: prompt_2_3_doggystyle_v3\n"
            f"Index: {i}\n"
            f"Seed: {seed}\n\n"
            f"PROMPT:\n{PROMPT}\n\n"
            f"LORAS:\n{LORA_STACK}\n",
            encoding="utf-8",
        )

        print(f"   [{i+1}/{TARGET_IMAGES}] {out_path.name} (seed={seed})")
        t0 = time.time()
        try:
            img_bytes = generate_image(PROMPT, LORA_STACK, seed=seed)
            elapsed = time.time() - t0
            out_path.write_bytes(img_bytes)
            print(f"      ✅ {len(img_bytes):,} bytes | {elapsed:.1f}s")
            success += 1
        except Exception as e:
            print(f"      ❌ {e}")
            fail += 1
            time.sleep(2)

    total_time = time.time() - t_start

    # Summary
    summary_path = OUTPUT_FOLDER / "_batch_summary.json"
    summary_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_time_s": round(total_time, 1),
        "endpoint": ENDPOINT,
        "target": TARGET_IMAGES,
        "success": success,
        "failed": fail,
        "lora": LORA_STACK,
        "prompt_length": len(PROMPT),
    }
    summary_path.write_text(json.dumps(summary_data, indent=2))

    print("\n" + "=" * 70)
    print("BATCH COMPLETE")
    print("=" * 70)
    print(f"  Success: {success}/{TARGET_IMAGES}")
    print(f"  Failed:  {fail}")
    print(f"\nTotal time: {total_time/60:.1f} min")
    print(f"Avg per image: {total_time/max(success,1):.1f}s")
    print(f"Summary:    {summary_path}")
    print(f"\nNext: QA spot-check the {success} images. Rejects → _rejects/ folder.")


if __name__ == "__main__":
    main()
