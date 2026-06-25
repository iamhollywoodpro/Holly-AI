#!/usr/bin/env python3
"""
HOLLY v2.5 — DATASET REORGANIZER
═══════════════════════════════════════════════════════════════════════
Consolidates the fragmented v2.5 dataset (klein-batch-v25-FINAL/ +
civitai-batch/ + dozens of legacy test folders) into a single clean
training-ready structure with consistent filenames + captions.

NEW STRUCTURE
─────────────
holly-body-lora-dataset-v25/
├── training/
│   ├── 01_dildo/                 16 imgs (Klein T2_dildo)
│   ├── 02_dildo_masturbation/    19 imgs (Klein T2alt)
│   ├── 03_masturbation/          33 imgs (Civitai Cat 1)
│   ├── 04_spread/                23 imgs (Civitai Cat 2)
│   ├── 05_squirting/             33 imgs (Civitai Cat 3)
│   ├── 06_closeup_resting/       28 imgs (Klein T5 + Civitai 4.1)
│   ├── 07_closeup_hands/         23 imgs (Civitai 4.2 + 4.3)
│   └── 08_from_behind/           32 imgs (Klein T4 + T4_v3)
├── _provenance/klein/            generation prompts + seeds (preserved)
└── _archive/legacy/              old smoke/test/pre-QA folders (excluded)

FILE RENAMING
─────────────
All images renamed to consistent scheme:
  {category_prefix}_{NNN}.{ext}
  e.g., dildo_001.webp, masturbation_001.jpg, closeup_resting_014.jpg

Each image gets a paired .txt caption file with the same basename.

USAGE
─────
    # Dry-run: print plan, change nothing
    python3 scripts/reorganize-v25-dataset.py --dry-run

    # Execute the reorg
    python3 scripts/reorganize-v25-dataset.py

    # Execute with verbose per-file log
    python3 scripts/reorganize-v25-dataset.py --verbose
"""

import argparse
import re
import shutil
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
DATASET_ROOT = Path(
    "/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25"
)
KLEIN_SRC = DATASET_ROOT / "klein-batch-v25-FINAL"
CIVITAI_SRC = DATASET_ROOT / "civitai-batch"

TRAINING_DST = DATASET_ROOT / "training"
PROVENANCE_DST = DATASET_ROOT / "_provenance" / "klein"

# ─────────────────────────────────────────────────────────────────────────────
# Holly Anatomy Canon (LOCKED v3.4)
# ─────────────────────────────────────────────────────────────────────────────
HOLLY_CORE = (
    "h0lly-body woman, "
    "auburn hair with copper and gold highlights, "
    "olive skin, green almond-shaped eyes, "
    "34C natural teardrop breasts with medium rosy-pink nipples, "
    "heart-shaped butt, fit-toned-soft hourglass figure, "
    "freckles across nose and cheeks"
)

# ─────────────────────────────────────────────────────────────────────────────
# Caption Templates — one per new training category
# ─────────────────────────────────────────────────────────────────────────────

def cap_dildo() -> str:
    return (
        f"{HOLLY_CORE}, fully nude, "
        "lying back on a bed holding a smooth pink dildo with both hands, "
        "dildo inserted into her pussy, "
        "smooth bare pubic mound, swollen pink inner labia, "
        "legs spread wide, eyes half-closed in pleasure, "
        "soft warm bedroom lighting, photorealistic explicit detail"
    )

def cap_dildo_masturbation() -> str:
    return (
        f"{HOLLY_CORE}, fully nude, "
        "actively masturbating with a dildo between her legs, "
        "both hands holding the dildo, dildo inside her pussy, "
        "smooth bare pubic mound, swollen pink inner labia, flushed chest, "
        "translucent natural lubrication with slight creamy cloudiness, "
        "legs parted, mouth slightly open, auburn hair spread on pillow, "
        "soft warm lighting, photorealistic explicit self-pleasure scene"
    )

def cap_masturbation(pose_key: str) -> str:
    base = (
        f"{HOLLY_CORE}, fully nude, "
        "smooth bare pubic mound, swollen pink inner labia, flushed chest and cheeks, "
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

def cap_spread(pose_key: str) -> str:
    base = (
        f"{HOLLY_CORE}, fully nude, "
        "smooth bare pubic mound, small pink inner labia, single vaginal opening, "
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

def cap_squirting(pose_key: str) -> str:
    base = f"{HOLLY_CORE}, fully nude, "
    poses = {
        "3.1": (
            "smooth bare pubic mound, glistening arousal fluid, clearish slick wetness, "
            "arching her back on a bed with her right hand pressing on her lower stomach "
            "above her pubic mound, clear fluid squirting in an arc from her pussy, "
            "legs spread wide, mouth open in orgasm, "
            "auburn hair fanning on the sheet, "
            "soft warm lighting, photorealistic explicit squirting scene"
        ),
        "3.2": (
            "smooth bare pubic mound, swollen pink inner labia, glistening wetness, "
            "two fingers of her right hand inserted in her pussy, "
            "clear fluid squirting around her fingers in an explicit arc, "
            "lying back with legs spread wide, hips tilted up, "
            "mouth open in climax, flushed skin, "
            "soft warm lighting, photorealistic explicit squirting masturbation scene"
        ),
        "3.3": (
            "smooth bare pubic mound, translucent lubrication with slight creamy cloudiness, "
            "post-orgasm, lying on her back breathing heavily, "
            "translucent creamy fluid dripping from her pussy down across her perineum "
            "and inner thighs, hands resting at her sides relaxed, "
            "legs softly parted, dreamy afterglow expression, "
            "soft warm lighting, photorealistic explicit post-orgasm scene"
        ),
    }
    return base + poses.get(pose_key, poses["3.1"])

def cap_closeup_resting() -> str:
    return (
        f"{HOLLY_CORE}, fully nude, "
        "smooth bare pubic mound, small pink inner labia, "
        "intimate closeup between her legs from the front, "
        "pussy in resting state, inner labia softly closed, "
        "thighs parted softly, "
        "soft studio lighting, photorealistic high-detail intimate closeup"
    )

def cap_closeup_hands(pose_key: str) -> str:
    base = (
        f"{HOLLY_CORE}, fully nude, "
        "smooth bare pubic mound, small pink inner labia, "
    )
    poses = {
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
    return base + poses.get(pose_key, poses["4.2"])

def cap_from_behind(variant: str) -> str:
    """variant: 'bent_over' or 'doggystyle'"""
    if variant == "doggystyle":
        return (
            f"{HOLLY_CORE}, fully nude, "
            "on all fours in doggystyle position on a bed, "
            "back flat and level, hands pressing flat into the mattress, "
            "butt raised and pointed at the camera, "
            "viewed from directly behind at hip height, "
            "very large plump round butt filling the frame, "
            "her pussy and anus visible between her parted thighs in doggystyle orientation, "
            "anus uppermost near her lower back, vaginal opening directly below, "
            "1.5 inch perineum, pink-brown anus, swollen pink inner labia slick with wetness, "
            "face turned away, auburn hair hanging forward out of view, "
            "soft warm lighting, photorealistic explicit from-behind view"
        )
    # bent_over default
    return (
        f"{HOLLY_CORE}, fully nude, "
        "bent over forward at the waist, legs shoulder-width apart, "
        "viewed from directly behind, her back to the camera, "
        "very large plump round butt filling the frame, "
        "her pussy and anus visible between her thighs from behind, "
        "1.5 inch perineum, pink-brown anus with natural wrinkled texture, "
        "smooth bare pubic mound, "
        "auburn hair falling down her back, face not visible, "
        "soft warm lighting, photorealistic explicit rear view"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Category definitions: maps new folder → (prefix, captioner)
# ─────────────────────────────────────────────────────────────────────────────
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png"}

CATEGORIES = {
    "01_dildo": ("dildo", cap_dildo),
    "02_dildo_masturbation": ("dildo_mast", cap_dildo_masturbation),
    "03_masturbation": ("masturbation", None),        # pose-dependent (Civitai)
    "04_spread": ("spread", None),                    # pose-dependent (Civitai)
    "05_squirting": ("squirting", None),              # pose-dependent (Civitai)
    "06_closeup_resting": ("closeup_resting", cap_closeup_resting),
    "07_closeup_hands": ("closeup_hands", None),      # pose-dependent (Civitai)
    "08_from_behind": ("from_behind", None),          # variant-dependent (Klein)
}

# ─────────────────────────────────────────────────────────────────────────────
# Source → Destination map
# ─────────────────────────────────────────────────────────────────────────────
# Each entry: (source_path, dest_category, pose_or_variant_key, source_label)
# pose_or_variant_key is passed to the captioner for pose-dependent categories

def build_source_map() -> list:
    """Returns list of (src_image_path, dest_category, pose_key, source_label)."""
    sources = []

    # ── Klein sources ──
    klein_map = {
        "T2_dildo": ("01_dildo", None, "klein"),
        "T2alt_dildo_masturbation": ("02_dildo_masturbation", None, "klein"),
        "T4_bent_over": ("08_from_behind", "bent_over", "klein"),
        "T4_bent_over_v3_doggystyle": ("08_from_behind", "doggystyle", "klein"),
        "T5_closeup": ("06_closeup_resting", None, "klein"),
    }
    for kfolder, (dest_cat, variant, src_label) in klein_map.items():
        folder = KLEIN_SRC / kfolder
        if not folder.exists():
            print(f"  ⚠️ Klein source missing: {folder}")
            continue
        for img in sorted(folder.iterdir()):
            if img.suffix.lower() in IMAGE_EXTS:
                sources.append((img, dest_cat, variant, src_label))

    # ── Civitai sources ──
    civitai_category_map = {
        "1_masturbation": "03_masturbation",
        "2_spread": "04_spread",
        "3_squirting": "05_squirting",
        "4_closeup": None,  # special: split between 06_resting and 07_hands
    }
    pose_regex = re.compile(r"Prompt (\d+\.\d+)")

    for cfolder, dest_cat in civitai_category_map.items():
        folder = CIVITAI_SRC / cfolder
        if not folder.exists():
            print(f"  ⚠️ Civitai source missing: {folder}")
            continue

        for subfolder in sorted(folder.iterdir()):
            if not subfolder.is_dir():
                continue
            match = pose_regex.search(subfolder.name)
            if not match:
                continue
            pose_key = match.group(1)

            # Special routing for Civitai closeups
            if cfolder == "4_closeup":
                if pose_key == "4.1":
                    dest_cat = "06_closeup_resting"
                elif pose_key in ("4.2", "4.3"):
                    dest_cat = "07_closeup_hands"
                else:
                    continue

            for img in sorted(subfolder.iterdir()):
                if img.suffix.lower() in IMAGE_EXTS:
                    sources.append((img, dest_cat, pose_key, "civitai"))

    return sources


# ─────────────────────────────────────────────────────────────────────────────
# Caption resolver
# ─────────────────────────────────────────────────────────────────────────────
def get_caption(dest_cat: str, pose_or_variant: str) -> str:
    _, captioner = CATEGORIES[dest_cat]
    if captioner is None:
        # Pose-dependent categories — dispatch by category
        if dest_cat == "03_masturbation":
            return cap_masturbation(pose_or_variant)
        if dest_cat == "04_spread":
            return cap_spread(pose_or_variant)
        if dest_cat == "05_squirting":
            return cap_squirting(pose_or_variant)
        if dest_cat == "07_closeup_hands":
            return cap_closeup_hands(pose_or_variant)
        if dest_cat == "08_from_behind":
            return cap_from_behind(pose_or_variant)
        raise ValueError(f"No captioner for {dest_cat}")
    # Static captioner (no pose arg)
    return captioner()


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Holly v2.5 dataset reorganizer")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print plan without writing")
    parser.add_argument("--verbose", action="store_true",
                        help="Log every file")
    args = parser.parse_args()

    print("=" * 70)
    print("HOLLY v2.5 — DATASET REORGANIZER")
    print("=" * 70)
    print(f"Mode: {'DRY RUN (no files written)' if args.dry_run else 'EXECUTE'}")
    print()

    sources = build_source_map()
    print(f"Found {len(sources)} source images to organize")
    print()

    # Count by destination
    by_dest = {}
    for _, dest_cat, _, _ in sources:
        by_dest[dest_cat] = by_dest.get(dest_cat, 0) + 1
    print("Plan summary:")
    for dest_cat in sorted(CATEGORIES.keys()):
        count = by_dest.get(dest_cat, 0)
        prefix, _ = CATEGORIES[dest_cat]
        print(f"  training/{dest_cat}/  ({prefix}_NNN) → {count} images")
    print()

    if args.dry_run:
        print("DRY RUN — listing first 3 files per category:")
        seen = {k: 0 for k in CATEGORIES}
        for src_img, dest_cat, pose, src_label in sources:
            if seen[dest_cat] >= 3:
                continue
            seen[dest_cat] += 1
            prefix, _ = CATEGORIES[dest_cat]
            new_name = f"{prefix}_{seen[dest_cat]:03d}{src_img.suffix.lower()}"
            print(f"  {src_img.relative_to(DATASET_ROOT)}")
            print(f"    → training/{dest_cat}/{new_name}")
        print()
        print("✅ Dry run complete. Re-run without --dry-run to execute.")
        return

    # ── Execute ──
    # Create destination folders
    for dest_cat in CATEGORIES:
        (TRAINING_DST / dest_cat).mkdir(parents=True, exist_ok=True)
    PROVENANCE_DST.mkdir(parents=True, exist_ok=True)

    # Counters per destination (for sequential numbering)
    counters = {k: 0 for k in CATEGORIES}
    written = 0
    provenance_archived = 0

    for src_img, dest_cat, pose_or_variant, src_label in sources:
        counters[dest_cat] += 1
        idx = counters[dest_cat]
        prefix, _ = CATEGORIES[dest_cat]
        new_name = f"{prefix}_{idx:03d}{src_img.suffix.lower()}"
        dst_img = TRAINING_DST / dest_cat / new_name
        dst_txt = dst_img.with_suffix(".txt")

        # Copy image
        shutil.copy2(src_img, dst_img)

        # Write caption
        caption = get_caption(dest_cat, pose_or_variant)
        dst_txt.write_text(caption + "\n", encoding="utf-8")

        # Archive Klein provenance (.prompt.txt with original generation prompt + seed)
        if src_label == "klein":
            klein_txt = src_img.with_suffix(".txt")
            if klein_txt.exists():
                # Skip if it's already a caption we wrote (it isn't at this stage, but be safe)
                prov_name = f"{src_img.stem}__{src_img.parent.name}{src_img.suffix}.prompt.txt"
                # Simpler: just stem + parent folder
                prov_name = f"{src_img.parent.name}__{src_img.stem}.txt"
                prov_dst = PROVENANCE_DST / prov_name
                if not prov_dst.exists():
                    shutil.copy2(klein_txt, prov_dst)
                    provenance_archived += 1

        written += 1
        if args.verbose or written <= 5:
            print(f"  [{written}/{len(sources)}] {dst_img.relative_to(DATASET_ROOT)}")

    print()
    print("=" * 70)
    print("REORG COMPLETE")
    print("=" * 70)
    print(f"  Images copied:      {written}")
    print(f"  Captions written:   {written}")
    print(f"  Provenance files:   {provenance_archived}")
    print()
    print("Final structure:")
    for dest_cat in sorted(CATEGORIES.keys()):
        folder = TRAINING_DST / dest_cat
        imgs = len([p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS])
        txts = len([p for p in folder.iterdir() if p.suffix == ".txt"])
        status = "✅" if imgs == txts else "❌"
        print(f"  {status} training/{dest_cat}/ → {imgs} imgs + {txts} captions")
    print()
    print("Next steps:")
    print("  1. Verify counts above all show ✅")
    print("  2. Spot-check a few renamed images + their .txt captions")
    print("  3. Archive legacy folders (separate script)")


if __name__ == "__main__":
    main()
