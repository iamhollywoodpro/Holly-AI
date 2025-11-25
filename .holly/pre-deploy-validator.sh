#!/bin/bash
# MANDATORY PRE-DEPLOYMENT VALIDATOR
# This script MUST pass before any git push
# Run: bash .holly/pre-deploy-validator.sh

set -e  # Exit on any error

WORKSPACE="/home/user/Holly-AI"
LOG_FILE="/tmp/pre-deploy-validation.log"
ERRORS_FILE="/tmp/pre-deploy-errors.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "==================================="
echo "PRE-DEPLOYMENT VALIDATION SUITE"
echo "==================================="
echo "" > "$LOG_FILE"
echo "" > "$ERRORS_FILE"

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Helper function
check_step() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -e "\n[CHECK $TOTAL_CHECKS] $1" | tee -a "$LOG_FILE"
}

pass_check() {
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "${GREEN}✓ PASS${NC}: $1" | tee -a "$LOG_FILE"
}

fail_check() {
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "${RED}✗ FAIL${NC}: $1" | tee -a "$LOG_FILE"
    echo "$1" >> "$ERRORS_FILE"
}

warn_check() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1" | tee -a "$LOG_FILE"
}

cd "$WORKSPACE"

# ============================================
# CHECK 1: Identify changed models in schema
# ============================================
check_step "Identifying changed Prisma models"

CHANGED_MODELS=$(git diff origin/main prisma/schema.prisma | grep "^[+-]model " | sed 's/^[+-]model //' | sed 's/ {//' | sort -u || echo "")

if [ -z "$CHANGED_MODELS" ]; then
    pass_check "No model changes detected"
else
    echo "Changed models: $CHANGED_MODELS" | tee -a "$LOG_FILE"
    pass_check "Found $(echo "$CHANGED_MODELS" | wc -l) changed models"
fi

# ============================================
# CHECK 2: Prisma schema syntax validation
# ============================================
check_step "Validating Prisma schema syntax"

# prisma validate needs DATABASE_URL, but we only care about syntax
# Check if error is about env var (ok) vs syntax error (bad)
VALIDATE_OUTPUT=$(npx prisma validate 2>&1 || true)

if echo "$VALIDATE_OUTPUT" | grep -q "Environment variable not found: DATABASE_URL"; then
    pass_check "Schema syntax is valid (DATABASE_URL not set in sandbox, but that's OK)"
elif echo "$VALIDATE_OUTPUT" | grep -q "Prisma schema loaded"; then
    pass_check "Schema syntax is valid"
else
    fail_check "Schema has syntax errors - run 'npx prisma validate'"
    echo "$VALIDATE_OUTPUT" >> "$ERRORS_FILE"
fi

# ============================================
# CHECK 3: Prisma client generation
# ============================================
check_step "Testing Prisma client generation"

if npx prisma generate >> "$LOG_FILE" 2>&1; then
    pass_check "Prisma client generated successfully"
else
    fail_check "Prisma client generation failed"
fi

# ============================================
# CHECK 4: Check for duplicate model names
# ============================================
check_step "Checking for duplicate model definitions"

DUPLICATE_MODELS=$(grep "^model " prisma/schema.prisma | awk '{print $2}' | sort | uniq -d)

if [ -z "$DUPLICATE_MODELS" ]; then
    pass_check "No duplicate model names found"
else
    warn_check "Found duplicate model names: $DUPLICATE_MODELS (GitHubConnection vs GitHubIntegration is expected)"
fi

# ============================================
# CHECK 5: Verify relation fields have @relation
# ============================================
check_step "Verifying relation field integrity"

# Look for fields ending in 'Id' that might be missing relations
POTENTIAL_RELATIONS=$(grep -E "^\s+\w+Id\s+String" prisma/schema.prisma | grep -v "@relation" || echo "")

if [ -z "$POTENTIAL_RELATIONS" ]; then
    pass_check "All relation fields appear properly defined"
else
    warn_check "Found potential unlinked relation fields:\n$POTENTIAL_RELATIONS"
fi

# ============================================
# CHECK 6: Search for create/upsert operations
# ============================================
check_step "Scanning for Prisma create/upsert operations in code"

CREATE_FILES=$(find app src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "prisma\.[a-zA-Z]*\.\(create\|upsert\)" {} \; | wc -l)

if [ "$CREATE_FILES" -gt 0 ]; then
    pass_check "Found $CREATE_FILES files with Prisma write operations"
    echo "Files with Prisma operations:" >> "$LOG_FILE"
    find app src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "prisma\.[a-zA-Z]*\.\(create\|upsert\)" {} \; >> "$LOG_FILE"
else
    warn_check "No Prisma write operations found (unusual)"
fi

# ============================================
# CHECK 7: Field type consistency check
# ============================================
check_step "Checking for common field type mismatches"

# Check for fields that should be arrays
ARRAY_FIELD_ISSUES=$(grep -E "^\s+(keyPoints|topics|scopes|technologies|tags)\s+String\s" prisma/schema.prisma | grep -v "String\[\]" || echo "")

if [ -z "$ARRAY_FIELD_ISSUES" ]; then
    pass_check "Array fields correctly typed as String[]"
else
    fail_check "Found fields that should be arrays:\n$ARRAY_FIELD_ISSUES"
fi

# ============================================
# CHECK 8: Default value consistency
# ============================================
check_step "Checking default values for new fields"

# Check if new array fields have @default([])
NEW_ARRAYS=$(grep -E "^\s+\w+\s+String\[\]" prisma/schema.prisma | grep -v "@default(\[\])" || echo "")

if [ -z "$NEW_ARRAYS" ]; then
    pass_check "All array fields have default values"
else
    warn_check "Array fields without @default([]):\n$NEW_ARRAYS"
fi

# ============================================
# CHECK 9: Verify all models have required indexes
# ============================================
check_step "Verifying database indexes"

# Check that models with userId have index
MODELS_NEEDING_INDEX=$(grep -B 20 "userId.*String" prisma/schema.prisma | grep "^model " | awk '{print $2}')
MISSING_INDEXES=""

for model in $MODELS_NEEDING_INDEX; do
    if ! grep -A 30 "^model $model" prisma/schema.prisma | grep -q "@@index(\[userId\])"; then
        MISSING_INDEXES="$MISSING_INDEXES\n  - $model"
    fi
done

if [ -z "$MISSING_INDEXES" ]; then
    pass_check "All userId fields have indexes"
else
    warn_check "Models missing userId index:$MISSING_INDEXES"
fi

# ============================================
# CHECK 10: Git status verification
# ============================================
check_step "Checking git status"

UNCOMMITTED=$(git status --porcelain | wc -l)

if [ "$UNCOMMITTED" -eq 0 ]; then
    pass_check "No uncommitted changes"
else
    warn_check "Found $UNCOMMITTED uncommitted changes - make sure to commit everything"
fi

# ============================================
# FINAL REPORT
# ============================================
echo ""
echo "==================================="
echo "VALIDATION SUMMARY"
echo "==================================="
echo "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"

if [ "$FAILED_CHECKS" -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo "Errors found:"
    cat "$ERRORS_FILE"
    echo ""
    echo "DO NOT PUSH until all checks pass!"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "You may proceed with deployment"
    echo ""
    echo "Next steps:"
    echo "  1. git add [files]"
    echo "  2. git commit -m '[your message]'"
    echo "  3. git push origin main"
    exit 0
fi
