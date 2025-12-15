#!/bin/bash
set -e
cd ~/Holly-AI
echo "---------------------------------------"
echo "🔍 HOLLY BRAIN: STARTING SYSTEM AUDIT"
echo "---------------------------------------"
git pull origin main
echo "⚡ Running Full TypeScript Type-Check (4GB heap)..."
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit --pretty false
echo "✅ SUCCESS: TypeScript check passed."
echo "---------------------------------------"
