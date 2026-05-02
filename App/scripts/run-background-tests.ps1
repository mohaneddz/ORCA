param()

$ErrorActionPreference = "Continue"

$appRoot = Split-Path -Parent $PSScriptRoot
$logsRoot = Join-Path $appRoot "logs"
$dumpDir = Join-Path $logsRoot "dump"
$desktopDir = Join-Path $logsRoot "desktop"
$rawDir = Join-Path $logsRoot "raw"

New-Item -ItemType Directory -Force $dumpDir | Out-Null
New-Item -ItemType Directory -Force $desktopDir | Out-Null
New-Item -ItemType Directory -Force $rawDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$frontendLog = Join-Path $dumpDir ("frontend-tests-" + $stamp + ".log")
$backendLog = Join-Path $dumpDir ("backend-tests-" + $stamp + ".log")
$snapshotLog = Join-Path $dumpDir ("snapshot-" + $stamp + ".log")

$frontendExit = 0
$backendExit = 0
$snapshotExit = 0

Push-Location $appRoot
try {
  & cmd /c "pnpm test" *>&1 | Tee-Object -FilePath $frontendLog
  $frontendExit = $LASTEXITCODE
} finally {
  Pop-Location
}

Push-Location (Join-Path $appRoot "src-tauri")
try {
  & cmd /c "cargo test" *>&1 | Tee-Object -FilePath $backendLog
  $backendExit = $LASTEXITCODE

  & cmd /c "cargo run --quiet --bin posture_snapshot -- --out ../logs/desktop" *>&1 | Tee-Object -FilePath $snapshotLog
  $snapshotExit = $LASTEXITCODE
} finally {
  Pop-Location
}

Write-Host "Frontend log: $frontendLog"
Write-Host "Backend log: $backendLog"
Write-Host "Snapshot log: $snapshotLog"
Write-Host "Desktop dir: $desktopDir"
Write-Host "Raw dir: $rawDir"

if ($frontendExit -ne 0 -or $backendExit -ne 0 -or $snapshotExit -ne 0) {
  exit 1
}

exit 0
