#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ComfyUI Klein refinement test — refined vs unrefined comparison
# ─────────────────────────────────────────────────────────────────────────────
# Runs the 4 tests that had anatomy issues (3,4,5,6) TWICE:
#   - Once WITHOUT refinement (baseline — same as last test)
#   - Once WITH enhance_details=true (ADetailer-style hand/foot/face refinement)
#
# Steve compares: did refinement fix the digits (4/6 fingers, 4/6 toes)?
# Did it cause plastic over-processing?
#
# Output: ~/Desktop/KLEIN-COMFYUI-REFINED-TEST/
#
# Usage:  bash scripts/test-comfyui-klein-refined.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

COMFYUI_URL="https://iamhollywoodpro--generate-comfyui-klein.modal.run"
HEALTH_URL="https://iamhollywoodpro--comfyui-klein-health.modal.run"
OUT="$HOME/Desktop/KLEIN-COMFYUI-REFINED-TEST"
mkdir -p "$OUT"

echo "=== ComfyUI Klein refinement pass test ==="
echo "Output: $OUT"
echo ""

# ── Pre-flight ──
echo "=== Pre-flight ==="
for attempt in 1 2 3 4 5; do
    HEALTH=$(curl -sS -L --max-time 90 "$HEALTH_URL" 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"healthy"'; then
        echo "✅ ComfyUI Klein READY"
        break
    fi
    echo "   (attempt $attempt: not ready, retry in 30s...)"
    sleep 30
done
if ! echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "❌ Endpoint not healthy: $HEALTH"
    exit 1
fi
echo ""

# ── Test prompts (the 4 that had anatomy issues) ──
declare -a NAMES=(
    "03_spreading"
    "04_finger_insertion"
    "05_dildo"
    "06_bent_over"
)
declare -a PROMPTS=(
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
    echo "   prompt: ${PROMPT:0:70}..."

    # Unrefined (baseline)
    echo "   → UNREFINED (baseline)..."
    curl -sS -L --max-time 400 "$COMFYUI_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/unrefined_headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD}" \
        -o "$DIR/unrefined.png" \
        -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    # Refined (with enhance_details)
    echo "   → REFINED (enhance_details=true)..."
    curl -sS -L --max-time 600 "$COMFYUI_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/refined_headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD, \"enhance_details\": true}" \
        -o "$DIR/refined.png" \
        -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    # Show refinement info from headers
    REFINED=$(grep -i "x-refined-regions" "$DIR/refined_headers.txt" 2>/dev/null | tr -d '\r' | sed 's/.*: //' | head -1)
    REROLL=$(grep -i "x-reroll-recommended" "$DIR/refined_headers.txt" 2>/dev/null | tr -d '\r' | sed 's/.*: //' | head -1)
    echo "     refined regions: ${REFINED:-?} | reroll: ${REROLL:-?}"

    echo "   ✅ Saved to $DIR/"
    for f in "$DIR/unrefined.png" "$DIR/refined.png"; do
        sz=$(stat -f%z "$f" 2>/dev/null || echo 0)
        if [ "$sz" -lt 1000 ]; then
            echo "   ⚠️  $(basename "$f") is only ${sz} bytes"
            head -c 200 "$f" 2>/dev/null; echo ""
        fi
    done
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "✅ Refinement test complete. Compare in: $OUT"
echo ""
echo "Each subfolder has:"
echo "  unrefined.png — baseline (same as last test, anatomy issues)"
echo "  refined.png   — with ADetailer-style hand/foot/face refinement"
echo ""
echo "Key questions:"
echo "  - Did refinement fix the digit counts? (5 fingers, 5 toes)"
echo "  - Is identity still Holly after refinement?"
echo "  - Is the skin still realistic (not plastic/over-processed)?"
echo "  - For conjoined-twin cases: did it flag X-Reroll-Recommended: true?"
echo "════════════════════════════════════════════════════════════"
