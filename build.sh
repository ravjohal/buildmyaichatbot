#!/bin/bash
set -e

echo "=== PRODUCTION BUILD SCRIPT ==="
echo ""
echo "Step 1/2: Building frontend with Vite..."
npx vite build
echo "✓ Frontend built"
echo ""

echo "Step 2/2: Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo "✓ Backend built"
echo ""

echo "=== BUILD COMPLETE ==="
echo "Production build ready in dist/"
echo "Note: Using system Chromium from Nix (replit.nix) for website crawling"
