#!/usr/bin/env python3
"""
Curate V3.1 dataset gaps — presents candidate images from v3.5-curated
for Steve to fill 06_intimate_anatomy and 07_action_poses.

Outputs a visual report of all candidates with their paths so Steve can
copy the best ones into the V3.1 folders.
"""
import os
import shutil
from PIL import Image

V31 = os.path.expanduser("~/Desktop/Holly Training V.3.1")
V35 = os.path.expanduser("~/Desktop/v3.5-curated")

# What V3.1 needs (per the README targets)
GAPS = {
    "06_intimate_anatomy": {"current": 3, "target": 7, "need": 4,
                            "sources": ["pussy resting closeup", "hands and pussy closeup",
                                        "MAIN 27/06_closeup_resting", "MAIN 27/07_closeup_hands"]},
    "07_action_poses": {"current": 2, "target": 7, "need": 5,
                        "sources": ["masturbation", "from behind", "bentover",
                                    "laying on back", "dildo", "dildo masturbation",
                                    "MAIN 27/01_dildo", "MAIN 27/02_dildo_masturbation",
                                    "MAIN 27/03_masturbation", "MAIN 27/04_spread",
                                    "MAIN 27/05_squirting", "MAIN 27/08_from_behind"]},
}

def get_image_info(path):
    """Get dimensions and size."""
    try:
        with Image.open(path) as img:
            w, h = img.size
        sz = os.path.getsize(path)
        return f"{w}x{h}", f"{sz//1024}KB"
    except:
        return "?", "?"

print("=" * 70)
print("V3.1 DATASET GAP REPORT")
print("=" * 70)
print()
print("The V3.1 dataset needs more images in 2 categories to cover")
print("explicit actions. Pick the BEST images of Holly from the")
print("candidates below and copy them into the V3.1 folders.")
print()

for category, info in GAPS.items():
    print(f"\n{'─' * 70}")
    print(f"CATEGORY: {category}")
    print(f"  Current: {info['current']} images | Target: {info['target']} | NEED: +{info['need']}")
    print(f"  Destination: ~/Desktop/Holly Training V.3.1/{category}/")
    print(f"{'─' * 70}")

    candidates = []
    for src in info["sources"]:
        src_path = os.path.join(V35, src)
        if not os.path.isdir(src_path):
            continue
        for f in sorted(os.listdir(src_path)):
            ext = f.lower().rsplit('.', 1)[-1] if '.' in f else ''
            if ext not in ('png', 'jpg', 'jpeg', 'webp'):
                continue
            fp = os.path.join(src_path, f)
            dims, size = get_image_info(fp)
            candidates.append((fp, f"{src}/{f}", dims, size))

    print(f"\n  Candidates ({len(candidates)} available):")
    for i, (fp, rel, dims, size) in enumerate(candidates, 1):
        print(f"    {i:2d}. [{dims:>11} {size:>6}] {rel}")

    print(f"\n  >>> Pick {info['need']} best images and copy to:")
    print(f"      ~/Desktop/Holly Training V.3.1/{category}/")
    print(f"  >>> Then create .txt caption files (same name, .txt extension)")
    print(f"      with short captions like:")
    if "anatomy" in category:
        print(f"      'h0lly woman, pussy closeup, soft lighting, photorealistic'")
    else:
        print(f"      'h0lly woman, masturbating on bed, explicit, photorealistic'")

print(f"\n\n{'=' * 70}")
print("SUMMARY")
print("=" * 70)
print()
print("After filling the gaps, the V3.1 dataset will have:")
print("  01_face_closeups:      9 images ✅")
print("  02_medium_shots:       6 images ✅")
print("  03_full_body_standing: 12 images ✅")
print("  04_face_anchors:       6 images ✅ (COPIES from 01)")
print("  05_body_anchors:       8 images ✅ (COPIES from 02-03)")
print("  06_intimate_anatomy:   7 images (3 + 4 NEW)")
print("  07_action_poses:       7 images (2 + 5 NEW)")
print("  08_hands_feet_detail:  8 images ✅")
print("  TOTAL: ~63 images (within the 50-65 sweet spot)")
print()
print("Once filled, this dataset gets uploaded to Civitai for training")
print("as a SINGLE combined LoRA on FLUX.2 Klein 9B Base.")
print("Settings: rank 32, lr 1e-4, 10 epochs, 3x repeat (matching body v1).")
