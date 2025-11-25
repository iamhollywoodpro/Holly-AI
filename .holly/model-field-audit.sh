#!/bin/bash
# Model Field Audit Script
# Compares fields used in code vs fields defined in schema

echo "🔍 HOLLY Model Field Audit"
echo "=========================="
echo ""

# Function to get fields from schema for a model
get_schema_fields() {
    local model=$1
    grep -A 50 "^model $model {" prisma/schema.prisma | \
        grep "^\s\+[a-zA-Z]" | \
        awk '{print $1}' | \
        grep -v "^@@" | \
        sort
}

# Function to get fields used in code for a model
get_code_fields() {
    local model=$1
    local lowercase=$(echo "$model" | awk '{print tolower(substr($0,1,1))substr($0,2)}')
    
    find app -name "*.ts" -exec grep -h "prisma\.$lowercase\.\(create\|update\|findMany\|findUnique\)" -A 20 {} \; | \
        grep -E "^\s+[a-zA-Z_]+:" | \
        sed 's/://g' | \
        awk '{print $1}' | \
        grep -v "^where$\|^data$\|^include$\|^select$\|^orderBy$\|^take$" | \
        sort -u
}

# Models to check
MODELS="HollyExperience HollyGoal HollyIdentity ConversationSummary GitHubConnection GitHubRepository GoogleDriveConnection"

for model in $MODELS; do
    echo "📋 Checking $model"
    echo "-------------------"
    
    schema_fields=$(get_schema_fields "$model")
    code_fields=$(get_code_fields "$model")
    
    if [ -z "$schema_fields" ]; then
        echo "❌ Model not found in schema!"
    elif [ -z "$code_fields" ]; then
        echo "✅ No code references found (model may be unused)"
    else
        echo "Schema fields:"
        echo "$schema_fields" | sed 's/^/  /'
        echo ""
        echo "Code expects:"
        echo "$code_fields" | sed 's/^/  /'
        echo ""
        
        # Find missing fields
        missing=$(comm -13 <(echo "$schema_fields") <(echo "$code_fields"))
        if [ ! -z "$missing" ]; then
            echo "❌ MISSING IN SCHEMA:"
            echo "$missing" | sed 's/^/  - /'
        else
            echo "✅ All fields present"
        fi
    fi
    echo ""
done
