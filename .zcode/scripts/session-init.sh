#!/bin/bash
# Holly Session Initialization — runs on every prompt
# 1. Loads current state from FACT.md
# 2. Runs knowledge decay check to catch stale info

PROJECT_ROOT="/Users/stevefreshblendz/Desktop/Holly-AI-main"

# ── Load Current State ────────────────────────────────────────────────────
if [ -f "$PROJECT_ROOT/memory/FACT.md" ]; then
    echo "=== HOLLY CURRENT STATE (auto-loaded) ==="
    sed -n '/## CURRENT STATE/,/### ZCODE CLAUDE-KILLER STATUS/p' "$PROJECT_ROOT/memory/FACT.md" 2>/dev/null | head -80
    echo ""
    echo "=== CRITICAL RULES ==="
    head -20 "$PROJECT_ROOT/memory/FACT.md" 2>/dev/null
fi

# ── Knowledge Decay Check ────────────────────────────────────────────────
if [ -f "$PROJECT_ROOT/.zcode/scripts/knowledge-decay-check.sh" ]; then
    echo ""
    bash "$PROJECT_ROOT/.zcode/scripts/knowledge-decay-check.sh" 2>/dev/null
fi
