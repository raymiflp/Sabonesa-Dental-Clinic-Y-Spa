#!/usr/bin/env pwsh
# ============================================================
# Betty Dental - Local Server Startup
# Backend + Frontend served from a single server (port 3001).
# Run from the PROJECT ROOT directory.
# ============================================================
param(
    [switch]$Silent  # -Silent for Task Scheduler (no pause on error)
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$LogFile = Join-Path $BackendDir "server.log"
$MaxLogSize = 5MB

# --- Logging ---
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
    if ($Level -eq "ERROR") {
        Write-Host $line -ForegroundColor Red
    } elseif ($Level -eq "WARN") {
        Write-Host $line -ForegroundColor Yellow
    } else {
        Write-Host $line -ForegroundColor Cyan
    }
}

# Rotate log if too large
if (Test-Path $LogFile) {
    $logSize = (Get-Item $LogFile).Length
    if ($logSize -gt $MaxLogSize) {
        $backup = "$LogFile.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
        Move-Item $LogFile $backup -Force -ErrorAction SilentlyContinue
        Write-Log "Log rotated (was $([math]::Round($logSize/1KB))KB)"
    }
}

Clear-Host
Write-Host ""
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host "    Betty Dental - Local Server" -ForegroundColor Magenta
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host ""

Write-Log "Starting Betty Dental..."
Write-Log "Project root: $ProjectRoot"

# === Step 1: Check Node.js ===
Write-Log "Step 1/8: Checking Node.js..."
try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Node not found" }
    Write-Log "Node.js found: $nodeVersion"
} catch {
    Write-Log "Node.js is NOT installed." "ERROR"
    Write-Log "Download from https://nodejs.org/ (v20+ required)" "ERROR"
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit 1
}

# === Step 2: Check/create .env ===
Write-Log "Step 2/8: Checking .env configuration..."
$envFile = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.ejemplo"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Log ".env created from .env.ejemplo"
    } else {
        @"
DATABASE_URL="file:./dev.db"
JWT_SECRET="betty-dev-secret"
CORS_ORIGIN=*
SKIP_RATE_LIMIT=true
"@ | Set-Content -Path $envFile -Encoding UTF8
        Write-Log ".env created with default values"
    }
} else {
    Write-Log ".env already exists"
}

# === Step 3: Install backend dependencies ===
Write-Log "Step 3/8: Installing backend dependencies..."
Set-Location $BackendDir

if (-not (Test-Path "node_modules")) {
    Write-Log "Running npm install (backend)..."
    & npm install 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Backend npm install failed" "ERROR"
        exit 1
    }
    Write-Log "Backend dependencies installed"
} else {
    Write-Log "Backend node_modules exists, skipping"
}

# === Step 4: Install frontend dependencies ===
Write-Log "Step 4/8: Installing frontend dependencies..."
Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Log "Running npm install (frontend)..."
    & npm install 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Frontend npm install failed" "ERROR"
        exit 1
    }
    Write-Log "Frontend dependencies installed"
} else {
    Write-Log "Frontend node_modules exists, skipping"
}

# === Step 5: Generate Prisma Client + push DB ===
Write-Log "Step 5/8: Setting up database..."
Set-Location $BackendDir

& npx prisma generate 2>&1 | ForEach-Object { Write-Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Log "prisma generate failed, retrying..." "WARN"
    & npm install 2>&1 | Out-Null
    & npx prisma generate 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "prisma generate failed" "ERROR"
        exit 1
    }
}

& npx prisma db push 2>&1 | ForEach-Object { Write-Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Log "Retrying with --accept-data-loss..."
    & npx prisma db push --accept-data-loss 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Database push failed" "ERROR"
        exit 1
    }
}
Write-Log "Database synced"

# === Step 6: Seed if needed ===
Write-Log "Step 6/8: Checking seed..."
$dbFile = Join-Path $BackendDir "prisma\dev.db"
$dbExists = (Test-Path $dbFile) -and (Get-Item $dbFile).Length -gt 10KB
if ($dbExists) {
    Write-Log "Database has data, skipping seed"
} else {
    Write-Log "Seeding database..."
    & node prisma/seed.js 2>&1 | ForEach-Object { Write-Log "  $_" }
    Write-Log "Seed completed"
}

# === Step 7: Build frontend ===
Write-Log "Step 7/8: Building frontend..."
Set-Location $FrontendDir

$distDir = Join-Path $FrontendDir "dist"
$needsBuild = $true

if (Test-Path $distDir) {
    $distIndex = Join-Path $distDir "index.html"
    if (Test-Path $distIndex) {
        $distAge = (Get-Date) - (Get-Item $distIndex).LastWriteTime
        if ($distAge.TotalHours -lt 24) {
            $needsBuild = $false
            Write-Log "Frontend dist is recent ($([math]::Round($distAge.TotalMinutes))min old), skipping build"
        }
    }
}

if ($needsBuild) {
    Write-Log "Building frontend (npm run build)..."
    & npm run build 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Frontend build failed" "ERROR"
        exit 1
    }
    Write-Log "Frontend built successfully"
}

# === Step 8: Start server ===
Write-Log "Step 8/8: Starting server..."
Set-Location $BackendDir

# Get local IP
$localIP = "localhost"
try {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.InterfaceAlias -notlike "*Loopback*" -and
        $_.IPAddress -ne "127.0.0.1" -and
        $_.PrefixOrigin -ne "WellKnown"
    }
    if ($adapters) {
        $localIP = ($adapters | Select-Object -First 1).IPAddress
    }
} catch {
    Write-Log "Could not detect local IP" "WARN"
}

Write-Host ""
Write-Host "  =========================================" -ForegroundColor Green
Write-Host "    Betty Dental is running!" -ForegroundColor Green
Write-Host "  =========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local:   http://localhost:3001" -ForegroundColor White
Write-Host "  Network: http://${localIP}:3001" -ForegroundColor White
Write-Host ""
Write-Host "  Abre ese enlace en cualquier navegador" -ForegroundColor Yellow
Write-Host "  en la misma red WiFi de la clinica." -ForegroundColor Yellow
Write-Host ""
Write-Log "Server: http://${localIP}:3001"
Write-Log "Log: $LogFile"
Write-Host "  Ctrl+C para detener" -ForegroundColor DarkGray
Write-Host ""

# Start server (runs until Ctrl+C)
& node src/index.js 2>&1 | ForEach-Object {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $_"
    Add-Content -Path $LogFile -Value "[$ts] $_" -ErrorAction SilentlyContinue
}

Write-Log "Server stopped"
