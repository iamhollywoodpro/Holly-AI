#!/bin/bash
# Pre-Push Gate — MUST PASS before any push to main
# Usage: bash .zcode/scripts/pre-push-gate.sh

set -e
PROJECT_ROOT="/Users/stevefreshblendz/Desktop/Holly-AI-main"
cd "$PROJECT_ROOT"

echo "═══════════════════════════════════════════"
echo "  PRE-PUSH VERIFICATION GATE"
echo "═══════════════════════════════════════════"
echo ""

FAILURES=0

# 1. TypeScript Check
echo "1. TypeScript check..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "   ❌ TypeScript errors found"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -5
    FAILURES=$((FAILURES + 1))
else
    echo "   ✅ TypeScript clean"
fi

# 2. Test Suite
echo "2. Test suite..."
TEST_RESULT=$(npx jest --passWithNoTests --forceExit 2>&1 | tail -3)
if echo "$TEST_RESULT" | grep -q "failed"; then
    echo "   ❌ Tests failed"
    echo "$TEST_RESULT"
    FAILURES=$((FAILURES + 1))
else
    echo "   ✅ Tests passed"
fi

# 3. Python syntax (check modified .py files only)
echo "3. Python syntax check..."
PY_FILES=$(git diff --name-only HEAD | grep "\.py$" || true)
if [ -n "$PY_FILES" ]; then
    for f in $PY_FILES; do
        if python3 -c "import ast; ast.parse(open('$f').read())" 2>/dev/null; then
            echo "   ✅ $f"
        else
            echo "   ❌ $f has syntax errors"
            FAILURES=$((FAILURES + 1))
        fi
    done
else
    echo "   ✅ No Python files changed"
fi

# 4. Show what's being pushed
echo "4. Files to be pushed:"
git diff --name-only HEAD | head -20

echo ""
echo "═══════════════════════════════════════════"
if [ $FAILURES -gt 0 ]; then
    echo "  ❌ GATE FAILED — $FAILURES issue(s) found"
    echo "  FIX ALL ISSUES BEFORE PUSHING"
    echo "═══════════════════════════════════════════"
    exit 1
else
    echo "  ✅ ALL CHECKS PASSED — safe to push"
    echo "═══════════════════════════════════════════"
    exit 0
fi
