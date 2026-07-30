#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Klein Base vs Distilled — 6-test side-by-side comparison
# ─────────────────────────────────────────────────────────────────────────────
# Generates the same 6 prompts against BOTH endpoints so Steve can compare:
#   - Production Distilled: https://iamhollywoodpro--generate-holly-a100.modal.run
#   - Test Base:            https://iamhollywoodpro--generate-holly-base.modal.run
#
# The 6 prompts cover the exact failure modes Steve flagged:
#   1. Face closeup          — identity preservation baseline
#   2. Full-body nude        — v3.0-v3.5 failure case (anatomy, no standing shots)
#   3. Spreading pussy       — Distilled renders "spreading nothing"
#   4. Finger insertion      — Distilled CANNOT do this (geometry too complex for 4 steps)
#   5. Dildo                 — Distilled's proven category (control/baseline)
#   6. Bent over (ass)       — anatomy + see-through panties artifact
#
# Output: ~/Desktop/KLEIN-BASE-TEST/  (one subfolder per test, both variants)
#
# Usage:  bash scripts/test-klein-base-vs-distilled.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DISTILLED_URL="https://iamhollywoodpro--generate-holly-a100.modal.run"
BASE_URL="https://iamhollywoodpro--generate-holly-base.modal.run"
OUT="$HOME/Desktop/KLEIN-BASE-TEST"
mkdir -p "$OUT"

echo "=== Klein Base vs Distilled — 6-test comparison ==="
echo "Output: $OUT"
echo ""

# ── Pre-flight: confirm Base endpoint is healthy (license accepted, weights downloaded) ──
echo "=== Pre-flight: Base endpoint health ==="
BASE_HEALTH_URL="https://iamhollywoodpro--holly-health-base.modal.run"
# -L follows Modal's 303 redirect; retry up to 3x to ride out cold starts.
BASE_HEALTH=""
for attempt in 1 2 3; do
    BASE_HEALTH=$(curl -sS -L --max-time 90 "$BASE_HEALTH_URL" 2>/dev/null || echo "")
    if echo "$BASE_HEALTH" | grep -q '"model_loaded":true'; then break; fi
    echo "   (attempt $attempt: endpoint not ready yet, retrying in 30s...)"
    sleep 30
done
if echo "$BASE_HEALTH" | grep -q '"model_loaded":true'; then
    echo "✅ Base endpoint READY"
elif echo "$BASE_HEALTH" | grep -q '403\|gated'; then
    echo "❌ BLOCKER: FLUX.2-klein-base-9B license not accepted."
    echo "   Steve must visit: https://huggingface.co/black-forest-labs/FLUX.2-klein-base-9B"
    echo "   Log in with the same HF account whose token is in Modal's 'huggingface-secret'."
    echo "   Click 'Agree and access repository'. Auto-approved (no manual review)."
    exit 1
else
    echo "⚠️  Base endpoint not ready. Response was:"
    echo "    $BASE_HEALTH"
    echo "  Check: curl -L $BASE_HEALTH_URL"
    exit 1
fi
echo ""

# ── Test prompts (h0lly trigger present so the endpoint injects the body prefix) ──
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
    "h0lly bent over, ass in the air, looking back, explicit rear view, photorealistic"
)

# Klein Base needs more steps (24) + honors CFG (4.0). Distilled uses its baked-in 4-step recipe.
# We let each endpoint use its own defaults by NOT overriding num_inference_steps/guidance_scale,
# so the comparison reflects how each would actually run in production.
PAYLOAD_DEFAULTS='"width": 1024, "height": 1024, "format": "png"'

for i in "${!NAMES[@]}"; do
    NAME="${NAMES[$i]}"
    PROMPT="${PROMPTS[$i]}"
    DIR="$OUT/$NAME"
    mkdir -p "$DIR"

    echo "── Test ${NAME} ──"
    echo "   prompt: ${PROMPT:0:80}..."

    # Distilled (production) — uses 4-step baked recipe
    echo "   → Distilled..."
    DISTILLED_FILE="$DIR/distilled.png"
    # -L follows Modal's 303 redirect to the actual worker (without it, curl
    # returns the 303 with 0 bytes). -D captures response headers.
    curl -sS -L --max-time 200 "$DISTILLED_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/distilled_headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD_DEFAULTS}" \
        -o "$DISTILLED_FILE" -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    # Base (test) — uses 24-step + CFG 4.0 recipe
    echo "   → Base..."
    BASE_FILE="$DIR/base.png"
    curl -sS -L --max-time 300 "$BASE_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/base_headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD_DEFAULTS}" \
        -o "$BASE_FILE" -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    echo "   ✅ Saved to $DIR/"
    # Validate files are real images (not 0-byte error responses)
    for f in "$DISTILLED_FILE" "$BASE_FILE"; do
        sz=$(stat -f%z "$f" 2>/dev/null || echo 0)
        if [ "$sz" -lt 1000 ]; then
            echo "   ⚠️  $(basename "$f") is only ${sz} bytes — likely an error. Content:"
            head -c 200 "$f" 2>/dev/null; echo ""
        fi
    done
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "✅ All 6 tests complete. Compare in: $OUT"
echo ""
echo "Each subfolder has:"
echo "  distilled.png  — current production (4-step Distilled)"
echo "  base.png       — test (24-step Base, CFG honored)"
echo ""
echo "Steve's verdict gate: Base must match/beat Distilled on:"
echo "  - Skin realism (less plastic)"
echo "  - Anatomy (no extra limbs/fingers/toes)"
echo "  - Pussy realism (no see-through panties, real anatomy)"
echo "  - Identity (still looks like Holly)"
echo "  - Explicit acts (spreading, finger insertion, dildo)"
echo "════════════════════════════════════════════════════════════"
