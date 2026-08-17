#!/usr/bin/env pwsh
# ============================================================
# Betty Dental - Uninstall Auto-Start
# Removes the Windows Task Scheduler task.
# ============================================================

$TaskName = "BettyDental-Backend"

Write-Host ""
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Auto-start task removed." -ForegroundColor Green
} else {
    Write-Host "  No auto-start task found." -ForegroundColor DarkGray
}
Write-Host ""
