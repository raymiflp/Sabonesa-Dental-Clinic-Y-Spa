#!/usr/bin/env pwsh
# ============================================================
# Betty Dental - Install Auto-Start
# Registers a Windows Task Scheduler task to start the
# backend server automatically at user login.
# Run this script ONCE on the target machine.
# ============================================================

$ErrorActionPreference = "Stop"
$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName = "BettyDental-Backend"
$ScriptPath = Join-Path $BackendDir "start-local.ps1"

Clear-Host
Write-Host ""
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host "    Betty Dental - Install Auto-Start" -ForegroundColor Magenta
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host ""

# Verify start-local.ps1 exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "  ERROR: start-local.ps1 not found at:" -ForegroundColor Red
    Write-Host "  $ScriptPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Remove existing task if any
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  Removing existing task '$TaskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the action: run start-local.ps1 with bypass policy
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$ScriptPath`"" `
    -WorkingDirectory $BackendDir

# Trigger: at user logon
$trigger = New-ScheduledTaskTrigger -AtLogon -User $env:USERNAME

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)  # No time limit

# Principal: run as current user, normal priority
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Register the task
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Betty Dental Clinic - Backend server. Starts automatically at login."

Write-Host ""
Write-Host "  =========================================" -ForegroundColor Green
Write-Host "    Auto-start installed successfully!" -ForegroundColor Green
Write-Host "  =========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Task name:     $TaskName" -ForegroundColor White
Write-Host "  Trigger:       At user login" -ForegroundColor White
Write-Host "  Script:        $ScriptPath" -ForegroundColor White
Write-Host "  Restart:       Up to 3 times if it crashes" -ForegroundColor White
Write-Host ""
Write-Host "  The server will start automatically the next time" -ForegroundColor Cyan
Write-Host "  you log into Windows." -ForegroundColor Cyan
Write-Host ""
Write-Host "  To test NOW:  .\start-local.ps1" -ForegroundColor Yellow
Write-Host "  To remove:    .\uninstall-autostart.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
