#!/usr/bin/env python3
"""
Batch extract DWPose skeletons from action-refs on the Modal volume.

Reads all images from holly-lora-weights/action-refs/<category>/*.png
Extracts DWPose body+hand+face wireframes using controlnet_aux OpenposeDetector
Writes skeletons to holly-lora-weights/action-poses/<category>/*.pose.png

The skeletons are what ControlNet uses as pose guides — NOT the raw images.
This is the difference between tracing (img2img) and generating freely
around a skeleton (ControlNet).

Usage:
    modal run scripts/extract-dwpose-batch.py
"""

import modal

app = modal.App("holly-dwpose-batch")

VOLUME_MOUNT = "/lora"
volume = modal.Volume.from_name("holly-lora-weights", create_if_missing=True)

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
        "matplotlib",
        "mediapipe==0.10.14",  # pinned — newer versions dropped solutions API
    )
)


@app.function(image=image, volumes={VOLUME_MOUNT: volume}, timeout=1200, cpu=2, memory=8192)
def batch_extract():
    """Extract DWPose skeletons from all action-refs images on the volume."""
    import io
    import os
    from pathlib import Path
    from PIL import Image
    from controlnet_aux import OpenposeDetector

    refs_dir = Path(f"{VOLUME_MOUNT}/action-refs")
    poses_dir = Path(f"{VOLUME_MOUNT}/action-poses")

    if not refs_dir.exists():
        return {"error": f"{refs_dir} does not exist on volume"}

    # Load the OpenposeDetector model once
    print("📥 Loading OpenposeDetector model...")
    model = OpenposeDetector.from_pretrained("lllyasviel/Annotators")
    print("   ✓ Model loaded")

    # Find all image files across all category subdirectories
    image_extensions = {".png", ".jpg", ".jpeg", ".webp"}
    all_images = []
    for root, dirs, files in os.walk(refs_dir):
        for f in files:
            if Path(f).suffix.lower() in image_extensions:
                all_images.append(Path(root) / f)

    print(f"🎯 Found {len(all_images)} images to process")

    success = 0
    failed = 0
    categories_done = set()

    for img_path in sorted(all_images):
        # Relative path: action-refs/01_dildo_pussy/dildo_pussy_01.png
        rel = img_path.relative_to(refs_dir)
        category = rel.parts[0] if len(rel.parts) > 1 else "root"
        stem = img_path.stem

        # Output: action-poses/01_dildo_pussy/dildo_pussy_01.pose.png
        out_dir = poses_dir / category
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{stem}.pose.png"

        if out_path.exists():
            print(f"   ⏭️  {category}/{stem}.pose.png already exists, skipping")
            success += 1
            continue

        try:
            img = Image.open(img_path).convert("RGB")
            print(f"   🎯 {category}/{stem} ({img.size[0]}x{img.size[1]})...")

            # Extract pose with hands and face keypoints
            pose_img = model(img, hand_and_face=True)

            buf = io.BytesIO()
            pose_img.save(buf, format="PNG")
            out_path.write_bytes(buf.getvalue())

            success += 1
            categories_done.add(category)
            print(f"      ✅ {len(buf.getvalue()):,} bytes → {out_path}")

        except Exception as e:
            print(f"      ❌ FAILED: {e}")
            failed += 1

    # Commit the volume to persist the new pose files
    volume.commit()

    return {
        "total": len(all_images),
        "success": success,
        "failed": failed,
        "categories": sorted(categories_done),
        "output_dir": str(poses_dir),
    }


@app.local_entrypoint()
def main():
    print("═══ DWPose Batch Skeleton Extraction ═══")
    print("Reading:   holly-lora-weights/action-refs/")
    print("Writing:   holly-lora-weights/action-poses/")
    print("")

    result = batch_extract.remote()

    print("")
    print("═══ Results ═══")
    for k, v in result.items():
        if k == "categories":
            print(f"  categories processed ({len(v)}):")
            for c in v:
                print(f"    ✓ {c}")
        else:
            print(f"  {k}: {v}")

    if result.get("failed", 0) > 0:
        print(f"\n⚠️  {result['failed']} images failed. Check output above.")
    else:
        print(f"\n✅ All {result['success']} skeletons extracted successfully.")
