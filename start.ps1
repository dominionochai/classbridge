$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
$Frontend = Join-Path $Root "frontend"

if (-not (Test-Path $VenvPython)) {
    throw "Virtual environment not found. Run .\setup.ps1 first."
}

$BackendProcess = Start-Process `
    -FilePath $VenvPython `
    -ArgumentList @("-m", "uvicorn", "backend.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $Root `
    -PassThru

$FrontendProcess = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $Frontend `
    -PassThru

Write-Host "Backend PID: $($BackendProcess.Id) (http://127.0.0.1:8000)"
Write-Host "Frontend PID: $($FrontendProcess.Id) (Next.js development server)"
Write-Host "Press Ctrl+C to stop both processes."

try {
    Wait-Process -Id @($BackendProcess.Id, $FrontendProcess.Id)
} finally {
    foreach ($Process in @($BackendProcess, $FrontendProcess)) {
        if ($Process -and -not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
