#!/bin/bash
# SYSTEMATIC SCHEMA VALIDATION - Check ALL Prisma models for field mismatches
# This script will find EVERY schema error before we push again

cd /home/user/Holly-AI

echo "========================================"
echo "SYSTEMATIC SCHEMA VALIDATION"
echo "Checking ALL 107 Prisma models"
echo "========================================"
echo ""

ERRORS_FOUND=0

# Common wrong field patterns
echo "=== CHECKING COMMON FIELD ERRORS ==="
echo ""

echo "1. Checking FileUpload fields..."
grep -rn "\.createdAt" app/api --include="*.ts" | grep -i "fileupload\|file\." | grep -v "uploadedAt" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND createdAt (should be uploadedAt)" || echo "✅ OK"
grep -rn "\.size\|_sum.*size" app/api --include="*.ts" | grep -i "fileupload" | grep -v "fileSize" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND size (should be fileSize)" || echo "✅ OK"

echo ""
echo "2. Checking MusicTrack fields..."
grep -rn "createdAt.*:" app/api --include="*.ts" | grep "musicTrack" | grep -v "uploadedAt" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND createdAt (should be uploadedAt)" || echo "✅ OK"

echo ""
echo "3. Checking Notification fields..."
grep -rn "read:" app/api --include="*.ts" | grep -i "notification" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND read field (should be status)" || echo "✅ OK"

echo ""
echo "4. Checking EmotionalState fields..."
grep -rn "\.emotion[^a-zA-Z]" app/api --include="*.ts" | grep -v "primaryEmotion\|secondaryEmotion" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND emotion (should be primaryEmotion)" || echo "✅ OK"
grep -rn "trigger:" app/api --include="*.ts" | grep "emotionalState" | grep -v "triggers:" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND trigger (should be triggers array)" || echo "✅ OK"

echo ""
echo "5. Checking HollyExperience fields..."
grep -rn "description:" app/api --include="*.ts" | grep "hollyExperience\|HollyExperience" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND description (check schema)" || echo "✅ OK"
grep -rn "context:" app/api --include="*.ts" | grep "hollyExperience\|HollyExperience" | grep -v "content:" && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND context (should be content)" || echo "✅ OK"

echo ""
echo "6. Checking User relations..."
grep -rn "_count.*messages" app/api --include="*.ts" | grep "user\." && ERRORS_FOUND=$((ERRORS_FOUND+1)) && echo "❌ FOUND messages in User._count (doesn't exist)" || echo "✅ OK"

echo ""
echo "========================================"
echo "VALIDATION COMPLETE"
echo "Errors found: $ERRORS_FOUND"
echo "========================================"

if [ $ERRORS_FOUND -gt 0 ]; then
    echo "❌ SCHEMA ERRORS DETECTED - DO NOT PUSH"
    exit 1
else
    echo "✅ NO SCHEMA ERRORS FOUND"
    exit 0
fi
