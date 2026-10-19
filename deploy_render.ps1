param (
    [string]$CommitMessage = "deploy: migrate infrastructure to Render",
    [string]$BackendDeployHook = "",
    [string]$FrontendDeployHook = ""
)

# Enable exit on error
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       PERMITIQ RENDER DEPLOYMENT        " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Stage modified files
Write-Host ""
Write-Host "1. Staging modified & tracked files..." -ForegroundColor Yellow
git add -u
git add render.yaml deploy_render.ps1 RENDER_DEPLOYMENT_GUIDE.md

# Step 2: Commit
Write-Host ""
Write-Host "2. Committing changes..." -ForegroundColor Yellow
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "${CommitMessage} (${date})" --allow-empty

# Step 3: Push to GitHub (Triggers Render Auto-Deploy)
Write-Host ""
Write-Host "3. Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push origin main

# Step 4: Optional Webhook Trigger
if ($BackendDeployHook -ne "") {
    Write-Host ""
    Write-Host "4. Triggering Backend Render Deploy Hook..." -ForegroundColor Yellow
    try {
        $res = Invoke-RestMethod -Uri $BackendDeployHook -Method Post
        Write-Host "Backend deploy triggered successfully: $res" -ForegroundColor Green
    } catch {
        Write-Warning "Could not trigger Backend deploy hook: $_"
    }
}

if ($FrontendDeployHook -ne "") {
    Write-Host ""
    Write-Host "5. Triggering Frontend Render Deploy Hook..." -ForegroundColor Yellow
    try {
        $res = Invoke-RestMethod -Uri $FrontendDeployHook -Method Post
        Write-Host "Frontend deploy triggered successfully: $res" -ForegroundColor Green
    } catch {
        Write-Warning "Could not trigger Frontend deploy hook: $_"
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   CODE PUSHED TO GITHUB SUCCESSFULLY!   " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Render auto-deploy is now building the latest commit."
Write-Host "Monitor your deployment in your Render dashboard:"
Write-Host "  -> https://dashboard.render.com"
Write-Host ""
Write-Host "Configured Services:"
Write-Host "  - Backend API:  https://permitiq-api.onrender.com"
Write-Host "  - Frontend Web: https://permitiq-web.onrender.com"
Write-Host "=========================================" -ForegroundColor Cyan
