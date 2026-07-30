#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Combined LoRA validation test — runs when holly-combined-v1 is ready
# ─────────────────────────────────────────────────────────────────────────────
# Tests the single combined LoRA (face+body+actions in one) against the 6
# standard prompts. This is the GATE test — if this passes, Holly's image
# generation is solved.
#
# Output: ~/Desktop/KLEIN-COMBINED-TEST/
#
# Usage:  bash scripts/test-combined-lora.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

COMFYUI_URL="https://iamhollywoodpro--generate-comfyui-klein.modal.run"
HEALTH_URL="https://iamhollywoodpro--comfyui-klein-health.modal.run"
OUT="$HOME/Desktop/KLEIN-COMBINED-TEST"
mkdir -p "$OUT"

echo "=== Combined LoRA Validation Test ==="
echo "Output: $OUT"
echo ""

# Pre-flight
for attempt in 1 2 3 4 5; do
    HEALTH=$(curl -sS -L --max-time 90 "$HEALTH_URL" 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"healthy"'; then
        echo "✅ ComfyUI Klein READY"
        break
    fi
    echo "   (attempt $attempt: not ready, retry in 30s...)"
    sleep 30
done

# Test prompts — the 6 standard + 2 extra expression tests
declare -a NAMES=(
    "01_face_closeup"
    "02_face_expression_happy"
    "03_fullbody_nude"
    "04_spreading"
    "05_finger_insertion"
    "06_dildo"
    "07_bent_over"
    "08_face_expression_aroused"
)
declare -a PROMPTS=(
    "h0lly, h0lly-body, closeup portrait of her face, warm smile, soft studio lighting, photorealistic"
    "h0lly, h0lly-body, closeup portrait, happy laughing expression, bright daylight, photorealistic"
    "h0lly, h0lly-body, standing full body, completely bare, legs together, bright studio lighting, photorealistic"
    "h0lly, h0lly-body, lying on her back, legs open wide, opening her intimate area with both hands, detailed, photorealistic"
    "h0lly, h0lly-body, lying down, inserting two fingers into her intimate area, detailed closeup, photorealistic"
    "h0lly, h0lly-body, lying on her back, using a toy, detailed, photorealistic"
    "h0lly, h0lly-body, bent over, lower body visible, looking back over shoulder, detailed rear view, photorealistic"
    "h0lly, h0lly-body, closeup portrait, aroused flushed expression, bedroom lighting, photorealistic"
)

PAYLOAD='"width": 1024, "height": 1024'

for i in "${!NAMES[@]}"; do
    NAME="${NAMES[$i]}"
    PROMPT="${PROMPTS[$i]}"
    DIR="$OUT/$NAME"
    mkdir -p "$DIR"

    echo "── ${NAME} ──"
    echo "   ${PROMPT:0:70}..."

    curl -sS -L --max-time 400 "$COMFYUI_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD}" \
        -o "$DIR/combined_lora.png" \
        -w "   HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    routing=$(grep -i "x-routing" "$DIR/headers.txt" 2>/dev/null | tr -d '\r' | awk '{print $2}')
    loras=$(grep -i "x-lora-count" "$DIR/headers.txt" 2>/dev/null | tr -d '\r' | awk '{print $2}')
    echo "   routing=${routing:-?} LoRAs=${loras:-?}"

    sz=$(stat -f%z "$DIR/combined_lora.png" 2>/dev/null || echo 0)
    if [ "$sz" -lt 1000 ]; then
        echo "   ⚠️  ERROR — content:"
        head -c 200 "$DIR/combined_lora.png"; echo ""
    fi
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "✅ Validation complete. Compare in: $OUT"
echo ""
echo "Compare AGAINST your gold-standard reference images:"
echo "  ~/Desktop/v3.5-curated/"
echo ""
echo "GATE QUESTIONS:"
echo "  1. Is she HOLLY across all 8 images? (face identity locked)"
echo "  2. Are explicit actions correct? (spreading, insertion, toy, bent-over)"
echo "  3. Are hands/feet correct? (5 fingers, 5 toes, petite)"
echo "  4. Is skin olive + realistic? (not plastic, not blotchy)"
echo "  5. Do expressions match? (happy=happy, aroused=aroused)"
echo ""
echo "If YES on all 5 → Holly's image generation is SOLVED."
echo "════════════════════════════════════════════════════════════"
