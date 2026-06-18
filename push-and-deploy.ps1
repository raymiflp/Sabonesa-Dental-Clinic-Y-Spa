#!/usr/bin/env pwsh
# Push to GitHub and trigger Railway deploy in one command.
# Usage: .\push-and-deploy.ps1 ["commit message"]
#
# Railway doesn't auto-deploy from GitHub on this project,
# so we have to trigger it manually after every push.

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = Read-Host "Commit message"
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    Write-Error "Commit message is required."
    exit 1
}

Write-Host "[1/4] Checking git status..." -ForegroundColor Cyan
$status = git status --short
if ($status) {
    Write-Host "Changes detected. Staging all..." -ForegroundColor Yellow
    git add -A
}

Write-Host "[2/4] Committing..." -ForegroundColor Cyan
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nothing to commit or commit failed. Continuing with push..." -ForegroundColor Yellow
}

Write-Host "[3/4] Pushing to GitHub..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git push failed."
    exit 1
}

Write-Host "[4/4] Triggering Railway deploy..." -ForegroundColor Cyan
railway up --service amusing-fulfillment
if ($LASTEXITCODE -ne 0) {
    Write-Error "Railway deploy failed."
    exit 1
}

Write-Host ""
Write-Host "Done! Check status with: railway status" -ForegroundColor Green
Write-Host "Check logs with: railway logs --latest --lines 50" -ForegroundColor Green