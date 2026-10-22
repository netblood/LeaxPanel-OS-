<#
.SYNOPSIS
    LeaxPanel(os) - Windows PowerShell installer.

.DESCRIPTION
    Checks Node.js, generates every secret, installs the npm dependencies,
    applies the database migrations and seeds the administrator account.

.EXAMPLE
    irm https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.ps1 | iex
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Write-Step   { param($n, $m) Write-Host "[$n/5] $m" -ForegroundColor Cyan }
function Write-Info   { param($m) Write-Host "     $m" -ForegroundColor DarkGray }
function Write-Good   { param($m) Write-Host "     $m" -ForegroundColor Green }
function Write-Warn   { param($m) Write-Host "     $m" -ForegroundColor Yellow }
function Write-Fail   { param($m) Write-Host "     $m" -ForegroundColor Red }

Write-Host ''
Write-Host '============================================================================'
Write-Host '  LeaxPanel(os) - Complete Cloud Platform Operating System'
Write-Host '  Windows PowerShell Installer - One Command Setup'
Write-Host '============================================================================'
Write-Host ''

# ---------------------------------------------------------------- Node.js ---
Write-Step 1 'Checking Node.js runtime...'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail 'Node.js was not found in your PATH.'
    Write-Host '     LeaxPanel requires Node.js 22 or newer.'
    Write-Host '     Download: https://nodejs.org/en/download'
    exit 1
}

$nodeVersion = node --version
Write-Info "Found Node.js $nodeVersion"

$nodeMajor = [int](node -p 'process.versions.node.split(".")[0]')
if ($nodeMajor -lt 22) {
    Write-Fail "Node.js 22 or newer is required. Found $nodeVersion."
    exit 1
}
Write-Good 'Node.js version is supported'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail 'npm was not found in your PATH. Reinstall Node.js with npm included.'
    exit 1
}
Write-Info "Found npm $(npm --version)"

# --------------------------------------------------------------- firewall ---
Write-Step 2 'Configuring the firewall...'
try {
    New-NetFirewallRule -DisplayName 'LeaxPanel HTTP 3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -ErrorAction Stop | Out-Null
    Write-Good 'Firewall rule created for TCP 3000'
} catch {
    Write-Warn 'Could not create the firewall rule automatically (admin rights needed).'
    Write-Warn 'Open TCP 3000 manually if the panel is not reachable.'
}

# -------------------------------------------------------------- bootstrap ---
Write-Step 3 'Running the LeaxPanel bootstrap (dependencies, migrations, seeds)...'
& node (Join-Path $PSScriptRoot 'scripts\bootstrap.js')
if ($LASTEXITCODE -ne 0) {
    Write-Fail 'The bootstrap step failed.'
    exit 1
}

# ----------------------------------------------------------------- doctor ---
Write-Step 4 'Verifying the installation...'
& node (Join-Path $PSScriptRoot 'scripts\verify.js')
if ($LASTEXITCODE -ne 0) {
    Write-Warn 'Some verification checks did not pass - run /doctor after starting the panel.'
}

# ------------------------------------------------------------------ final ---
Write-Step 5 'Finalising...'
foreach ($dir in @('data', 'data\uploads', 'data\files', 'logs', 'backups')) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}
Write-Good 'Working directories ready'

Write-Host ''
Write-Host '============================================================================'
Write-Host '  Ready to run.'
Write-Host '============================================================================'
Write-Host ''
Write-Host '  Start the panel:   .\run.bat      (or: npm start)'
Write-Host '  Open:              http://localhost:3000'
Write-Host '  Health check:      http://localhost:3000/doctor'
Write-Host '  Setup wizard:      http://localhost:3000/setup'
Write-Host ''
Write-Host '  Admin email:       owner@leaxos.local'
Write-Host '  Admin password:    see INSTALL_CREDENTIALS.txt in this folder'
Write-Host ''
Write-Host '  Docs:    https://github.com/netblood/LeaxPanel-OS-'
Write-Host '  Issues:  https://github.com/netblood/LeaxPanel-OS-/issues'
Write-Host '============================================================================'
Write-Host ''
