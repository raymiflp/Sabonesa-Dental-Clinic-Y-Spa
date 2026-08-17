#!/usr/bin/env pwsh
# ============================================================
# Betty Dental - Stop Backend Server
# Kills all Node.js processes running the backend.
# ============================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "  Stopping Betty Dental backend..." -ForegroundColor Yellow

# Find and kill node processes running src/index.js
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object {
        try {
            $_.CommandLine -like "*src/index.js*" -or
            $_.CommandLine -like "*sistema-betty*"
        } catch { $false }
    }

if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "  Killing process PID $($proc.Id)..." -ForegroundColor Red
        Stop-Process -Id $proc.Id -Force
    }
    Write-Host "  Backend stopped ($($processes.Count) process(es) killed)" -ForegroundColor Green
} else {
    Write-Host "  No backend process found (already stopped)" -ForegroundColor DarkGray
}

Write-Host ""
