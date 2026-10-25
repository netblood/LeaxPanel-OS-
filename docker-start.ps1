$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop or Docker Engine is required to start the production stack.'
}
if (-not (Test-Path -LiteralPath (Join-Path $root '.env'))) {
  Write-Host 'Missing .env. Copy .env.example to .env and fill every required value before starting Docker.' -ForegroundColor Yellow
  exit 1
}

docker compose up --build -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose ps
