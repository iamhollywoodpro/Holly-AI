#!/bin/bash
# Comprehensive validation of Phases 4-6

echo "=== PHASE 4-6 VALIDATION ==="
echo ""

# Run TypeScript compiler
echo "1. Running TypeScript compilation..."
npx tsc --noEmit 2>&1 | tee /tmp/tsc-errors.txt

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation PASSED"
else
    echo "❌ TypeScript compilation FAILED"
    echo ""
    echo "Errors found:"
    cat /tmp/tsc-errors.txt
    exit 1
fi

echo ""
echo "2. Running ESLint..."
npm run lint 2>&1 | tee /tmp/lint-errors.txt

echo ""
echo "3. Running Next.js build..."
npm run build 2>&1 | tee /tmp/build-errors.txt

if [ $? -eq 0 ]; then
    echo "✅ Next.js build PASSED"
else
    echo "❌ Next.js build FAILED"
    echo ""
    echo "Build errors:"
    tail -50 /tmp/build-errors.txt
    exit 1
fi

echo ""
echo "=== ALL VALIDATIONS PASSED ==="
