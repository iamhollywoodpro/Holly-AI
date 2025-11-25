#!/bin/bash
# MANDATORY Pre-Deployment Check
# This script MUST pass before deploying

set -e

echo "🛡️  HOLLY Pre-Deployment Check"
echo "=============================="
echo ""

ERRORS=0

# Step 1: Model Field Audit
echo "📋 Step 1: Model Field Audit"
echo "-----------------------------"
if [ -f ".holly/model-field-audit.sh" ]; then
    ./.holly/model-field-audit.sh > /tmp/audit-output.txt
    
    if grep -q "MISSING IN SCHEMA" /tmp/audit-output.txt; then
        echo "❌ FAILED: Models have missing fields"
        echo ""
        cat /tmp/audit-output.txt | grep -A 5 "MISSING IN SCHEMA"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ All model fields present"
    fi
else
    echo "⚠️  Audit script not found, skipping"
fi
echo ""

# Step 2: Prisma Client Generation
echo "🔨 Step 2: Prisma Client Generation"
echo "------------------------------------"
if npx prisma generate > /dev/null 2>&1; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ FAILED: Prisma client generation failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Step 3: TypeScript Type Check (sample files)
echo "📝 Step 3: TypeScript Type Check"
echo "---------------------------------"
echo "Checking critical API routes..."

CRITICAL_FILES=(
    "app/api/chat/route.ts"
    "app/api/consciousness/goals/route.ts"
    "app/api/consciousness/experiences/route.ts"
   "app/api/consciousness/record-experience/route.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        if npx tsc --noEmit "$file" 2>&1 | grep -q "error TS"; then
            echo "❌ Type errors in $file"
            ERRORS=$((ERRORS + 1))
        else
            echo "✅ $file"
        fi
    fi
done
echo ""

# Final Report
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED"
    echo ""
    echo "Safe to deploy."
    exit 0
else
    echo "❌ $ERRORS CHECK(S) FAILED"
    echo ""
    echo "DO NOT DEPLOY until all errors are fixed."
    exit 1
fi
