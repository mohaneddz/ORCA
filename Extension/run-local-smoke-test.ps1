$ErrorActionPreference = "Stop"

$mockPort = 8010
$mockBaseUrl = "http://127.0.0.1:$mockPort"

Write-Host "Starting mock backend on $mockBaseUrl ..."
$proc = Start-Process -FilePath powershell -ArgumentList @(
  "-NoProfile",
  "-Command",
  "`$env:MOCK_PORT='$mockPort'; node mock-backend.js"
) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 2

try {
  Write-Host "Running API integration checks..."
  $env:MOCK_BASE_URL = $mockBaseUrl
  node "$PSScriptRoot/test-mock-backend.js"

  Write-Host ""
  Write-Host "Smoke test complete."
  Write-Host "Manual upload lab URL: $mockBaseUrl/dev/upload-lab"
  Write-Host ""
  Write-Host "Manual validation checklist:"
  Write-Host "1) Load unpacked extension from the Extension folder."
  Write-Host "2) Open popup, set emp_id to EMP001."
  Write-Host "3) Open upload lab URL above."
  Write-Host "4) Upload benign file (e.g. notes.txt) -> no warning expected."
  Write-Host "5) Upload sensitive file (e.g. payroll_confidential.txt) -> warning expected."
  Write-Host "6) Choose Cancel and Force in separate attempts."
  Write-Host "7) Check logs: $mockBaseUrl/dev/logs"
}
finally {
  Remove-Item Env:MOCK_BASE_URL -ErrorAction SilentlyContinue
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
