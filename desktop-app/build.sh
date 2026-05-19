#!/bin/bash
# Build HOLLY Desktop App
# Usage: ./build.sh [mac|win|linux|all]

set -e

PLATFORM="${1:-mac}"
echo "Building HOLLY Desktop App for: $PLATFORM"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is required. Install from https://nodejs.org"
  exit 1
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build
case "$PLATFORM" in
  mac)
    echo "Building for macOS..."
    npm run build:mac
    echo ""
    echo "Installer created in: dist/"
    echo "Open dist/ and run the .dmg file to install"
    ;;
  win)
    echo "Building for Windows..."
    npm run build:win
    echo ""
    echo "Installer created in: dist/"
    ;;
  linux)
    echo "Building for Linux..."
    npm run build:linux
    echo ""
    echo "AppImage created in: dist/"
    ;;
  all)
    echo "Building for all platforms..."
    npm run build
    echo ""
    echo "Installers created in: dist/"
    ;;
  *)
    echo "Usage: ./build.sh [mac|win|linux|all]"
    exit 1
    ;;
esac

echo ""
echo "Build complete!"
