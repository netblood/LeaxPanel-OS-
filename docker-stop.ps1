$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop or Docker Engine is required to stop the stack.'
}

docker compose down
exit $LASTEXITCODE
