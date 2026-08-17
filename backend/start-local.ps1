#!/usr/bin/env pwsh
# ============================================================
# Betty Dental - Backend Local Startup
# Installs dependencies, sets up DB, and starts the server.
# Run manually or via Task Scheduler at login.
# ============================================================
param(
    [switch]$Silent  # -Silent for Task Scheduler (no pause on error)
)

$ErrorActionPreference = "Continue"
$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
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
Write-Host "    Betty Dental - Backend Local Server" -ForegroundColor Magenta
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host ""

Write-Log "Starting Betty Dental backend..."
Write-Log "Backend directory: $BackendDir"

# --- Step 1: Check Node.js ---
Write-Log "Step 1/6: Checking Node.js..."
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

# --- Step 2: Check/create .env ---
Write-Log "Step 2/7: Checking .env configuration..."
$envFile = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.ejemplo"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Log ".env created from .env.ejemplo"
    } else {
        # Generate minimal .env
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

# --- Step 3: Install dependencies ---
Write-Log "Step 3/7: Installing dependencies..."
Set-Location $BackendDir

if (-not (Test-Path "node_modules")) {
    Write-Log "node_modules not found, running npm install..."
    & npm install 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "npm install failed" "ERROR"
        if (-not $Silent) {
            Write-Host "Press any key to exit..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        exit 1
    }
    Write-Log "Dependencies installed"
} else {
    Write-Log "node_modules exists, skipping install"
}

# --- Step 4: Generate Prisma Client ---
Write-Log "Step 4/7: Generating Prisma Client..."
& npx prisma generate 2>&1 | ForEach-Object { Write-Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Log "prisma generate failed, attempting npm install first..."
    & npm install 2>&1 | Out-Null
    & npx prisma generate 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "prisma generate failed after retry" "ERROR"
        exit 1
    }
}
Write-Log "Prisma Client generated"

# --- Step 5: Push database schema ---
Write-Log "Step 5/7: Syncing database schema..."
& npx prisma db push 2>&1 | ForEach-Object { Write-Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Log "prisma db push failed, trying with --accept-data-loss..."
    & npx prisma db push --accept-data-loss 2>&1 | ForEach-Object { Write-Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Database push failed" "ERROR"
        exit 1
    }
}
Write-Log "Database schema synced"

# --- Step 6: Seed database if empty ---
Write-Log "Step 6/7: Checking if seed is needed..."
$dbFile = Join-Path $BackendDir "prisma\dev.db"
$dbExists = (Test-Path $dbFile) -and (Get-Item $dbFile).Length -gt 10KB
if ($dbExists) {
    Write-Log "Database file exists and has data, skipping seed"
} else {
    Write-Log "Database is empty or missing, running seed..."
    & node prisma/seed.js 2>&1 | ForEach-Object { Write-Log "  $_" }
    Write-Log "Seed completed"
}

# --- Step 7: Get local IP and start server ---
Write-Log "Step 7/7: Starting server..."

# Get local IP address
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
    Write-Log "Could not detect local IP, using localhost" "WARN"
}

Write-Host ""
Write-Host "  =========================================" -ForegroundColor Green
Write-Host "    Server starting on port 3001..." -ForegroundColor Green
Write-Host "  =========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local:   http://localhost:3001" -ForegroundColor White
Write-Host "  Network: http://${localIP}:3001" -ForegroundColor White
Write-Host ""
Write-Host "  Frontend VITE_API_URL = http://${localIP}:3001" -ForegroundColor Yellow
Write-Host ""
Write-Log "Server starting on http://${localIP}:3001"
Write-Log "Log file: $LogFile"
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor DarkGray
Write-Host ""

# Start server (keeps running until Ctrl+C)
& node src/index.js 2>&1 | ForEach-Object {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $_"
    Add-Content -Path $LogFile -Value "[$ts] $_" -ErrorAction SilentlyContinue
}

# Server stopped
Write-Log "Server stopped"
