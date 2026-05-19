#!/bin/bash
# Deploy all Modal services for Holly AI
# Run from the Holly-AI repo root: ./services/modal-media/deploy-all.sh

set -e

echo "Holly Modal Services Deployer"
echo "=============================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "1/2 Deploying Image Generation (FLUX.1-schnell on T4)..."
modal deploy "$SCRIPT_DIR/image_generate.py"
echo ""

echo "2/2 Deploying Video Generation (CogVideoX-5B on A10G)..."
echo "Note: First deploy will download ~35GB model weights (20 min build)"
modal deploy "$SCRIPT_DIR/video_generate.py"
echo ""

echo "All Modal services deployed!"
echo ""
echo "Set these env vars in Coolify:"
echo "  MODAL_IMAGE_URL=https://iamhollywoodpro--generate.modal.run"
echo "  MODAL_VIDEO_URL=https://iamhollywoodpro--video-generate.modal.run"
