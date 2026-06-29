#!/bin/bash
set -e

echo "========================================="
echo "   STARTING PRODUCTION DEPLOYMENT        "
echo "========================================="

# Save current git commit hash for rollback fallback
PREV_COMMIT=$(git rev-parse HEAD)
echo "Current commit hash before pull: $PREV_COMMIT"

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
echo "Installing backend dependencies..."
cd backend
npm ci
echo "Installing frontend dependencies..."
cd ../frontend
npm ci
cd ..

echo "3. Building backend..."
cd backend
npm run build
cd ..

echo "4. Building frontend (with memory limit)..."
cd frontend
NODE_OPTIONS="--max-old-space-size=512" npm run build
cd ..

echo "5. Verifying build artifacts..."
if [ ! -f "frontend/.next/BUILD_ID" ]; then
  echo "FATAL: Frontend BUILD_ID is missing! Build failed."
  exit 1
fi
if [ ! -d "backend/dist" ]; then
  echo "FATAL: Backend dist directory is missing! Build failed."
  exit 1
fi
echo "Build verification passed."

echo "6. Restarting services with PM2 ecosystem config..."
pm2 startOrReload ecosystem.config.js --update-env

# Wait 5 seconds for services to boot up
echo "Waiting 5 seconds for services to boot up..."
sleep 5

echo "7. Running production health checks..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "failed")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health/frontend || echo "failed")

echo "Backend Health Code: $HEALTH_STATUS"
echo "Frontend Health Code: $FRONTEND_STATUS"

if [ "$HEALTH_STATUS" != "200" ] || [ "$FRONTEND_STATUS" != "200" ]; then
  echo "WARNING: Health checks failed! Rolling back to commit $PREV_COMMIT..."
  
  # Rollback steps
  git reset --hard $PREV_COMMIT
  
  # Rebuild previous state
  cd backend
  npm ci && npm run build
  cd ../frontend
  npm ci && NODE_OPTIONS="--max-old-space-size=512" npm run build
  cd ..
  
  # Restart previous working state
  pm2 startOrReload ecosystem.config.js --update-env
  
  echo "Rollback completed. Restored previous stable version."
  exit 1
else
  echo "========================================="
  echo "   DEPLOYMENT COMPLETED SUCCESSFULLY     "
  echo "========================================="
fi
