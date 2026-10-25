$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required. Install Node.js 20+ and run start.ps1 again.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm is required. Install Node.js 20+ and run start.ps1 again.'
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules'))) {
  Write-Host 'Installing dependencies...' -ForegroundColor Cyan
  npm install
}

npm run start
