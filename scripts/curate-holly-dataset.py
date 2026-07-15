#!/usr/bin/env python3
"""
Holly Dataset Curation Helper
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Helps Steve pick the best 25 images from the 175-image dataset for Z-Image LoRA training.

Per FACT.md lessons:
  - 20-30 image sweet spot (NOT 200+ — causes identity drift)
  - Target: 30% face closeups, 30% medium, 25% full-body standing, 15% varied
  - MUST include standing full-body (root cause of v3.0 failure)
  - Mix: SFW (clothed) + nude + explicit
  - Best quality only

Usage:
  python3 scripts/curate-holly-dataset.py

Output:
  - Prints a table of all images with dimensions + category + caption summary
  - Generates an HTML gallery so Steve can visually browse and pick
  - Writes a checklist file for Steve to fill in
"""

import os
import sys
import json
import struct
from pathlib import Path

DATASET_DIR = Path("holly-body-lora-dataset-v25/training")
OUTPUT_HTML = Path("holly-body-lora-dataset-v25/curation_gallery.html")
CHECKLIST = Path("holly-body-lora-dataset-v25/CURATION_CHECKLIST.md")

# Target distribution per FACT.md
TARGET_DIST = {
    "face_closeup": {"count": 8, "pct": "30%", "desc": "Face filling most of frame"},
    "medium_shot": {"count": 7, "pct": "30%", "desc": "Waist up or torso visible"},
    "full_body_standing": {"count": 5, "pct": "25%", "desc": "CRITICAL: head-to-toe standing (was missing in v3.0!)"},
    "varied_poses": {"count": 5, "pct": "15%", "desc": "Expressions, angles, explicit modes"},
}


def get_image_size(filepath):
    """Get image dimensions without PIL (reads header bytes)."""
    try:
        with open(filepath, "rb") as f:
            head = f.read(32)
            ext = filepath.suffix.lower()

            if ext in (".jpg", ".jpeg"):
                # JPEG — scan for SOF marker
                f.seek(0)
                data = f.read()
                i = 2
                while i < len(data):
                    if data[i] != 0xFF:
                        i += 1
                        continue
                    marker = data[i+1]
                    if marker in (0xC0, 0xC1, 0xC2):
                        h = struct.unpack(">H", data[i+5:i+7])[0]
                        w = struct.unpack(">H", data[i+7:i+9])[0]
                        return w, h
                    seg_len = struct.unpack(">H", data[i+2:i+4])[0]
                    i += 2 + seg_len
            elif ext == ".png":
                w = struct.unpack(">I", head[16:20])[0]
                h = struct.unpack(">I", head[20:24])[0]
                return w, h
            elif ext == ".webp":
                # WebP VP8X
                if head[12:16] == b"VP8X":
                    w = struct.unpack("<I", head[24:27] + b"\x00")[0] + 1
                    h = struct.unpack("<I", head[27:30] + b"\x00")[0] + 1
                    return w, h
                elif head[12:16] == b"VP8 ":
                    w = struct.unpack("<H", head[26:28])[0] & 0x3FFF
                    h = struct.unpack("<H", head[28:30])[0] & 0x3FFF
                    return w, h
    except Exception:
        pass
    return 0, 0


def get_caption_summary(filepath):
    """Get first 60 chars of caption."""
    txt = filepath.with_suffix(".txt")
    if txt.exists():
        text = txt.read_text().strip()
        return text[:60] + "..." if len(text) > 60 else text
    return "(no caption)"


def main():
    if not DATASET_DIR.exists():
        print(f"❌ Dataset not found: {DATASET_DIR}")
        sys.exit(1)

    images = sorted(DATASET_DIR.rglob("*.*"))
    images = [f for f in images if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]

    print(f"═══ Holly Dataset Curation ═══")
    print(f"Total images: {len(images)}")
    print(f"Target: 25 (per FACT.md sweet spot)")
    print()

    # ── Print target distribution ──
    print("TARGET DISTRIBUTION (per FACT.md):")
    for cat, info in TARGET_DIST.items():
        print(f"  {cat}: {info['count']} images ({info['pct']}) — {info['desc']}")
    print()

    # ── Collect image info ──
    image_data = []
    for img in images:
        w, h = get_image_size(img)
        caption = get_caption_summary(img)
        # Category = parent dir name (e.g. "01_dildo") or filename prefix
        parent = img.parent.name
        category = parent if parent != "training" else (img.stem.rsplit("_", 1)[0] if "_" in img.stem else "other")
        size_kb = img.stat().st_size // 1024
        # Relative path for HTML (from dataset root)
        rel_path = img.relative_to(DATASET_DIR.parent)
        image_data.append({
            "file": img.name,
            "category": category,
            "dims": f"{w}x{h}" if w else "?",
            "size_kb": size_kb,
            "caption": caption,
            "path": str(img),
            "rel_path": str(rel_path),
        })

    # ── Print category breakdown ──
    print("CURRENT CATEGORIES:")
    cats = {}
    for d in image_data:
        cats.setdefault(d["category"], []).append(d)
    for cat in sorted(cats, key=lambda c: -len(cats[c])):
        print(f"  {cat}: {len(cats[cat])} images")
    print()

    # ── WARNING: check for standing full-body ──
    has_standing = any("standing" in d["file"].lower() or "standing" in d["category"].lower() for d in image_data)
    if not has_standing:
        print("⚠️  WARNING: NO 'standing' images found in dataset!")
        print("   This was the ROOT CAUSE of the v3.0 failure (FACT.md).")
        print("   You MUST add standing full-body shots before training.")
        print()

    # ── Generate HTML gallery ──
    html = ['<!DOCTYPE html><html><head><title>Holly Dataset Curation</title>']
    html.append('<style>')
    html.append('body { font-family: Arial, sans-serif; background: #1a1a1a; color: #eee; }')
    html.append('.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px; }')
    html.append('.card { background: #2a2a2a; border-radius: 8px; padding: 8px; }')
    html.append('.card img { width: 100%; border-radius: 4px; }')
    html.append('.card .info { font-size: 12px; margin-top: 4px; color: #aaa; }')
    html.append('.card .file { font-weight: bold; color: #6bf; }')
    html.append('.card .caption { font-size: 11px; color: #999; margin-top: 2px; }')
    html.append('h1 { padding: 20px; } .target { background: #1e3a1e; padding: 12px 20px; border-radius: 8px; margin: 0 20px; }')
    html.append('</style></head><body>')
    html.append('<h1>Holly Dataset — Pick Best 25 for Z-Image Training</h1>')
    html.append('<div class="target"><b>Target:</b> 8 face closeups, 7 medium, 5 standing full-body (CRITICAL), 5 varied. ')
    html.append('Current captions are too verbose (~614 chars avg) — will be rewritten to ~40 chars.</div>')
    html.append('<div class="grid">')

    for d in image_data:
        html.append(f'<div class="card">')
        html.append(f'<img src="{d["rel_path"]}" loading="lazy">')
        html.append(f'<div class="info"><span class="file">{d["file"]}</span> [{d["category"]}] {d["dims"]} {d["size_kb"]}KB</div>')
        html.append(f'<div class="caption">{d["caption"]}</div>')
        html.append(f'</div>')

    html.append('</div></body></html>')

    OUTPUT_HTML.write_text("\n".join(html))
    print(f"✅ HTML gallery: {OUTPUT_HTML}")
    print(f"   Open in browser: file://{OUTPUT_HTML.resolve()}")

    # ── Generate checklist ──
    checklist = []
    checklist.append("# Holly Dataset Curation Checklist")
    checklist.append("")
    checklist.append("Pick the BEST images from each category. Target: 25 total.")
    checklist.append("Mark chosen images with [x]. Standing full-body is CRITICAL.")
    checklist.append("")
    for cat in sorted(cats, key=lambda c: -len(cats[c])):
        checklist.append(f"## {cat} ({len(cats[cat])} available)")
        checklist.append("")
        for d in cats[cat]:
            checklist.append(f"- [ ] {d['file']} ({d['dims']})")
        checklist.append("")

    checklist.append("## STANDING FULL-BODY (generate if missing!)")
    checklist.append("- [ ] standing_001 (need to generate)")
    checklist.append("- [ ] standing_002 (need to generate)")
    checklist.append("- [ ] standing_003 (need to generate)")
    checklist.append("- [ ] standing_004 (need to generate)")
    checklist.append("- [ ] standing_005 (need to generate)")

    CHECKLIST.write_text("\n".join(checklist))
    print(f"✅ Checklist: {CHECKLIST}")
    print()
    print("NEXT STEPS:")
    print("1. Open the HTML gallery in your browser")
    print("2. Pick the best 25 images (fill the checklist)")
    print("3. Tell me which files you chose — I'll rewrite captions + upload")


if __name__ == "__main__":
    main()
