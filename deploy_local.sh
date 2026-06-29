#!/bin/bash
# =========================================
# LOCAL DEPLOY SCRIPT
# Run this from your LOCAL machine (Windows Git Bash / WSL)
# It builds frontend locally, uploads to EC2, and deploys
# =========================================
set -e

# Configuration - UPDATE THESE
EC2_KEY="C:/Users/chala/Downloads/reel_it_up.pem"
EC2_USER="ubuntu"
EC2_HOST="13.60.255.60"
EC2_APP_DIR="~/nyc_codealgo.live"

echo "========================================="
echo "   LOCAL BUILD + REMOTE DEPLOY           "
echo "========================================="

# Step 1: Build frontend locally
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

# Step 2: Push code to GitHub
echo ""
echo "2. Pushing latest code to GitHub..."
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" --allow-empty
git push origin main

# Step 3: Upload .next build to server
echo ""
echo "3. Uploading frontend build to EC2..."
# Remove old build on server first
ssh -o StrictHostKeyChecking=no -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "rm -rf $EC2_APP_DIR/frontend/.next"
# Upload new build
scp -o StrictHostKeyChecking=no -r -i "$EC2_KEY" frontend/.next "$EC2_USER@$EC2_HOST:$EC2_APP_DIR/frontend/"
echo "Upload complete."

# Step 4: Run server-side deploy (pull code + build backend + restart PM2)
echo ""
echo "4. Running server-side deployment..."
ssh -o StrictHostKeyChecking=no -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_APP_DIR && chmod +x deploy_production.sh && ./deploy_production.sh"

echo ""
echo "========================================="
echo "   DEPLOYMENT COMPLETE!                  "
echo "========================================="
echo "Site: https://codealgo.live"
