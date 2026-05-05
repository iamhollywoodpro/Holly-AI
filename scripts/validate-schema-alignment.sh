#!/bin/bash
echo "=========================================="
echo "AUTOMATED SCHEMA ALIGNMENT VALIDATOR"
echo "=========================================="
echo ""

ERRORS_FOUND=0

# Step 1: Extract all models
echo "Step 1: Extracting all Prisma models..."
MODELS=$(grep "^model " prisma/schema.prisma | awk '{print $2}')
MODEL_COUNT=$(echo "$MODELS" | wc -w)
echo "Found $MODEL_COUNT models"
echo ""

# Step 2: For each model, check code usage vs schema fields
echo "Step 2: Validating each model..."
echo ""

for MODEL in $MODELS; do
  MODEL_LOWER=$(echo "$MODEL" | awk '{print tolower($0)}')
  
  # Get schema fields for this model
  SCHEMA_FIELDS=$(grep -A 100 "^model $MODEL {" prisma/schema.prisma | grep -E "^\s+[a-zA-Z]+" | awk '{print $1}' | head -50)
  
  # Find all code files using this model
  FILES=$(grep -r "prisma\.$MODEL_LOWER\." app/api --include="*.ts" -l 2>/dev/null)
  
  if [ ! -z "$FILES" ]; then
    echo "Checking $MODEL..."
    
    # For each file, extract field accesses
    for FILE in $FILES; do
      # Look for patterns like: act.fieldName or object.fieldName after prisma query
      FIELD_ACCESSES=$(grep -oP "\\.$MODEL_LOWER\\.\\w+|\w+\\.(\\w+)" "$FILE" 2>/dev/null | grep -oP "\\.\\K\\w+" | sort -u)
      
      for FIELD in $FIELD_ACCESSES; do
        # Check if field exists in schema
        if ! echo "$SCHEMA_FIELDS" | grep -q "^$FIELD$"; then
          # Check if it's a common false positive (HTTP status, etc.)
          if [[ ! "$FIELD" =~ ^(status|error|success|data)$ ]]; then
            echo "  ❌ POTENTIAL MISMATCH: $MODEL.$FIELD in $FILE"
            ERRORS_FOUND=$((ERRORS_FOUND + 1))
          fi
        fi
      done
    done
  fi
done

echo ""
echo "=========================================="
echo "VALIDATION COMPLETE"
echo "Potential mismatches found: $ERRORS_FOUND"
echo "=========================================="

if [ "$ERRORS_FOUND" -gt 0 ]; then
  echo ""
  echo "⚠️  Note: Some matches may be false positives (response objects, etc.)"
  echo "Review each one manually to confirm if it's a real schema issue."
  exit 1
else
  echo ""
  echo "✅ All models appear aligned with schema!"
  exit 0
fi
