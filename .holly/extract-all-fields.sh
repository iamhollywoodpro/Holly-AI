#!/bin/bash
# Extract ALL fields used in code for ALL Prisma models

echo "Extracting ALL field usage from codebase..."
echo "============================================"
echo ""

# Get all files that use prisma
FILES=$(find app -name "*.ts" -exec grep -l "prisma\." {} \;)

# For each file, extract field names
for file in $FILES; do
    # Extract model.field patterns
    grep -o "prisma\.[a-zA-Z]*\.[a-zA-Z]*" "$file" | \
        sed 's/prisma\.//' | \
        awk -F'.' '{print $1}' | \
        sort -u
done | sort -u > /tmp/models-used.txt

echo "Models used in code:"
cat /tmp/models-used.txt
echo ""
echo "Extracting fields for each model..."
echo ""

# For each model, find all fields
while read model; do
    echo "=== $model ==="
    lowercase=$(echo "$model" | awk '{print tolower(substr($0,1,1))substr($0,2)}')
    
    # Find all field references in select, create, update statements
    grep -rh "prisma\.$lowercase\." app/ --include="*.ts" | \
        grep -oE "[a-zA-Z_]+: (true|[^,}]+)" | \
        awk -F':' '{print $1}' | \
        grep -v "^where$\|^data$\|^include$\|^select$\|^orderBy$\|^take$\|^skip$" | \
        sort -u
    echo ""
done < /tmp/models-used.txt
