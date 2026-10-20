# ============================================================================
# LeaxPanel(os) - Windows Installer (PowerShell)
# ============================================================================
# One-command install from GitHub:
#   iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.ps1 | iex
#
# This script installs all dependencies, starts Docker services (PostgreSQL,
# Redis, Minio), runs database migrations and seeds, and prepares the
# environment for one-click run.
# Run as Administrator if you encounter permission issues.
# ============================================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

Write-Host ""
Write-Host "============================================================"
Write-Host "  LeaxPanel(os) - Complete Cloud Operating System"
Write-Host "  Windows Installer (PowerShell)"
Write-Host "============================================================"
Write-Host ""

# Check Node.js
Write-Host "[1/8] Checking Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 22+ from https://nodejs.org/"
    pause
    exit 1
}
Write-Host ("Node.js found: " + $node.Source)

# Check npm
Write-Host "[2/8] Checking npm..."
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Host "ERROR: npm is not available." -ForegroundColor Red
    pause
    exit 1
}
Write-Host ("npm found: " + $npm.Source)

# Check Docker (optional - for PostgreSQL, Redis, Minio)
Write-Host "[3/8] Checking Docker..."
$docker = Get-Command docker -ErrorAction SilentlyContinue
$DOCKER_AVAILABLE = $false
if ($docker) {
    Write-Host "Docker found."
    $DOCKER_AVAILABLE = $true
} else {
    Write-Host "WARNING: Docker not found. PostgreSQL/Redis/Minio will not be auto-started." -ForegroundColor Yellow
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    Write-Host "Or install PostgreSQL and Redis manually and configure .env accordingly."
}

# Create .env from .env.example if not exists
Write-Host "[4/8] Setting up environment configuration..."
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example"
    Write-Host "Please edit .env with your configuration settings."
} else {
    Write-Host ".env already exists, skipping."
}

# Install npm dependencies
Write-Host "[5/8] Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed." -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Dependencies installed successfully."

# Start Docker services if available
if ($DOCKER_AVAILABLE) {
    Write-Host "[6/8] Starting Docker services (PostgreSQL, Redis, Minio)..."
    $composeUp = docker compose up -d postgres redis minio 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Trying docker-compose..." -ForegroundColor Yellow
        docker-compose up -d postgres redis minio 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Could not start Docker services. You may need to start them manually." -ForegroundColor Yellow
        }
    }

    # Wait for PostgreSQL to be ready
    Write-Host "[7/8] Waiting for PostgreSQL to be ready..."
    $attempts = 0
    $pgReady = $false
    while ($attempts -lt 60) {
        $ready = docker compose exec -T postgres pg_isready -U leaxos -d leaxos 2>$null
        if ($LASTEXITCODE -eq 0) {
            $pgReady = $true
            break
        }
        $attempts++
        Start-Sleep -Seconds 2
    }
    if (-not $pgReady) {
        Write-Host "WARNING: PostgreSQL did not become ready in time. Migrations may fail." -ForegroundColor Yellow
    } else {
        Write-Host "PostgreSQL is ready."

        # Run database migrations
        Write-Host "[8/8] Running database migrations..."
        if (node migrations/run.js) {
            Write-Host "Migrations completed successfully."

            # Run database seeds
            Write-Host "Running database seeds..."
            if (node seeds/run.js) {
                Write-Host "Seeds completed successfully."
            } else {
                Write-Host "WARNING: Seeds failed. Run manually later with: node seeds/run.js" -ForegroundColor Yellow
            }
        } else {
            Write-Host "WARNING: Migrations failed. Run manually later with: node migrations/run.js" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[6/8] Skipping Docker services (Docker not available)."
    Write-Host "[7/8] Skipping migrations (PostgreSQL not available)."
    Write-Host "[8/8] Skipping seeds (PostgreSQL not available)."
}

# Optional: Fix vulnerabilities
Write-Host "Running npm audit fix (optional)..."
npm audit fix --force 2>$null | Out-Null

Write-Host ""
Write-Host "============================================================"
Write-Host "  Installation complete!"
Write-Host "============================================================"
Write-Host ""
Write-Host "To start the server, run: run.bat"
Write-Host "Or manually: node server.js"
Write-Host ""
Write-Host "Default admin credentials (after seeding):"
Write-Host "  Email:    owner@leaxos.local"
Write-Host "  Password: (set during seed or first login)"
Write-Host ""
pause
