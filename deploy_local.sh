#!/bin/bash
# =========================================
# LOCAL DEPLOY SCRIPT
# Run this from your LOCAL machine (Windows Git Bash / WSL)
# It builds frontend locally, uploads to EC2, and deploys
# =========================================
set -e

# Configuration
echo "========================================="
echo "   LOCAL BUILD + VERCEL DEPLOY           "
echo "========================================="

# Step 1: Build frontend locally (verifies build compatibility)
echo ""
echo "1. Building frontend locally..."
cd frontend
npm run build
cd ..

if [ ! -f "frontend/.next/BUILD_ID" ]; then
  echo "FATAL: Frontend build failed - no BUILD_ID"
  exit 1
fi
echo "Frontend built successfully: $(cat frontend/.next/BUILD_ID)"

# Step 2: Push code to GitHub (Triggers Vercel deploy)
echo ""
echo "2. Pushing latest code to GitHub..."
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" --allow-empty
git push origin main

echo ""
echo "========================================="
echo "   VERCEL DEPLOY TRIGGERED SUCCESSFULLY  "
echo "========================================="
echo "Site: https://nyccodes.permitiq.live"
echo ""
echo "👉 FINAL STEP: To update the backend on EC2, run this in your EC2 terminal session:"
echo "   cd ~/nyc_permitiq.live && ./deploy_production.sh"
echo "========================================="
