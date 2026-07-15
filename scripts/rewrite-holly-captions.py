#!/usr/bin/env python3
"""
Holly Caption Rewriter
━━━━━━━━━━━━━━━━━━━━━
Rewrites training captions per FACT.md lessons:

OLD (verbose, ~614 chars avg):
  "h0lly-body woman, auburn hair with copper and gold highlights, olive skin,
   green almond-shaped eyes, 34C natural teardrop breasts with medium rosy-pink
   nipples, heart-shaped butt, fit-toned-soft hourglass figure, freckles across
   nose and cheeks, fully nude, lying back on a bed holding a smooth pink..."

NEW (short, ~40 chars):
  "h0lly, h0lly-body, woman lying on bed, soft lighting"

Rules (FACT.md):
  - Trigger words ONLY: h0lly, h0lly-body
  - Outfit/setting/pose ONLY — NO body description
  - Lock traits in WEIGHTS via absence from captions
  - Never mention: eye color, breast size, hair color, body type, skin tone

Usage:
  python3 scripts/rewrite-holly-captions.py --dataset-dir holly-zimage-curated/

This operates on a CURATED dataset (the 25 images Steve picked).
It does NOT touch the original dataset.
"""

import os
import re
import sys
import argparse
from pathlib import Path

# Trigger words (always prepended)
TRIGGER = "h0lly, h0lly-body"

# Category-based caption templates (short, pose/setting only)
# Key: derived from directory name or filename prefix
CATEGORY_CAPTIONS = {
    "01_dildo": "woman using a dildo, lying on bed",
    "02_dildo_masturbation": "woman masturbating with a toy, on bed",
    "03_masturbation": "woman touching herself, on bed, intimate",
    "04_spread": "woman lying with legs spread, on bed",
    "05_squirting": "woman experiencing climax, wet",
    "06_closeup_resting": "closeup of woman resting, intimate detail",
    "07_closeup_hands": "closeup of woman's hands on body",
    "08_from_behind": "woman bent over, viewed from behind",
    "standing": "woman standing, full body, head to toe",
    "face": "closeup portrait of woman's face, smiling",
}

# Words to STRIP from captions (body descriptions that should be in weights, not captions)
STRIP_PATTERNS = [
    # Body measurements / descriptions
    r'\b\d{2}[A-G]\b', r'natural teardrop breasts', r'medium rosy-pink nipples',
    r'heart-shaped butt', r'fit-toned-soft hourglass figure',
    # Skin/hair/eye descriptions
    r'olive skin(?:\s*tone)?', r'green almond-shaped eyes',
    r'auburn hair(?:\s*with\s*copper\s*and\s*gold\s*highlights)?',
    r'freckles across nose and cheeks', r'\d+ years old',
    r'Portuguese/South Indian heritage', r'youthful young adult',
    r'smooth bright under-eye', r'flawless silky smooth',
    # Redundant descriptors
    r'single woman, one body, one head, exactly two arms.*?(?=\w{3})',
    r'completely nude woman, fully naked.*?(?=\w{3})',
]


def get_category_from_path(filepath: Path) -> str:
    """Extract category from parent dir or filename prefix."""
    parent = filepath.parent.name
    if parent in CATEGORY_CAPTIONS:
        return parent
    # Try filename prefix (e.g., "dildo_001" → "dildo")
    stem = filepath.stem
    for prefix in ["dildo_mast", "dildo", "masturbation", "spread", "squirting",
                   "closeup_resting", "closeup_hands", "from_behind", "standing", "face"]:
        if stem.lower().startswith(prefix):
            # Map to dir-style key
            for key in CATEGORY_CAPTIONS:
                if prefix in key:
                    return key
    return ""


def rewrite_caption(filepath: Path) -> str:
    """Generate a short caption based on category + trigger words."""
    category = get_category_from_path(filepath)
    suffix = CATEGORY_CAPTIONS.get(category, "woman in an intimate pose")
    return f"{TRIGGER}, {suffix}"


def process_dataset(dataset_dir: Path, dry_run: bool = False):
    """Rewrite all .txt captions in the dataset directory."""
    txt_files = sorted(dataset_dir.rglob("*.txt"))
    # Exclude non-caption txt files
    txt_files = [f for f in txt_files if f.name not in ("README.md", "CURATION_CHECKLIST.md")]

    if not txt_files:
        print(f"❌ No .txt caption files found in {dataset_dir}")
        return

    print(f"═══ Caption Rewriter ═══")
    print(f"Dataset: {dataset_dir}")
    print(f"Captions to rewrite: {len(txt_files)}")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'WRITE'}")
    print()

    rewritten = 0
    for txt in txt_files:
        old_caption = txt.read_text().strip()
        new_caption = rewrite_caption(txt)

        # Show before/after for first few
        if rewritten < 5:
            print(f"  {txt.name}:")
            print(f"    OLD ({len(old_caption)} chars): {old_caption[:80]}...")
            print(f"    NEW ({len(new_caption)} chars): {new_caption}")
            print()

        if not dry_run:
            txt.write_text(new_caption + "\n")
        rewritten += 1

    print(f"✅ {'Would rewrite' if dry_run else 'Rewrote'} {rewritten} captions")
    print(f"   Avg OLD: ~614 chars → Avg NEW: ~{len(TRIGGER) + 30} chars")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rewrite Holly training captions (short per FACT.md)")
    parser.add_argument("--dataset-dir", required=True, help="Path to curated dataset directory")
    parser.add_argument("--dry-run", action="store_true", help="Show changes without writing")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset_dir)
    if not dataset_dir.exists():
        print(f"❌ Directory not found: {dataset_dir}")
        sys.exit(1)

    process_dataset(dataset_dir, dry_run=args.dry_run)
