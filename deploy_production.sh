#!/bin/bash
set -e

echo "========================================="
echo "   BACKEND-ONLY DEPLOYMENT (EC2)         "
echo "   Frontend is hosted on Vercel          "
echo "========================================="

PREV_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $PREV_COMMIT"

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing backend dependencies..."
cd backend
npm install --no-audit --no-fund --prefer-offline
cd ..

echo "3. Building backend..."
cd backend
npm run build
cd ..

echo "4. Verifying backend build..."
if [ ! -d "backend/dist" ]; then
  echo "FATAL: Backend dist directory missing!"
  exit 1
fi
echo "Backend build OK."

echo "5. Stopping old frontend process (if any)..."
pm2 delete nyc-frontend 2>/dev/null || true

echo "6. Restarting backend with PM2..."
pm2 startOrReload ecosystem.config.js --update-env

echo "7. Health check..."
HEALTH_STATUS="failed"
for i in {1..12}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health || echo "failed")
  if [ "$STATUS" = "200" ]; then
    HEALTH_STATUS="200"
    break
  fi
  echo "Waiting for backend to start (attempt $i/12, status: $STATUS)..."
  sleep 2
done
echo "Backend health: $HEALTH_STATUS"

if [ "$HEALTH_STATUS" != "200" ]; then
  echo "WARNING: Health check failed! Check: pm2 logs nyc-backend --lines 20"
  exit 1
fi

echo "========================================="
echo "   DEPLOYMENT SUCCESSFUL                 "
echo "========================================="
pm2 status
echo ""
echo "Frontend: https://permitiq.codealgo.live (Vercel)"
echo "Backend:  https://api-permitiq.codealgo.live (EC2)"
