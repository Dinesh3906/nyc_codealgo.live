#!/bin/bash
set -e

echo "========================================="
echo "   STARTING PRODUCTION DEPLOYMENT        "
echo "   EC2 Server (Frontend & Backend)       "
echo "========================================="

PREV_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $PREV_COMMIT"

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
echo "Installing backend dependencies..."
cd backend
npm install --no-audit --no-fund --prefer-offline
echo "Installing frontend dependencies..."
cd ../frontend
npm install --no-audit --no-fund --prefer-offline
cd ..

echo "3. Building backend and frontend..."
echo "Building backend..."
cd backend
npm run build
echo "Building frontend (with memory limit)..."
cd ../frontend
NODE_OPTIONS="--max-old-space-size=2048" npm run build
cd ..

echo "4. Verifying build artifacts..."
if [ ! -d "backend/dist" ]; then
  echo "FATAL: Backend dist directory missing!"
  exit 1
fi
if [ ! -f "frontend/.next/BUILD_ID" ]; then
  echo "FATAL: Frontend BUILD_ID is missing! Build failed."
  exit 1
fi
echo "Build verification passed."

echo "5. Restarting services with PM2..."
pm2 startOrReload ecosystem.config.js --update-env

echo "6. Health checks..."
HEALTH_STATUS="failed"
for i in {1..15}; do
  BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health || echo "failed")
  FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || echo "failed")
  
  if [ "$BACKEND_CODE" = "200" ] && [ "$FRONTEND_CODE" != "failed" ] && [ "$FRONTEND_CODE" != "000" ]; then
    HEALTH_STATUS="200"
    break
  fi
  echo "Waiting for services to start (attempt $i/15, backend: $BACKEND_CODE, frontend: $FRONTEND_CODE)..."
  sleep 3
done
echo "Backend health: $HEALTH_STATUS"

if [ "$HEALTH_STATUS" != "200" ]; then
  echo "WARNING: Health checks failed! Check: pm2 logs"
  exit 1
fi

echo "========================================="
echo "   DEPLOYMENT SUCCESSFUL                 "
echo "========================================="
pm2 status
echo ""
echo "Frontend: https://nyccodes.codealgo.live (EC2)"
echo "Backend:  https://api.codealgo.live (EC2)"
