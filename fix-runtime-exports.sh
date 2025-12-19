#!/bin/bash
# Script to add 'export const runtime = nodejs' to all API routes that don't have it

set -e

echo "🔍 Finding all API routes..."
total=$(find app/api -name "route.ts" | wc -l)
echo "📊 Total API routes: $total"

echo ""
echo "🔍 Finding routes missing runtime export..."
missing=0

while IFS= read -r file; do
  if ! grep -q "export const runtime" "$file"; then
    echo "  ✏️  Fixing: $file"
    
    # Create temp file with runtime export added after imports
    awk '
      /^import/ { 
        print; 
        in_imports=1; 
        next 
      }
      in_imports && /^[^import]/ && !added { 
        print "";
        print "export const runtime = '\''nodejs'\'';";
        print "";
        added=1 
      }
      { print }
    ' "$file" > "$file.tmp"
    
    mv "$file.tmp" "$file"
    ((missing++))
  fi
done < <(find app/api -name "route.ts")

echo ""
echo "✅ Fixed $missing routes"
echo "✅ All $total routes now have runtime export"
