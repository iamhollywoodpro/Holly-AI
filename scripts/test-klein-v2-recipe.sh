#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Klein v2-recipe test — 6-prompt side-by-side comparison
# ─────────────────────────────────────────────────────────────────────────────
# Generates the same 6 prompts against the v2-recipe endpoint and the current
# production Distilled endpoint so Steve can compare the recipe change.
#
#   - v2-recipe:    body v1 @ 0.7, face @ 0.85, 12 steps, CFG 1.0
#                   (matches the Civitai recipe decoded from Steve's perfect
#                    reference images)
#   - Production:   body v2.5 @ 1.0, face @ 0.75, 4 steps, CFG 4.0
#                   (the FACT.md locked recipe)
#
# The 6 prompts cover the exact failure modes Steve flagged:
#   1. Face closeup          — identity preservation baseline
#   2. Full-body nude        — anatomy check
#   3. Spreading pussy       — Distilled renders "spreading nothing"
#   4. Finger insertion      — the hardest explicit act
#   5. Dildo                 — Distilled's proven category (control)
#   6. Bent over (ass)       — anatomy + see-through panties artifact
#
# Output: ~/Desktop/KLEIN-V2-TEST/  (one subfolder per test, both variants)
#
# Usage:  bash scripts/test-klein-v2-recipe.sh
# ─────────────────────────────────────────────────────────────────────────────
# NOTE: NOT using `set -e` — a single curl cold-start timeout (HTTP 303 while
# the container scales up) should NOT abort the whole 12-image run. Each curl
# is allowed to fail; we validate file sizes after.
set -uo pipefail

PROD_URL="https://iamhollywoodpro--generate-holly-a100.modal.run"
V2_URL="https://iamhollywoodpro--generate-holly-v2.modal.run"
PROD_HEALTH_URL="https://iamhollywoodpro--holly-health-a100.modal.run"
V2_HEALTH_URL="https://iamhollywoodpro--holly-health-v2.modal.run"
OUT="$HOME/Desktop/KLEIN-V2-TEST"
mkdir -p "$OUT"

echo "=== Klein v2-recipe vs Production — 6-test comparison ==="
echo "Output: $OUT"
echo ""

# ── Pre-flight: warm up BOTH endpoints before testing ──
# Each endpoint runs in its own container; cold-starting one doesn't warm the
# other. We must hit both health endpoints first so neither generate call
# hits a cold-start redirect (HTTP 303 with 0 bytes).
echo "=== Pre-flight: warming up BOTH endpoints ==="
warm_endpoint() {
    local label="$1" url="$2"
    for attempt in 1 2 3 4; do
        local resp
        resp=$(curl -sS -L --max-time 120 "$url" 2>/dev/null || echo "")
        if echo "$resp" | grep -q '"model_loaded":true'; then
            echo "  ✅ $label READY"
            return 0
        fi
        echo "  ($label attempt $attempt: warming, retry in 20s...)"
        sleep 20
    done
    echo "  ⚠️  $label did not become ready after 4 attempts"
    return 1
}
warm_endpoint "Production (Distilled)" "$PROD_HEALTH_URL"
warm_endpoint "v2-recipe" "$V2_HEALTH_URL"
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
    "h0lly bent over, ass in the air, looking back, explicit rear view, photorealistic"
)

# Both endpoints use their OWN defaults (v2 = 12/CFG1, prod = 4/CFG4) so the
# comparison reflects how each would actually run in production.
PAYLOAD_DEFAULTS='"width": 1024, "height": 1024, "format": "png"'

for i in "${!NAMES[@]}"; do
    NAME="${NAMES[$i]}"
    PROMPT="${PROMPTS[$i]}"
    DIR="$OUT/$NAME"
    mkdir -p "$DIR"

    echo "── Test ${NAME} ──"
    echo "   prompt: ${PROMPT:0:80}..."

    # Production Distilled (4 steps / CFG 4.0, body v2.5 @ 1.0)
    echo "   → Production (4 steps, CFG 4, body v2.5)..."
    PROD_FILE="$DIR/production.png"
    curl -sS -L --max-time 200 "$PROD_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/production_headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD_DEFAULTS}" \
        -o "$PROD_FILE" -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    # v2-recipe (12 steps / CFG 1.0, body v1 @ 0.7)
    echo "   → v2-recipe (12 steps, CFG 1, body v1 @ 0.7)..."
    V2_FILE="$DIR/v2_recipe.png"
    curl -sS -L --max-time 300 "$V2_URL" \
        -H "Content-Type: application/json" \
        -D "$DIR/v2_headers.txt" \
        -d "{\"prompt\": \"$PROMPT\", $PAYLOAD_DEFAULTS}" \
        -o "$V2_FILE" -w "     HTTP %{http_code} | %{time_total}s | %{size_download} bytes\n"

    echo "   ✅ Saved to $DIR/"
    # Validate files are real images (not 0-byte error responses)
    for f in "$PROD_FILE" "$V2_FILE"; do
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
echo "  production.png  — current prod (4 steps, CFG 4, body v2.5 @ 1.0)"
echo "  v2_recipe.png   — test (12 steps, CFG 1, body v1 @ 0.7, face @ 0.85)"
echo ""
echo "Compare AGAINST your reference folders:"
echo "  ~/Desktop/Holly Training V.3.1/"
echo "  ~/Desktop/v3.5-curated/"
echo "Those are the quality standard (decoded from — they used this recipe)."
echo "════════════════════════════════════════════════════════════"
