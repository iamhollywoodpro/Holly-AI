#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ComfyUI Klein v2-recipe test — 6-prompt test with category routing
# ─────────────────────────────────────────────────────────────────────────────
# Runs the 6 prompts through the ComfyUI Klein endpoint. Category routing
# automatically selects the LoRA stack per prompt:
#   - face/fullbody: baked face+body only (proven v2-recipe)
#   - spreading: + SNOFS + pussydiffusion
#   - finger insertion: + SNOFS + Masturbation LoRA
#   - dildo: + Unchained + dildoinsertion
#   - bent over: + Unchained + femaleasshole
#
# Output: ~/Desktop/KLEIN-COMFYUI-TEST/
#
# Usage:  bash scripts/test-comfyui-klein.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

COMFYUI_URL="https://iamhollywoodpro--generate-comfyui-klein.modal.run"
HEALTH_URL="https://iamhollywoodpro--comfyui-klein-health.modal.run"
OUT="$HOME/Desktop/KLEIN-COMFYUI-TEST"
mkdir -p "$OUT"

echo "=== ComfyUI Klein v2-recipe + category routing — 6-test ==="
echo "Output: $OUT"
echo ""

# ── Pre-flight: confirm endpoint healthy ──
echo "=== Pre-flight: ComfyUI Klein health ==="
for attempt in 1 2 3 4 5; do
    HEALTH=$(curl -sS -L --max-time 60 "$HEALTH_URL" 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"healthy"'; then
        echo "✅ ComfyUI Klein READY"
        echo "$HEALTH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"   model: {d['model']}\")
print(f\"   recipe: {d['recipe']}\")
kl = d.get('key_loras',{})
present = sum(1 for v in kl.values() if v)
print(f\"   key LoRAs: {present}/{len(kl)} present\")
" 2>/dev/null
        break
    fi
    echo "   (attempt $attempt: not ready, retry in 30s...)"
    sleep 30
done
if ! echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "❌ ComfyUI Klein not healthy. Response:"
    echo "$HEALTH"
    exit 1
fi
echo ""

# ── Test prompts ──
declare -a NAMES=(
    "01_face_closeup"
    "02_fullbody_nude"
    "03_spreading"
    "04_finger_insertion"
    "05_dildo"
    "06_bent_over"
)
declare -a PROMPTS=(
    "h0lly, closeup portrait of her face, warm smile, soft studio lighting, photorealistic"
    "h0lly standing full body, completely nude, legs together, bright studio lighting, photorealistic"
    "h0lly lying on her back, legs spread wide, spreading her pussy open with both hands, explicit, photorealistic"
    "h0lly lying down, inserting two fingers into her pussy, explicit closeup, photorealistic"
    "h0lly lying on her back, using a dildo, explicit, photorealistic"
    "h0lly bent over from behind, showing her ass and pussy, looking back over shoulder, explicit rear view, photorealistic"
)

PAYLOAD='"width": 1024, "height": 1024'

for i in "${!NAMES[@]}"; do
    NAME="${NAMES[$i]}"
    PROMPT="${PROMPTS[$i]}"
    DIR="$OUT/$NAME"
    mkdir -p "$DIR"

    echo "── Test ${NAME} ──"
    echo "   prompt: ${PROMPT:0:80}..."

    # ComfyUI Klein (category routing auto-selects LoRA stack)
    echo "   → ComfyUI Klein (category routing)..."
    OUTFILE="$DIR/comfyui_klein.png"
    curl -sS -L --max-time 400 "$COMFYUI_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD}" \
        -o "$OUTFILE" \
        -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    # Show routing decision from response header
    ROUTING=$(grep -i "x-routing" "$DIR/headers.txt" 2>/dev/null | tr -d '\r' | awk '{print $2}')
    LORACOUNT=$(grep -i "x-lora-count" "$DIR/headers.txt" 2>/dev/null | tr -d '\r' | awk '{print $2}')
    echo "     routing: ${ROUTING:-?} | LoRAs: ${LORACOUNT:-?}"

    echo "   ✅ Saved to $DIR/"
    sz=$(stat -f%z "$OUTFILE" 2>/dev/null || echo 0)
    if [ "$sz" -lt 1000 ]; then
        echo "   ⚠️  $(basename "$OUTFILE") is only ${sz} bytes — likely an error. Content:"
        head -c 300 "$OUTFILE" 2>/dev/null; echo ""
    fi
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "✅ All 6 tests complete. Compare in: $OUT"
echo ""
echo "Each subfolder has:"
echo "  comfyui_klein.png — ComfyUI Klein with category-routed LoRA stack"
echo "  headers.txt       — response headers (routing decision, LoRA count)"
echo ""
echo "Compare AGAINST:"
echo "  ~/Desktop/KLEIN-V2-TEST/      — diffusers v2-recipe (face+body = perfection)"
echo "  ~/Desktop/v3.5-curated/       — your gold-standard reference images"
echo ""
echo "Key questions for each image:"
echo "  - Does she look like Holly? (identity preserved)"
echo "  - Is the sexual action correct? (spreading/insertion/dildo/bent-over)"
echo "  - Is the anatomy right? (no extra limbs, real pussy/ass)"
echo "  - Is skin realistic? (not plastic)"
echo "════════════════════════════════════════════════════════════"
