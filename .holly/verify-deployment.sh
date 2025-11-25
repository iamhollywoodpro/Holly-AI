#!/bin/bash
# HOLLY's Pre-Deployment Verification Script
# This script MUST pass before any deployment

set -e  # Exit on any error

echo "🔍 HOLLY's Pre-Deployment Verification"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Phase 1: Schema Verification
echo "📋 Phase 1: Schema Verification"
echo "--------------------------------"

echo "Reading Prisma schema..."
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Prisma schema not found!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ Schema file exists${NC}"
    
    # Extract model names
    SCHEMA_MODELS=$(grep "^model " prisma/schema.prisma | awk '{print $2}')
    echo "Models in schema:"
    echo "$SCHEMA_MODELS" | sed 's/^/  - /'
fi
echo ""

# Phase 2: Codebase Audit
echo "🔎 Phase 2: Codebase Audit"
echo "--------------------------"

echo "Scanning for Prisma model references..."
CODE_MODELS=$(find app src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | \
              xargs grep -h "prisma\.[a-zA-Z]" 2>/dev/null | \
              grep -o "prisma\.[a-zA-Z]*" | \
              sed 's/prisma\.//' | \
              sort -u)

if [ ! -z "$CODE_MODELS" ]; then
    echo "Models referenced in code:"
    echo "$CODE_MODELS" | sed 's/^/  - /'
    
    # Check for mismatches
    echo ""
    echo "Checking for undefined models..."
    while IFS= read -r model; do
        if ! echo "$SCHEMA_MODELS" | grep -q "^${model}$"; then
            echo -e "${RED}❌ ERROR: Code references 'prisma.$model' but model doesn't exist in schema!${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    done <<< "$CODE_MODELS"
    
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✓ All model references are valid${NC}"
    fi
else
    echo -e "${GREEN}✓ No model references found${NC}"
fi
echo ""

# Phase 3: Dependency Check
echo "📦 Phase 3: Dependency Verification"
echo "------------------------------------"

echo "Checking for missing dependencies..."
MISSING_DEPS=0

# Scan imports in TypeScript files
IMPORTS=$(find app src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | \
          xargs grep -h "^import.*from ['\"]" 2>/dev/null | \
          grep -o "from ['\"][^'\"]*['\"]" | \
          sed "s/from ['\"]//;s/['\"]$//" | \
          grep -v "^\./" | grep -v "^@/" | \
          sort -u)

if [ ! -z "$IMPORTS" ]; then
    while IFS= read -r pkg; do
        # Extract package name (before any /)
        PKG_NAME=$(echo "$pkg" | cut -d'/' -f1)
        if ! grep -q "\"$PKG_NAME\"" package.json; then
            echo -e "${RED}❌ ERROR: Package '$PKG_NAME' imported but not in package.json!${NC}"
            MISSING_DEPS=$((MISSING_DEPS + 1))
            ERRORS=$((ERRORS + 1))
        fi
    done <<< "$IMPORTS"
fi

if [ $MISSING_DEPS -eq 0 ]; then
    echo -e "${GREEN}✓ All dependencies are installed${NC}"
fi
echo ""

# Phase 4: TypeScript Compilation
echo "🔨 Phase 4: TypeScript Compilation"
echo "-----------------------------------"

echo "Generating Prisma client..."
if npx prisma generate > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${RED}❌ ERROR: Prisma client generation failed!${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo "Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt; then
    echo -e "${GREEN}✓ TypeScript compiles successfully${NC}"
else
    echo -e "${RED}❌ ERROR: TypeScript compilation failed!${NC}"
    echo "Errors:"
    cat /tmp/tsc-output.txt
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Phase 5: Build Test
echo "🏗️  Phase 5: Build Test"
echo "----------------------"

echo "Running production build..."
if npm run build > /tmp/build-output.txt 2>&1; then
    echo -e "${GREEN}✓ Build succeeded${NC}"
else
    echo -e "${RED}❌ ERROR: Build failed!${NC}"
    echo "Build output:"
    tail -50 /tmp/build-output.txt
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Final Report
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "Deployment is approved. Proceed with confidence."
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo ""
    echo "Found $ERRORS error(s). DO NOT DEPLOY."
    echo "Fix all errors and run this script again."
    exit 1
fi
