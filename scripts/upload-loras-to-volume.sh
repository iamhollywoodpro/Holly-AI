#!/bin/bash
# Upload Holly LoRAs to Modal volume (iamdoregosteve workspace)
# Run AFTER: modal profile activate iamdoregosteve
# Run BEFORE: modal deploy services/modal-media/image_generate_flux2klein_a100.py

set -e

VOLUME_NAME="holly-lora-weights"
LORA_DIR="/Users/stevefreshblendz/Desktop/Holly-AI-main/services/modal-media/loras"

# List of LoRAs we need on the volume
LORAS=(
    # Baked-in Holly identity LoRAs
    "holly-face-v2.safetensors"
    "holly-body-v1.safetensors"
    # Original v2.5 batch LoRAs (proven working)
    "FK_dildoinsertion.safetensors"
    "pussydiffusion-f2-klein-9b_v2.safetensors"
    "flux2klein_vulva_and_anus_from_behind_v1.safetensors"
    # Smoke7 new additions (June 19 2026)
    "Cum_on_Face.safetensors"                                  # #16 Cum Anywhere — squirting test
    "femaleasshole-f2-klein-9b-musubituner.safetensors"        # #2 Female Asshole Musubi — bent_over upgrade
    "klein-dildo-7epoc-k3nk.safetensors"                       # #3 K3nk Dildo Riding — dildo category upgrade
    "ExcellentFullNude_F2K9B_1.safetensors"                    # #5 Excellent Full Nude TOFU — nude enhancer
    "Realism_Engine_Klein_V2.safetensors"                      # #10 Realism Engine v2 — photorealism enhancer
)

echo "=== Uploading ${#LORAS[@]} LoRAs to Modal volume '$VOLUME_NAME' ==="
echo ""

# Verify profile
PROFILE=$(modal profile current 2>/dev/null || echo "unknown")
echo "Active Modal profile: $PROFILE"
if [ "$PROFILE" != "iamdoregosteve" ]; then
    echo "❌ Wrong profile. Run: modal profile activate iamdoregosteve"
    exit 1
fi
echo ""

# Upload each LoRA
for fname in "${LORAS[@]}"; do
    local_path="$LORA_DIR/$fname"
    if [ ! -f "$local_path" ]; then
        echo "❌ Missing local file: $fname"
        exit 1
    fi
    size_mb=$(du -m "$local_path" | cut -f1)
    echo "📤 Uploading $fname (${size_mb} MB)..."
    modal volume put "$VOLUME_NAME" "$local_path" "$fname"
    echo "  ✅ Done"
done

echo ""
echo "=== All LoRAs uploaded ==="
echo ""
echo "Verify with:"
echo "  modal volume ls $VOLUME_NAME"
