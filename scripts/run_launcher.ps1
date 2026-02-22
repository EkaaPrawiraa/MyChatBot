$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot ".."))
$launcherDir = Join-Path $rootDir "launcher"

Write-Host "Starting Axis Assistant Launcher…"
Write-Host "It will open a browser at http://127.0.0.1:4187"
Write-Host ""

Start-Process -FilePath "go" -ArgumentList @("run", ".") -WorkingDirectory $launcherDir

Start-Sleep -Seconds 1
Start-Process "http://127.0.0.1:4187"
