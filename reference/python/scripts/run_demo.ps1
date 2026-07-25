# SENTINEL demo launcher (Windows PowerShell)
# Starts the Atlas Payments service (port 8000, hot-reload) and the SENTINEL
# control plane (port 8100), then opens the dashboard.

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "◉ SENTINEL demo starting..." -ForegroundColor Cyan

# 1. Atlas Payments — the service under watch (reload picks up deployed fixes)
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root\service'; python -m uvicorn app.main:app --port 8000 --reload"
)

Start-Sleep -Seconds 2

# 2. SENTINEL control plane + dashboard
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root'; python -m sentinel"
)

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8100"
Write-Host "Dashboard: http://127.0.0.1:8100" -ForegroundColor Green
