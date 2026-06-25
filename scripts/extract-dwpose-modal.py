#!/usr/bin/env python3
"""
Extract DWPose wireframes from images using Modal (no local torch needed).

Why Modal:
  Local Python 3.14 has no torch wheels. Modal has Python 3.11 + GPU/CPU
  ready to go. Plus, this same script can batch-extract 300 wireframes for
  the v2.5 dataset later.

Usage:
    # Extract single image
    modal run scripts/extract-dwpose-modal.py --image path/to/image.webp

    # Extract all images in a folder
    modal run scripts/extract-dwpose-modal.py --folder holly-body-lora-dataset-v25/_v1_failed_batch/

Output:
    Wireframe PNGs saved alongside source with `.pose.png` suffix.
    E.g., T09.webp → T09.pose.png
"""

import modal
import pathlib
import sys

app = modal.App("holly-dwpose-extractor")

VOLUME_MOUNT = "/data"
volume = modal.Volume.from_name("holly-dwpose-temp", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "torch>=2.6.0",
        "torchvision",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        "controlnet_aux",
        "pillow",
        "numpy",
        "matplotlib",  # required by controlnet_aux for hand drawing
        # Pin mediapipe — newer 0.10.35 dropped `solutions` API which
        # controlnet_aux 0.0.10 still imports. 0.10.14 is the last known-good.
        "mediapipe==0.10.14",
    )
)


@app.function(image=image, cpu=2, memory=4096, timeout=600)
def extract_pose_from_bytes(image_bytes: bytes, hand_and_face: bool = True) -> bytes:
    """Extract DWPose wireframe from raw image bytes. Returns PNG bytes."""
    import io
    from PIL import Image
    from controlnet_aux import OpenposeDetector

    print(f"📥 Loading OpenposeDetector model...")
    model = OpenposeDetector.from_pretrained("lllyasviel/Annotators")
    print(f"   ✓ Model loaded")

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    print(f"   Input: {img.size[0]}x{img.size[1]}")

    print(f"🎯 Extracting pose (hand_and_face={hand_and_face})...")
    pose = model(img, hand_and_face=hand_and_face)

    buf = io.BytesIO()
    pose.save(buf, format="PNG")
    out = buf.getvalue()
    print(f"   ✓ Wireframe: {len(out):,} bytes")
    return out


@app.local_entrypoint()
def main(image: str = None, folder: str = None, output_dir: str = None):
    """CLI entrypoint — process single image or folder of images."""
    import pathlib

    if not image and not folder:
        print("ERROR: must pass --image PATH or --folder PATH")
        sys.exit(1)

    targets = []
    if image:
        targets.append(pathlib.Path(image))
    if folder:
        folder_path = pathlib.Path(folder)
        if not folder_path.exists():
            print(f"ERROR: folder {folder} does not exist")
            sys.exit(1)
        # Find all .webp, .jpg, .jpeg, .png in folder (skip .pose.png outputs)
        for ext in ("*.webp", "*.jpg", "*.jpeg", "*.png"):
            for p in folder_path.glob(ext):
                if ".pose." in p.name:
                    continue
                targets.append(p)

    if not targets:
        print("ERROR: no images found to process")
        sys.exit(1)

    print(f"🎯 Processing {len(targets)} image(s)...")

    out_dir = pathlib.Path(output_dir) if output_dir else None

    for target in targets:
        print(f"\n📸 {target.name}")
        if not target.exists():
            print(f"   ❌ not found, skipping")
            continue

        in_bytes = target.read_bytes()
        try:
            pose_bytes = extract_pose_from_bytes.remote(in_bytes)
        except Exception as e:
            print(f"   ❌ extraction failed: {e}")
            continue

        # Output location: alongside source, or in out_dir
        if out_dir:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{target.stem}.pose.png"
        else:
            out_path = target.with_suffix(".pose.png").parent / f"{target.stem}.pose.png"

        out_path.write_bytes(pose_bytes)
        print(f"   ✅ {out_path} ({len(pose_bytes):,} bytes)")

    print(f"\n✅ Done — {len(targets)} processed")


if __name__ == "__main__":
    print("Run with: modal run scripts/extract-dwpose-modal.py --image PATH.webp")
    print("Or:       modal run scripts/extract-dwpose-modal.py --folder path/to/folder/")
