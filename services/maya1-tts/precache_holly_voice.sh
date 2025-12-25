#!/bin/bash
# Pre-cache HOLLY's most common phrases for instant playback
# Run this once to warm up the cache (takes ~5-10 minutes)

API_URL="https://mrleaf81-holly-tts-maya.hf.space"

echo "🚀 Pre-caching HOLLY's voice - Top 10 phrases"
echo "=============================================="
echo ""

declare -a phrases=(
    "Hello Hollywood!"
    "I'm ready to help!"
    "Task complete!"
    "Got it!"
    "<excited>Great job, Hollywood!</excited>"
    "Working on it now..."
    "Let me check that for you."
    "All done!"
    "<happy>Perfect!</happy>"
    "Anything else I can help with?"
)

total=${#phrases[@]}
current=0

for phrase in "${phrases[@]}"; do
    current=$((current + 1))
    echo "[$current/$total] Caching: $phrase"
    
    curl -X POST "$API_URL/generate" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$phrase\"}" \
        -o /dev/null \
        -s \
        -w "        Status: %{http_code} | Time: %{time_total}s\n"
    
    echo ""
    sleep 2  # Brief pause between requests
done

echo "=============================================="
echo "✅ Cache pre-warming complete!"
echo ""
echo "📊 Checking cache stats..."
curl -s "$API_URL/cache/stats" | python3 -m json.tool
echo ""
echo "🎉 HOLLY's voice is now INSTANT for these phrases!"
echo "   Future uses will be <0.1s instead of 20-30s"
