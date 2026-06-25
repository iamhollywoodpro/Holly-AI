#!/usr/bin/env python3
"""
HOLLY Body LoRA v2.5 — COMBINE & CAPTION
═══════════════════════════════════════════════════════════════════════
Combines klein-batch-v25/ + civitai-batch-v25/ into a single TRAINING/
folder with sequential filenames and auto-generated captions.

Output:
  holly-body-lora-dataset-v25/TRAINING/
    ├── images/      (all ~300 images, renamed: holly_v25_00001.webp ...)
    ├── captions/    (matching .txt files with trigger-word captions)
    └── manifest.json (source mapping, categories, counts)

Caption strategy:
  Each image gets a caption file with:
    - Trigger words (h0lly h0lly-body)
    - Category tag (e.g., "dildo insertion", "bent over from behind")
    - Anatomical anchors from HOLLY_ANATOMY.md
    - Scene description (derived from folder name)

USAGE:
    python scripts/combine-v25-dataset.py
    python scripts/combine-v25-dataset.py --dry-run  # preview without copy
"""

import argparse
import json
import shutil
from pathlib import Path
from typing import Dict, List

DATASET_ROOT = Path("/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25")
KLEIN_BATCH = DATASET_ROOT / "klein-batch-v25"
CIVITAI_BATCH = DATASET_ROOT / "civitai-batch-v25"
TRAINING = DATASET_ROOT / "TRAINING"

# ─────────────────────────────────────────────────────────────────────────────
# Category → caption mapping
# ─────────────────────────────────────────────────────────────────────────────
CAPTION_MAP: Dict[str, str] = {
    # Klein categories
    "T2_dildo": "h0lly h0lly-body, completely nude woman, lying back, "
                "penetrating her pussy with a glass dildo, explicit dildo insertion, "
                "knees up, legs spread wide, flushed, moaning, bedroom, photorealistic",
    "T2alt_dildo_masturbation": "h0lly h0lly-body, completely nude woman, "
                                "masturbating with a glass dildo, self-pleasure, "
                                "dildo inside her pussy, penetrating herself, "
                                "legs spread, explicit, bedroom, photorealistic",
    "T2squirt_dildo_orgasm": "h0lly h0lly-body, completely nude woman, "
                             "intense orgasm, squirting from her pussy, "
                             "clear female ejaculation, dildo inside her triggering climax, "
                             "back arched, mouth open, flushed, explicit, photorealistic",
    "T4_bent_over": "h0lly h0lly-body, completely nude woman, "
                    "bent over from behind, viewed from directly behind, "
                    "both her pussy and anus visible, large heart-shaped butt, "
                    "explicit anatomical detail, photorealistic",
    "T5_closeup": "h0lly h0lly-body, extreme close-up, pussy focal point, "
                  "small neat proportional inner labia, smooth Brazilian wax, "
                  "clinical explicit detail, photorealistic, face not in frame",
    # Civitai categories
    "T1_finger_masturbation": "h0lly h0lly-body, completely nude woman, "
                              "lying back, fingering her pussy, self-pleasure, "
                              "finger inserted inside her, explicit masturbation, "
                              "legs spread, flushed, photorealistic",
    "T3_spread_with_spreading": "h0lly h0lly-body, completely nude woman, "
                                "lying back, spreading her inner labia apart with fingers, "
                                "vaginal opening visible, explicit spread closeup, "
                                "clinical detail, photorealistic",
    "T1b_from_behind_fingering": "h0lly h0lly-body, completely nude woman, "
                                  "bent over from behind, fingering herself from behind, "
                                  "finger inserted in her pussy or asshole from behind, "
                                  "both holes visible, explicit, photorealistic",
}


def collect_images() -> List[Dict]:
    """Walk both batch folders and collect all images with metadata."""
    images = []
    for batch_path, source in [(KLEIN_BATCH, "klein"), (CIVITAI_BATCH, "civitai")]:
        if not batch_path.exists():
            print(f"⚠️  {batch_path} not found — skipping")
            continue
        for cat_dir in sorted(batch_path.iterdir()):
            if not cat_dir.is_dir() or cat_dir.name.startswith("_"):
                continue
            cat_name = cat_dir.name
            for img in sorted(cat_dir.glob("*.webp")):
                prompt_file = img.with_suffix(".txt")
                prompt_text = prompt_file.read_text(encoding="utf-8") if prompt_file.exists() else ""
                images.append({
                    "source_path": str(img),
                    "source_batch": source,
                    "category": cat_name,
                    "filename": img.name,
                    "prompt_text": prompt_text,
                })
    return images


def build_training(images: List[Dict], dry_run: bool = False) -> Dict:
    """Copy images to TRAINING/ with sequential names + write captions."""
    if not dry_run:
        (TRAINING / "images").mkdir(parents=True, exist_ok=True)
        (TRAINING / "captions").mkdir(parents=True, exist_ok=True)

    manifest = []
    for i, img in enumerate(images, 1):
        new_name = f"holly_v25_{i:05d}.webp"
        new_caption = f"holly_v25_{i:05d}.txt"
        dest_img = TRAINING / "images" / new_name
        dest_cap = TRAINING / "captions" / new_caption

        # Build caption from category + original prompt
        caption_base = CAPTION_MAP.get(img["category"], "h0lly h0lly-body, explicit nude, photorealistic")
        # Add variety: include a slice of original prompt for richer training signal
        original_hint = img["prompt_text"].split("PROMPT:")[1][:200].strip() if "PROMPT:" in img["prompt_text"] else ""
        full_caption = caption_base + ("\n\nOriginal scene: " + original_hint if original_hint else "")

        if not dry_run:
            shutil.copy2(img["source_path"], dest_img)
            dest_cap.write_text(full_caption, encoding="utf-8")

        manifest.append({
            "seq": i,
            "new_name": new_name,
            "source_batch": img["source_batch"],
            "category": img["category"],
            "original_filename": img["filename"],
        })

    return {
        "total_images": len(manifest),
        "by_batch": {
            "klein": sum(1 for m in manifest if m["source_batch"] == "klein"),
            "civitai": sum(1 for m in manifest if m["source_batch"] == "civitai"),
        },
        "by_category": {cat: sum(1 for m in manifest if m["category"] == cat) for cat in CAPTION_MAP.keys()},
        "images": manifest,
    }


def main():
    parser = argparse.ArgumentParser(description="Combine Klein + Civitai batches for v2.5 training")
    parser.add_argument("--dry-run", action="store_true", help="Preview without copying files")
    args = parser.parse_args()

    print("=" * 70)
    print("HOLLY v2.5 — DATASET COMBINER")
    print("=" * 70)
    print(f"Klein batch:   {KLEIN_BATCH}")
    print(f"Civitai batch: {CIVITAI_BATCH}")
    print(f"Output:        {TRAINING}")
    print(f"Mode:          {'DRY RUN' if args.dry_run else 'EXECUTE'}")
    print()

    images = collect_images()
    print(f"Found {len(images)} images total")

    if not images:
        print("❌ No images found — run both batches first")
        return

    result = build_training(images, dry_run=args.dry_run)

    print(f"\n{'=' * 70}")
    print(f"{'Preview (dry run)' if args.dry_run else 'COMPLETE'}")
    print(f"{'=' * 70}")
    print(f"Total images: {result['total_images']}")
    print(f"From Klein:   {result['by_batch']['klein']}")
    print(f"From Civitai: {result['by_batch']['civitai']}")
    print(f"\nBy category:")
    for cat, count in result["by_category"].items():
        if count > 0:
            print(f"  {cat:<35} {count}")

    if not args.dry_run:
        manifest_path = TRAINING / "manifest.json"
        manifest_path.write_text(json.dumps(result, indent=2))
        print(f"\nManifest: {manifest_path}")
        print(f"\nNext: Train v2.5 LoRA using TRAINING/images/ + TRAINING/captions/")
    else:
        print(f"\n(Dry run — no files copied. Re-run without --dry-run to execute.)")


if __name__ == "__main__":
    main()
