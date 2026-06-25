#!/bin/bash
# Upload CyberRealistic FLUX v2.5 (FP8) to Modal volume
#
# BEFORE RUNNING:
#   1. Manually download from https://civitai.red/models/1799857
#      → Click "Download" on v2.5 → choose the "fp8" variant (~11 GB)
#      → Save as: ~/Downloads/cyberrealistic-flux-v25-fp8.safetensors
#      (or move/rename it to match LOCAL_PATH below)
#
#   2. Activate correct Modal profile:
#      modal profile activate iamdoregosteve
#
# Run this script ONCE to upload to the volume. After upload, the
# CyberRealistic endpoint will load it automatically on cold start.

set -e

LOCAL_PATH="${HOME}/Downloads/cyberrealistic-flux-v25-fp8.safetensors"
VOLUME_NAME="holly-cyberrealistic-weights"
DEST_NAME="cyberrealistic-flux-v25-fp8.safetensors"

# Verify profile
PROFILE=$(modal profile current 2>/dev/null || echo "unknown")
echo "Active Modal profile: $PROFILE"
if [ "$PROFILE" != "iamdoregosteve" ]; then
    echo "❌ Wrong profile. Run: modal profile activate iamdoregosteve"
    exit 1
fi

# Verify local file exists
if [ ! -f "$LOCAL_PATH" ]; then
    echo "❌ File not found: $LOCAL_PATH"
    echo ""
    echo "Download from: https://civitai.red/models/1799857"
    echo "Choose: v2.5 fp8 variant (~11 GB)"
    echo "Save as: $LOCAL_PATH"
    echo ""
    echo "Or edit this script to point to your download location."
    exit 1
fi

SIZE_GB=$(du -g "$LOCAL_PATH" | cut -f1)
echo ""
echo "=== Uploading CyberRealistic FP8 (${SIZE_GB} GB) to Modal volume '$VOLUME_NAME' ==="
echo "This will take 5-15 minutes depending on upload speed..."
echo ""

modal volume put "$VOLUME_NAME" "$LOCAL_PATH" "$DEST_NAME"

echo ""
echo "✅ Upload complete!"
echo ""
echo "Verify with:"
echo "  modal volume ls $VOLUME_NAME"
echo ""
echo "Then deploy endpoint:"
echo "  modal deploy services/modal-media/image_generate_cyberrealistic_a100.py"
