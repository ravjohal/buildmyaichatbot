#!/bin/bash
set -e

echo "=== PRODUCTION BUILD SCRIPT ==="
echo ""
echo "Step 1/3: Installing Playwright browsers..."
npx playwright install chromium --with-deps
echo "✓ Playwright Chromium installed"
echo ""

echo "Step 2/3: Building frontend with Vite..."
npx vite build
echo "✓ Frontend built"
echo ""

echo "Step 3/3: Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo "✓ Backend built"
echo ""

echo "=== BUILD COMPLETE ==="
echo "Production build ready in dist/"
echo "Playwright Chromium ready for website crawling"
