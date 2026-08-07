#!/bin/bash
# Holly Session Initialization — runs on every prompt
# Loads current state so any new session knows exactly where we are

PROJECT_ROOT="/Users/stevefreshblendz/Desktop/Holly-AI-main"

if [ -f "$PROJECT_ROOT/memory/FACT.md" ]; then
    # Load the CURRENT STATE section first (most important for new sessions)
    echo "=== HOLLY CURRENT STATE (auto-loaded) ==="
    sed -n '/## CURRENT STATE/,/### ZCODE CLAUDE-KILLER STATUS/p' "$PROJECT_ROOT/memory/FACT.md" 2>/dev/null | head -80
    echo ""
    # Load the critical rules
    echo "=== CRITICAL RULES ==="
    head -20 "$PROJECT_ROOT/memory/FACT.md" 2>/dev/null
fi
