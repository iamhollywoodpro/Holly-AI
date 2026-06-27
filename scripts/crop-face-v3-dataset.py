#!/usr/bin/env python3
"""
Crop face regions from the 8 pose avatars (public/avatars/poses/*.jpg)
to add full-body-angle samples to the Holly Face v3 training dataset.

The 20 emotion avatars are already close-up headshots — perfect training
data as-is. The 8 pose avatars are full-body shots (face is ~10% of frame).
For face LoRA training, we want face-dominant crops, so we crop with
padding to ~768x768 square.

Uses OpenCV Haar cascade (frontal + profile) — same detection logic
as the A100 endpoint _enhance_face uses at runtime.

Output: holly-face-v3-dataset/images/pose_<name>.jpg
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image

POSES_DIR = "public/avatars/poses"
OUT_DIR = "holly-face-v3-dataset/images"
TARGET_SIZE = 768  # match avatar resolution


def detect_face(gray):
    """Return (x, y, w, h) of largest face, or None."""
    frontal = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    profile = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_profileface.xml"
    )

    faces = []
    for sf in (1.05, 1.1, 1.2):
        found = frontal.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=(80, 80))
        if len(found):
            faces.extend(found)

    if not faces:
        for sf in (1.05, 1.1):
            found = profile.detectMultiScale(gray, scaleFactor=sf, minNeighbors=5, minSize=(80, 80))
            if len(found):
                faces.extend(found)
            flipped = cv2.flip(gray, 1)
            found_r = profile.detectMultiScale(flipped, scaleFactor=sf, minNeighbors=5, minSize=(80, 80))
            if len(found_r):
                h_img = gray.shape[1]
                for (x, y, w, h) in found_r:
                    faces.append((h_img - x - w, y, w, h))

    if not faces:
        return None
    return tuple(int(v) for v in max(faces, key=lambda f: f[2] * f[3]))


def crop_face_square(img_pil, bbox, crop_factor=3.0):
    """Crop a square region centered on the face, crop_factor x face width."""
    w_img, h_img = img_pil.size
    x, y, fw, fh = bbox
    cx = x + fw // 2
    cy = y + fh // 2
    side = int(fw * crop_factor)
    half = side // 2

    x0 = max(0, cx - half)
    y0 = max(0, cy - half)
    x1 = min(w_img, cx + half)
    y1 = min(h_img, cy + half)

    actual_side = min(x1 - x0, y1 - y0)
    x1 = x0 + actual_side
    y1 = y0 + actual_side

    return img_pil.crop((x0, y0, x1, y1)), actual_side


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    poses = sorted(f for f in os.listdir(POSES_DIR) if f.endswith('.jpg'))
    print(f"Found {len(poses)} pose avatars")

    success = 0
    failed = 0
    for fname in poses:
        path = os.path.join(POSES_DIR, fname)
        img = Image.open(path).convert("RGB")
        arr = np.array(img)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)

        bbox = detect_face(gray)
        if bbox is None:
            print(f"  ❌ {fname}: no face detected")
            failed += 1
            continue

        crop, side = crop_face_square(img, bbox, crop_factor=3.0)
        crop_resized = crop.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)

        name = fname.replace('.jpg', '')
        out_path = os.path.join(OUT_DIR, f"pose_{name}.jpg")
        crop_resized.save(out_path, quality=95)
        print(f"  ✅ {fname}: face {bbox[2]}x{bbox[3]} → crop {side} → {out_path}")
        success += 1

    print(f"\n{success}/{len(poses)} pose avatars cropped successfully")
    print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
