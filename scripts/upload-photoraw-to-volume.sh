#!/bin/bash
# Upload PHOTO RAW to Modal volume
#
# BEFORE RUNNING:
#   1. Download from https://civitai.red/models/2253017 (~16 GB)
#      Save as: ~/Downloads/photo-raw-flux-fp8.safetensors
#   2. modal profile activate iamdoregosteve

set -e

LOCAL_PATH="${HOME}/Downloads/photo-raw-flux-fp8.safetensors"
VOLUME_NAME="holly-photoraw-weights"
DEST_NAME="photo-raw-flux-fp8.safetensors"

PROFILE=$(modal profile current 2>/dev/null || echo "unknown")
echo "Active Modal profile: $PROFILE"
if [ "$PROFILE" != "iamdoregosteve" ]; then
    echo "❌ Wrong profile. Run: modal profile activate iamdoregosteve"
    exit 1
fi

if [ ! -f "$LOCAL_PATH" ]; then
    echo "❌ File not found: $LOCAL_PATH"
    echo "Download from: https://civitai.red/models/2253017"
    exit 1
fi

SIZE_GB=$(du -g "$LOCAL_PATH" | cut -f1)
echo ""
echo "=== Uploading PHOTO RAW (${SIZE_GB} GB) to Modal volume '$VOLUME_NAME' ==="
echo "This will take 10-30 minutes depending on upload speed..."
echo ""

modal volume put "$VOLUME_NAME" "$LOCAL_PATH" "$DEST_NAME"

echo ""
echo "✅ Upload complete!"
echo ""
echo "Verify with:"
echo "  modal volume ls $VOLUME_NAME"
echo ""
echo "Then deploy endpoint:"
echo "  modal deploy services/modal-media/image_generate_photoraw_a100.py"
