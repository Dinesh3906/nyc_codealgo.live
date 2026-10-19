param (
    [string]$KeyPath = "C:\Users\chala\.ssh\cospace-teams-key.pem",
    [string]$User = "ubuntu",
    [string]$HostName = "api-permitiq.codealgo.live"
)

# Enable exit on error
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   ALL-IN-ONE GIT PUSH & EC2 DEPLOYMENT  "
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Stage modified files
Write-Host ""
Write-Host "1. Staging modified files..." -ForegroundColor Yellow
git add -u

# Step 2: Commit
Write-Host ""
Write-Host "2. Committing changes..." -ForegroundColor Yellow
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "deploy: security hardening updates ($date)" --allow-empty

# Step 3: Push
Write-Host ""
Write-Host "3. Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push origin main

# Step 4: EC2 Deployment
Write-Host ""
Write-Host "4. Connecting to EC2 ($HostName) via SSH..." -ForegroundColor Yellow
Write-Host "Using Key: $KeyPath" -ForegroundColor Gray

if (-not (Test-Path $KeyPath)) {
    Write-Error "SSH key file not found at $KeyPath. Please pass the correct path using -KeyPath."
} else {
    ssh -i $KeyPath "${User}@${HostName}" "cd ~/nyc_permitiq.codealgo.live && ./deploy_production.sh"
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMMANDS COMPLETED!        "
Write-Host "=========================================" -ForegroundColor Green
