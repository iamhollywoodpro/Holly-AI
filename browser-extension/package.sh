#!/bin/bash
# Package the HOLLY browser extension for Chrome Web Store submission
# Usage: ./package.sh

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/holly-extension.zip"

echo "Packaging HOLLY browser extension..."
cd "$DIR"

# Verify required files exist
for f in manifest.json background.js content.js content.css popup.html popup.js; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Missing required file: $f"
    exit 1
  fi
done

# Verify icons exist
for f in icons/icon16.png icons/icon48.png icons/icon128.png; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Missing icon: $f"
    exit 1
  fi
done

# Create zip (exclude non-store files)
zip -r "$OUT" \
  manifest.json \
  background.js \
  content.js \
  content.css \
  popup.html \
  popup.js \
  popup.css \
  icons/ \
  -x "*.DS_Store" "icons/README.md"

SIZE=$(du -h "$OUT" | cut -f1)
echo ""
echo "Extension packaged: $OUT ($SIZE)"
echo "Upload this file to: https://chrome.google.com/webstore/devconsole"
