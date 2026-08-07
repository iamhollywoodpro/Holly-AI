#!/bin/bash
# Knowledge Decay Checker — verifies FACT.md claims match actual code reality
# Runs as part of session-init to catch stale information before it causes problems

PROJECT_ROOT="/Users/stevefreshblendz/Desktop/Holly-AI-main"
FACT_FILE="$PROJECT_ROOT/memory/FACT.md"
WARNINGS=0
ERRORS=0

echo "=== KNOWLEDGE DECAY CHECK ==="

# ── 1. Verify base model in code matches FACT.md ──────────────────────────
FACT_BASE=$(grep -o "Klein.*Distilled\|Klein.*Base\|klein-9b" "$FACT_FILE" | head -1)
CODE_BASE=$(grep "KLEIN_UNET_FILE" "$PROJECT_ROOT/services/modal-media/comfyui_klein.py" 2>/dev/null | grep -o "flux-2-klein[a-z0-9-]*\.safetensors")

if echo "$CODE_BASE" | grep -q "klein-9b.safetensors" && echo "$FACT_BASE" | grep -q "Distilled"; then
    echo "  ✅ Base model: Code=Distilled, FACT=Distilled — match"
elif echo "$CODE_BASE" | grep -q "klein-base"; then
    echo "  ❌ CRITICAL: Code is using Klein BASE but FACT.md says Distilled!"
    echo "     This caused cartoon output before. Fix immediately."
    ERRORS=$((ERRORS + 1))
else
    echo "  ⚠️ Cannot verify base model match (code=$CODE_BASE, fact=$FACT_BASE)"
    WARNINGS=$((WARNINGS + 1))
fi

# ── 2. Verify LoRA strength matches FACT.md ──────────────────────────────
CODE_STRENGTH=$(grep "holly-combined-v1" "$PROJECT_ROOT/services/modal-media/comfyui_klein.py" | grep -o "strength.*[0-9.]" | head -1 | grep -o "[0-9.]*")
FACT_STRENGTH=$(grep "combined-v1.*0\." "$FACT_FILE" | grep -o "0\.[0-9]*" | head -1)

if [ -n "$CODE_STRENGTH" ] && [ -n "$FACT_STRENGTH" ]; then
    if [ "$CODE_STRENGTH" = "$FACT_STRENGTH" ]; then
        echo "  ✅ LoRA strength: Code=$CODE_STRENGTH, FACT=$FACT_STRENGTH — match"
    else
        echo "  ⚠️ LoRA strength mismatch: Code=$CODE_STRENGTH, FACT=$FACT_STRENGTH"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ── 3. Verify steps/CFG in code match FACT.md ────────────────────────────
CODE_STEPS=$(grep "^V2_STEPS" "$PROJECT_ROOT/services/modal-media/comfyui_klein.py" | grep -o "[0-9]*")
CODE_CFG=$(grep "^V2_CFG" "$PROJECT_ROOT/services/modal-media/comfyui_klein.py" | grep -o "[0-9.]*")
FACT_STEPS=$(grep "12 steps\|28 steps\|20 steps" "$FACT_FILE" | grep -o "[0-9]* steps" | head -1)
FACT_CFG=$(grep "CFG 1.0\|CFG 4.0\|CFG 3.5\|CFG 2.8" "$FACT_FILE" | grep -o "CFG [0-9.]*" | head -1)

if [ -n "$CODE_STEPS" ]; then
    if echo "$FACT_STEPS" | grep -q "$CODE_STEPS"; then
        echo "  ✅ Steps: Code=$CODE_STEPS, FACT=$FACT_STEPS — match"
    else
        echo "  ⚠️ Steps mismatch: Code=$CODE_STEPS, FACT=$FACT_STEPS"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

if [ -n "$CODE_CFG" ]; then
    if echo "$FACT_CFG" | grep -q "$CODE_CFG"; then
        echo "  ✅ CFG: Code=$CODE_CFG, FACT=$FACT_CFG — match"
    else
        echo "  ⚠️ CFG mismatch: Code=$CODE_CFG, FACT=$FACT_CFG"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ── 4. Verify _CATEGORY_STACKS is not empty ──────────────────────────────
STACKS_EMPTY=$(grep "_CATEGORY_STACKS = {}" "$PROJECT_ROOT/services/modal-media/comfyui_klein.py" 2>/dev/null)

if [ -n "$STACKS_EMPTY" ]; then
    echo "  ❌ CRITICAL: _CATEGORY_STACKS is EMPTY — specialist LoRAs are disconnected!"
    echo "     This breaks ALL explicit action generation."
    ERRORS=$((ERRORS + 1))
else
    STACK_COUNT=$(grep -c '{"name":' "$PROJECT_ROOT/services/modal-media/comfyui_klein.py" 2>/dev/null)
    if [ "$STACK_COUNT" -gt 5 ]; then
        echo "  ✅ Category stacks populated ($STACK_COUNT LoRA entries found)"
    else
        echo "  ⚠️ Low LoRA entry count ($STACK_COUNT) — may need checking"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ── 5. Verify brain-v35 is stopped (not running on Modal) ────────────────
echo "  ℹ️ Brain-v35 status: (check manually with 'modal app list' on iamhollywoodpro)"

# ── 6. Verify Docker image includes MCP server ───────────────────────────
DOCKERIGNORE_CHECK=$(grep "holly-mcp-server.js" "$PROJECT_ROOT/.dockerignore" 2>/dev/null)
if [ -n "$DOCKERIGNORE_CHECK" ]; then
    echo "  ✅ MCP server exception in .dockerignore"
else
    echo "  ❌ CRITICAL: MCP server NOT in .dockerignore exception — tools won't load in Docker!"
    ERRORS=$((ERRORS + 1))
fi

# ── 7. Verify DOCKER_BUILD is false in Dockerfile ─────────────────────────
DOCKERFILE_CHECK=$(grep "DOCKER_BUILD=false" "$PROJECT_ROOT/Dockerfile" 2>/dev/null)
if [ -n "$DOCKERFILE_CHECK" ]; then
    echo "  ✅ DOCKER_BUILD=false in Dockerfile runtime"
else
    echo "  ❌ CRITICAL: DOCKER_BUILD not set to false — MCP server won't start!"
    ERRORS=$((ERRORS + 1))
fi

# ── 8. Check if FACT.md was updated recently ─────────────────────────────
FACT_AGE=$(find "$FACT_FILE" -mtime +7 2>/dev/null)
if [ -n "$FACT_AGE" ]; then
    echo "  ⚠️ FACT.md hasn't been updated in 7+ days — may be stale"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ FACT.md updated recently"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
if [ $ERRORS -gt 0 ]; then
    echo "  ❌ $ERRORS CRITICAL ERROR(S) — code does not match documented state!"
    echo "     Fix these BEFORE making any changes."
elif [ $WARNINGS -gt 0 ]; then
    echo "  ⚠️ $WARNINGS warning(s) — verify these are intentional"
else
    echo "  ✅ All checks passed — code matches documented state"
fi
echo "=== END DECAY CHECK ==="
