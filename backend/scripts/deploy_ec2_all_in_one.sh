#!/bin/bash
# ==============================================================================
# 🚀 NYC COMPLIANCE ENGINE - ALL-IN-ONE EC2 DEPLOYMENT & FLUSH PLAYBOOK
# ==============================================================================
# This script sets up Node.js, PM2, MySQL client, runs database migrations, 
# flushes/clears all caches, logs, and temp files, and starts the system.
# ==============================================================================

set -e

echo "--------------------------------------------------"
echo "🔧 STEP 1: Updating System & Installing Dependencies"
echo "--------------------------------------------------"
sudo apt-get update -y
sudo apt-get install -y curl git build-essential mysql-client

# Install Node.js v20 LTS
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 process manager..."
    sudo npm install -g pm2
fi

echo "--------------------------------------------------"
echo "📂 STEP 2: Installing Project Dependencies"
echo "--------------------------------------------------"
npm install

echo "--------------------------------------------------"
echo "🧹 STEP 3: FLUSHING logs, database records, and temp files"
echo "--------------------------------------------------"
# Clear PM2 logs
pm2 flush || true

# Clear local temp uploaded files and evidence logs
rm -rf uploads/temp_pages/* || true
rm -rf scratch/evidence/* || true
mkdir -p uploads/temp_pages scratch/evidence

# Flush MySQL database tables (Truncates transaction, logs, audits tables)
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    echo "🗄️ Resetting transaction and history tables in RDS database ($DB_NAME)..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SET FOREIGN_KEY_CHECKS = 0;
        TRUNCATE TABLE audit_reports;
        TRUNCATE TABLE audit_steps;
        TRUNCATE TABLE plans;
        TRUNCATE TABLE jobs;
        TRUNCATE TABLE logs;
        SET FOREIGN_KEY_CHECKS = 1;
    " || echo "⚠️ Warning: Database flush skipped or failed (check RDS connection/credentials)."
else
    echo "⚠️ .env file not found, skipping database flush."
fi

echo "--------------------------------------------------"
echo "🏗️ STEP 4: Compiling TypeScript & Building Backend"
echo "--------------------------------------------------"
npm run build || npx tsc

echo "--------------------------------------------------"
echo "🚀 STEP 5: Starting Applications via PM2"
echo "--------------------------------------------------"
pm2 delete all || true
pm2 start dist/index.js --name "nyc-compliance-backend"

echo "--------------------------------------------------"
echo "✅ DEPLOYMENT & FLUSH COMPLETED SUCCESSFULLY!"
echo "--------------------------------------------------"
pm2 status
