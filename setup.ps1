$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Venv = Join-Path $Root ".venv"
$VenvPython = Join-Path $Venv "Scripts\python.exe"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python was not found on PATH. Install Python 3.10-3.12 and rerun this script."
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating virtual environment at $Venv"
    & python -m venv $Venv
} else {
    Write-Host "Using existing virtual environment at $Venv"
}

Write-Host "Upgrading pip"
& $VenvPython -m pip install --upgrade pip

Write-Host "Installing backend dependencies"
& $VenvPython -m pip install -r (Join-Path $Root "backend\requirements.txt")

Write-Host "Installing frontend dependencies"
Push-Location (Join-Path $Root "frontend")
try {
    npm install
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Setup complete. Next steps:"
Write-Host "  1. Review backend/.env.example and configure any required environment variables."
Write-Host "  2. Start the backend and frontend together with: .\start.ps1"
Write-Host "  3. Open the frontend URL printed by Next.js (normally http://localhost:3000)."
