#!/usr/bin/env python3
"""
HOLLY v2.5 — TRAINING CAPTION GENERATOR
═══════════════════════════════════════════════════════════════════════
Walks klein-batch-v25-FINAL/ and civitai-batch/ and generates clean
training-ready .txt captions for every image.

PHILOSOPHY
──────────
Generation prompts were full of "render-time workarounds" (exactly two arms,
ten toes total, no extra fingers, single pair of feet). Those were fixes
for Klein's tendency to add phantom limbs — they should NOT be trained
into the LoRA, otherwise the model learns the workaround as a concept.

Training captions are SHORT, consistent, and describe the RESULT:
  h0lly-body woman, [Holly canon anatomy], [pose], [action], [lighting]

FILE HANDLING
─────────────
Klein: existing .txt files contain generation prompt + seed (provenance).
  Renamed to .prompt.txt so they're preserved but not used as training caps.
  Fresh .txt files written with clean training captions.

Civitai: no .txt files exist. Derived from subfolder name + category template.

USAGE
─────
    # Sample 2 images per category, print captions, write nothing
    python scripts/caption-v25-dataset.py --sample 2 --dry-run

    # Process all images, write all .txt files
    python scripts/caption-v25-dataset.py

    # Process all but verbosely
    python scripts/caption-v25-dataset.py --verbose
"""

import argparse
import re
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
DATASET_ROOT = Path(
    "/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25"
)
KLEIN_DIR = DATASET_ROOT / "klein-batch-v25-FINAL"
CIVITAI_DIR = DATASET_ROOT / "civitai-batch"

# ─────────────────────────────────────────────────────────────────────────────
# Holly Anatomy Canon — LOCKED v3.4 (DO NOT MODIFY)
# Source: HOLLY_ANATOMY.md
# ─────────────────────────────────────────────────────────────────────────────
HOLLY_CORE = (
    "h0lly-body woman, "
    "auburn hair with copper and gold highlights, "
    "olive skin, green almond-shaped eyes, "
    "34C natural teardrop breasts with medium rosy-pink nipples, "
    "heart-shaped butt, fit-toned-soft hourglass figure, "
    "freckles across nose and cheeks"
)

# Category-specific anatomy add-ons (only what's RELEVANT to that category)
ANATOMY_ADDONS = {
    "dildo": "smooth bare pubic mound, swollen pink inner labia",
    "dildo_masturbation": "smooth bare pubic mound, swollen pink inner labia, flushed chest",
    "bent_over": "1.5 inch perineum, pink-brown anus with natural wrinkled texture, smooth bare pubic mound",
    "doggystyle": "1.5 inch perineum, pink-brown anus, swollen pink inner labia slick with wetness",
    "closeup": "smooth bare pubic mound, small pink inner labia, single vaginal opening",
    "masturbation": "smooth bare pubic mound, swollen pink inner labia, flushed chest and cheeks",
    "spread": "smooth bare pubic mound, small pink inner labia, single vaginal opening",
    "squirting": "smooth bare pubic mound, swollen pink inner labia, glistening wetness",
    "squirting_arc": "smooth bare pubic mound, glistening arousal fluid, clearish slick wetness",
    "squirting_drip": "smooth bare pubic mound, translucent lubrication with slight creamy cloudiness",
    "civitai_closeup": "smooth bare pubic mound, small pink inner labia",
}

# ─────────────────────────────────────────────────────────────────────────────
# Caption Templates by Category
# ─────────────────────────────────────────────────────────────────────────────
# Each template takes (anatomy_core, anatomy_addon) and returns a caption.
# Templates describe the RESULT (what's in the image), not the workaround.
# ─────────────────────────────────────────────────────────────────────────────

def caption_dildo() -> str:
    """T2_dildo — Dildo penetration, lying back or sitting"""
    return (
        f"{HOLLY_CORE}, fully nude, "
        "lying back on a bed holding a smooth pink dildo with both hands, "
        "dildo inserted into her pussy, "
        f"{ANATOMY_ADDONS['dildo']}, "
        "legs spread wide, eyes half-closed in pleasure, "
        "soft warm bedroom lighting, photorealistic explicit detail"
    )

def caption_dildo_masturbation() -> str:
    """T2alt_dildo_masturbation — Active self-pleasure with dildo"""
    return (
        f"{HOLLY_CORE}, fully nude, "
        "actively masturbating with a dildo between her legs, "
        "both hands holding the dildo, dildo inside her pussy, "
        f"{ANATOMY_ADDONS['dildo_masturbation']}, "
        "translucent natural lubrication with slight creamy cloudiness, "
        "legs parted, mouth slightly open, auburn hair spread on pillow, "
        "soft warm lighting, photorealistic explicit self-pleasure scene"
    )

def caption_bent_over() -> str:
    """T4_bent_over — Bent over from behind, hands on knees or bed"""
    return (
        f"{HOLLY_CORE}, fully nude, "
        "bent over forward at the waist, legs shoulder-width apart, "
        "viewed from directly behind, her back to the camera, "
        "very large plump round butt filling the frame, "
        "her pussy and anus visible between her thighs from behind, "
        f"{ANATOMY_ADDONS['bent_over']}, "
        "auburn hair falling down her back, face not visible, "
        "soft warm lighting, photorealistic explicit rear view"
    )

def caption_doggystyle() -> str:
    """T4_bent_over_v3_doggystyle — On all fours, rear view"""
    return (
        f"{HOLLY_CORE}, fully nude, "
        "on all fours in doggystyle position on a bed, "
        "back flat and level, hands pressing flat into the mattress, "
        "butt raised and pointed at the camera, "
        "viewed from directly behind at hip height, "
        "very large plump round butt filling the frame, "
        "her pussy and anus visible between her parted thighs in doggystyle orientation, "
        "anus uppermost near her lower back, vaginal opening directly below, "
        f"{ANATOMY_ADDONS['doggystyle']}, "
        "face turned away, auburn hair hanging forward out of view, "
        "soft warm lighting, photorealistic explicit from-behind view"
    )

def caption_closeup() -> str:
    """T5_closeup — Pussy closeup, resting state"""
    return (
        f"{HOLLY_CORE}, fully nude, "
        "intimate closeup between her legs from the front, "
        "resting state pussy, no hands in frame, "
        f"{ANATOMY_ADDONS['closeup']}, "
        "thighs parted softly, "
        "soft studio lighting, photorealistic high-detail intimate view"
    )

# ─────────────────────────────────────────────────────────────────────────────
# Civitai pose-specific captions (mapped from subfolder names)
# ─────────────────────────────────────────────────────────────────────────────

def caption_civitai_masturbation(pose_key: str) -> str:
    """Civitai Category 1 — Masturbation poses"""
    base = (
        f"{HOLLY_CORE}, fully nude, "
        f"{ANATOMY_ADDONS['masturbation']}, "
        "actively masturbating, explicit self-pleasure scene, "
    )
    poses = {
        "1.1": (
            "lying on her back on a bed, right hand between her legs with fingertips "
            "pressed against her clitoral hood rubbing in rhythmic circles, "
            "left hand resting naturally on her breast, "
            "legs parted, knees slightly bent, "
            "eyes closed in pleasure, mouth parted, "
            "auburn hair spread on pillow, "
            "soft warm lighting, photorealistic explicit masturbation scene"
        ),
        "1.2": (
            "sitting upright on a bed with legs spread, fingers of her right hand sliding "
            "between her inner labia, left hand resting on her inner thigh, "
            "hips tilted forward, eyes half-closed, lips parted, "
            "soft warm lighting, photorealistic explicit masturbation scene"
        ),
        "1.3": (
            "lying on her side on a bed, legs pressed together with her hand slipped "
            "between her thighs from the front, fingers pressed against her vulva, "
            "knees slightly bent, auburn hair cascading on the sheet, "
            "eyes closed dreamily, soft warm lighting, "
            "photorealistic explicit side-lying masturbation scene"
        ),
    }
    return base + poses.get(pose_key, poses["1.1"])


def caption_civitai_spread(pose_key: str) -> str:
    """Civitai Category 2 — Spread poses (hands spreading labia)"""
    base = (
        f"{HOLLY_CORE}, fully nude, "
        f"{ANATOMY_ADDONS['spread']}, "
        "explicit spreading scene, "
    )
    poses = {
        "2.1": (
            "lying on her back on a bed with legs spread wide, both hands reaching down "
            "spreading her outer labia apart with her fingertips, "
            "inner labia and vaginal opening revealed, "
            "knees bent and held apart, eyes looking down, "
            "soft studio lighting, photorealistic explicit spread view"
        ),
        "2.2": (
            "squatting with knees apart, both hands between her legs spreading her outer "
            "labia with fingertips, inner labia and vaginal opening clearly visible, "
            "supporting her weight on the balls of her feet, "
            "auburn hair falling forward over her shoulders, "
            "soft studio lighting, photorealistic explicit squatting spread view"
        ),
    }
    return base + poses.get(pose_key, poses["2.1"])


def caption_civitai_squirting(pose_key: str) -> str:
    """Civitai Category 3 — Squirting poses"""
    base = f"{HOLLY_CORE}, fully nude, "
    poses = {
        "3.1": (
            f"{ANATOMY_ADDONS['squirting_arc']}, "
            "arching her back on a bed with her right hand pressing on her lower stomach "
            "above her pubic mound, clear fluid squirting in an arc from her pussy, "
            "legs spread wide, mouth open in orgasm, "
            "auburn hair fanning on the sheet, "
            "soft warm lighting, photorealistic explicit squirting scene"
        ),
        "3.2": (
            f"{ANATOMY_ADDONS['squirting']}, "
            "two fingers of her right hand inserted in her pussy, "
            "clear fluid squirting around her fingers in an explicit arc, "
            "lying back with legs spread wide, hips tilted up, "
            "mouth open in climax, flushed skin, "
            "soft warm lighting, photorealistic explicit squirting masturbation scene"
        ),
        "3.3": (
            f"{ANATOMY_ADDONS['squirting_drip']}, "
            "post-orgasm, lying on her back breathing heavily, "
            "translucent creamy fluid dripping from her pussy down across her perineum "
            "and inner thighs, hands resting at her sides relaxed, "
            "legs softly parted, dreamy afterglow expression, "
            "soft warm lighting, photorealistic explicit post-orgasm scene"
        ),
    }
    return base + poses.get(pose_key, poses["3.1"])


def caption_civitai_closeup(pose_key: str) -> str:
    """Civitai Category 4 — Pussy closeup variations"""
    base = (
        f"{HOLLY_CORE}, fully nude, "
        f"{ANATOMY_ADDONS['civitai_closeup']}, "
    )
    poses = {
        "4.1": (
            "extreme intimate closeup between her legs from the front, "
            "pussy in resting state, no hands in frame, "
            "smooth bare mons pubis, inner labia softly closed, "
            "soft studio lighting, photorealistic high-detail intimate closeup"
        ),
        "4.2": (
            "intimate closeup between her legs from the front, "
            "fingertips of both hands gently framing her outer labia without spreading, "
            "inner labia visible between her fingers, "
            "soft studio lighting, photorealistic high-detail intimate closeup"
        ),
        "4.3": (
            "intimate closeup between her legs from the front, "
            "single fingertip of her right hand resting gently on her clitoral hood, "
            "inner labia visible below, left hand resting on her inner thigh, "
            "soft studio lighting, photorealistic high-detail intimate closeup"
        ),
    }
    return base + poses.get(pose_key, poses["4.1"])


# ─────────────────────────────────────────────────────────────────────────────
# Klein category → caption function map
# ─────────────────────────────────────────────────────────────────────────────
KLEIN_CAPTIONERS = {
    "T2_dildo": caption_dildo,
    "T2alt_dildo_masturbation": caption_dildo_masturbation,
    "T4_bent_over": caption_bent_over,
    "T4_bent_over_v3_doggystyle": caption_doggystyle,
    "T5_closeup": caption_closeup,
}

# Civitai category → (captioner, pose-key regex)
CIVITAI_CAPTIONERS = {
    "1_masturbation": (caption_civitai_masturbation, r"Prompt (\d+\.\d+)"),
    "2_spread": (caption_civitai_spread, r"Prompt (\d+\.\d+)"),
    "3_squirting": (caption_civitai_squirting, r"Prompt (\d+\.\d+)"),
    "4_closeup": (caption_civitai_closeup, r"Prompt (\d+\.\d+)"),
}

IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png"}


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def process_klein(args) -> dict:
    """Process Klein batch: rename existing .txt to .prompt.txt, write new captions."""
    stats = {"processed": 0, "renamed": 0, "written": 0, "by_category": {}}

    if not KLEIN_DIR.exists():
        print(f"⚠️  Klein dir not found: {KLEIN_DIR}")
        return stats

    for category_dir in sorted(KLEIN_DIR.iterdir()):
        if not category_dir.is_dir():
            continue
        category = category_dir.name
        if category not in KLEIN_CAPTIONERS:
            print(f"  ⤷ skipping unknown Klein category: {category}")
            continue

        captioner = KLEIN_CAPTIONERS[category]
        caption = captioner()
        cat_count = 0

        images = sorted([p for p in category_dir.iterdir()
                        if p.suffix.lower() in IMAGE_EXTS])

        if args.sample and args.sample > 0:
            images = images[: args.sample]

        for img_path in images:
            stats["processed"] += 1
            cat_count += 1
            txt_path = img_path.with_suffix(".txt")
            prompt_archive_path = img_path.with_suffix(".prompt.txt")

            # Preserve existing .txt (generation prompt) as .prompt.txt
            if txt_path.exists() and not prompt_archive_path.exists():
                if not args.dry_run:
                    txt_path.rename(prompt_archive_path)
                stats["renamed"] += 1

            # Write fresh caption
            if args.verbose or args.dry_run:
                print(f"\n  📝 {img_path.name}")
                print(f"     Caption: {caption[:150]}...")

            if not args.dry_run:
                txt_path.write_text(caption + "\n", encoding="utf-8")
            stats["written"] += 1

        stats["by_category"][f"klein/{category}"] = cat_count
        print(f"  ✅ klein/{category}: {cat_count} images")

    return stats


def process_civitai(args) -> dict:
    """Process Civitai batch: derive pose from subfolder name, write captions."""
    stats = {"processed": 0, "written": 0, "skipped": 0, "by_category": {}}

    if not CIVITAI_DIR.exists():
        print(f"⚠️  Civitai dir not found: {CIVITAI_DIR}")
        return stats

    for category_dir in sorted(CIVITAI_DIR.iterdir()):
        if not category_dir.is_dir():
            continue
        category = category_dir.name
        if category not in CIVITAI_CAPTIONERS:
            print(f"  ⤷ skipping unknown Civitai category: {category}")
            continue

        captioner, pose_regex = CIVITAI_CAPTIONERS[category]
        cat_count = 0

        for subfolder in sorted(category_dir.iterdir()):
            if not subfolder.is_dir():
                continue

            # Extract pose key from subfolder name (e.g., "Prompt 1.1" → "1.1")
            match = re.search(pose_regex, subfolder.name)
            if not match:
                print(f"     ⚠️ no pose key in: {subfolder.name}")
                continue
            pose_key = match.group(1)
            caption = captioner(pose_key)

            images = sorted([p for p in subfolder.iterdir()
                            if p.suffix.lower() in IMAGE_EXTS])

            if args.sample and args.sample > 0:
                # Sample N per subfolder for civitai (since each subfolder is a distinct pose)
                images = images[: args.sample]

            for img_path in images:
                stats["processed"] += 1
                cat_count += 1
                txt_path = img_path.with_suffix(".txt")

                if args.verbose or args.dry_run:
                    print(f"\n  📝 {category}/{subfolder.name}/{img_path.name}")
                    print(f"     Pose key: {pose_key}")
                    print(f"     Caption: {caption[:150]}...")

                if not args.dry_run:
                    txt_path.write_text(caption + "\n", encoding="utf-8")
                stats["written"] += 1

        stats["by_category"][f"civitai/{category}"] = cat_count
        print(f"  ✅ civitai/{category}: {cat_count} images")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Holly v2.5 training caption generator"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print captions without writing files"
    )
    parser.add_argument(
        "--sample", type=int, default=0,
        help="Process only N images per category (for review). 0 = all"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Print every caption as it's generated"
    )
    parser.add_argument(
        "--klein-only", action="store_true",
        help="Process only Klein batch"
    )
    parser.add_argument(
        "--civitai-only", action="store_true",
        help="Process only Civitai batch"
    )
    args = parser.parse_args()

    print("=" * 70)
    print("HOLLY v2.5 — TRAINING CAPTION GENERATOR")
    print("=" * 70)
    print(f"Mode: {'DRY RUN (no files written)' if args.dry_run else 'WRITE'}")
    print(f"Sample limit: {args.sample if args.sample else 'ALL'}")
    print(f"Dataset root: {DATASET_ROOT}")
    print()

    klein_stats = {}
    civitai_stats = {}

    if not args.civitai_only:
        print("── KLEIN BATCH ──")
        klein_stats = process_klein(args)
        print()

    if not args.klein_only:
        print("── CIVITAI BATCH ──")
        civitai_stats = process_civitai(args)
        print()

    # Summary
    total_processed = klein_stats.get("processed", 0) + civitai_stats.get("processed", 0)
    total_written = klein_stats.get("written", 0) + civitai_stats.get("written", 0)
    total_renamed = klein_stats.get("renamed", 0)

    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Images processed:  {total_processed}")
    print(f"  Captions written:  {total_written}")
    print(f"  Prompt files archived (.prompt.txt): {total_renamed}")
    print()
    print("By category:")
    for k, v in {**klein_stats.get("by_category", {}), **civitai_stats.get("by_category", {})}.items():
        print(f"  {k}: {v}")

    if args.dry_run:
        print()
        print("⚠️  DRY RUN — no files written. Re-run without --dry-run to write captions.")
    else:
        print()
        print(f"✅ Done. {total_written} training captions written.")


if __name__ == "__main__":
    main()
