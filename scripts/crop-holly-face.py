#!/usr/bin/env python3
"""
Crop Holly's face from TEST-01 standing nude for use as PuLID reference.

Output: holly-body-lora-dataset-v25/test-batch-v4/holly-ref-face.png

This face crop will be passed as the `reference_face` parameter to the
CyberRealistic + PuLID endpoint. PuLID encodes the facial features and
locks them during generation — so every image looks like Holly.

Why TEST-01 standing nude:
  - It's our best Klein output (Steve's evaluation)
  - Clear frontal face, eyes open, soft natural lighting
  - High enough resolution for clean 512x512 crop
"""

from pathlib import Path
from PIL import Image

SOURCE = Path("/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25/test-batch-v2/TEST-01-standing-nude.webp")
OUT_DIR = Path("/Users/stevefreshblendz/Desktop/Holly-AI-main/holly-body-lora-dataset-v25/test-batch-v4")
OUT_FILE = OUT_DIR / "holly-ref-face.png"

# Face region in TEST-01 (1024x1024 image)
# Holly is standing, face in upper-center of frame
# Crop: x=320, y=40, w=400, h=400 → roughly face + hair
FACE_RECT = (320, 40, 720, 440)

# Final output size (PuLID expects ~512x512)
OUT_SIZE = (512, 512)


def main():
    if not SOURCE.exists():
        raise SystemExit(f"❌ Source not found: {SOURCE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img = Image.open(SOURCE).convert("RGB")
    print(f"Loaded source: {SOURCE.name} ({img.size[0]}x{img.size[1]})")

    # Crop face region
    face = img.crop(FACE_RECT)
    print(f"Cropped face region: {face.size[0]}x{face.size[1]} from rect {FACE_RECT}")

    # Resize to 512x512 (PuLID standard)
    face = face.resize(OUT_SIZE, Image.LANCZOS)
    print(f"Resized to {OUT_SIZE[0]}x{OUT_SIZE[1]}")

    # Save as PNG (lossless — PuLID needs clean face features)
    face.save(OUT_FILE, format="PNG")
    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"✅ Saved: {OUT_FILE} ({size_kb:.0f} KB)")

    print(f"\nNext: Pass this file as reference_face in test-cyberrealistic-v16.py")


if __name__ == "__main__":
    main()
