#!/bin/bash
# ============================================================================
# LeaxPanel(os) - Linux/macOS Installer
# ============================================================================
# This script installs all dependencies, starts Docker services (PostgreSQL,
# Redis, Minio), runs database migrations and seeds, and prepares the
# environment for one-click run.
# Run with: chmod +x install.sh && ./install.sh
# ============================================================================

set -e

echo ""
echo "============================================================"
echo "  LeaxPanel(os) - Complete Cloud Operating System"
echo "  Linux/macOS Installer"
echo "============================================================"
echo ""

# Check Node.js
echo "[1/8] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH."
    echo "Please install Node.js 22+ from https://nodejs.org/"
    exit 1
fi
node --version

# Check npm
echo "[2/8] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not available."
    exit 1
fi
npm --version

# Check Docker (optional - for PostgreSQL, Redis, Minio)
echo "[3/8] Checking Docker..."
DOCKER_AVAILABLE=0
if command -v docker &> /dev/null; then
    echo "Docker found."
    DOCKER_AVAILABLE=1
else
    echo "WARNING: Docker not found. PostgreSQL/Redis/Minio will not be auto-started."
    echo "Please install Docker from https://docs.docker.com/engine/install/"
    echo "Or install PostgreSQL and Redis manually and configure .env accordingly."
fi

# Create .env from .env.example if not exists
echo "[4/8] Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
    echo "Please edit .env with your configuration settings."
else
    echo ".env already exists, skipping."
fi

# Install npm dependencies
echo "[5/8] Installing npm dependencies..."
npm install
echo "Dependencies installed successfully."

# Start Docker services if available
if [ "$DOCKER_AVAILABLE" -eq 1 ]; then
    echo "[6/8] Starting Docker services (PostgreSQL, Redis, Minio)..."
    if command -v docker compose &> /dev/null; then
        docker compose up -d postgres redis minio
    elif command -v docker-compose &> /dev/null; then
        docker-compose up -d postgres redis minio
    else
        echo "WARNING: Neither 'docker compose' nor 'docker-compose' found."
    fi

    # Wait for PostgreSQL to be ready
    echo "[7/8] Waiting for PostgreSQL to be ready..."
    ATTEMPTS=0
    until docker compose exec -T postgres pg_isready -U leaxos -d leaxos &> /dev/null || \
          docker-compose exec -T postgres pg_isready -U leaxos -d leaxos &> /dev/null; do
        ATTEMPTS=$((ATTEMPTS + 1))
        if [ "$ATTEMPTS" -ge 60 ]; then
            echo "WARNING: PostgreSQL did not become ready in time. Migrations may fail."
            break
        fi
        sleep 2
    done
    if [ "$ATTEMPTS" -lt 60 ]; then
        echo "PostgreSQL is ready."

        # Run database migrations
        echo "[8/8] Running database migrations..."
        if node migrations/run.js; then
            echo "Migrations completed successfully."

            # Run database seeds
            echo "Running database seeds..."
            if node seeds/run.js; then
                echo "Seeds completed successfully."
            else
                echo "WARNING: Seeds failed. Run manually later with: node seeds/run.js"
            fi
        else
            echo "WARNING: Migrations failed. Run manually later with: node migrations/run.js"
        fi
    fi
else
    echo "[6/8] Skipping Docker services (Docker not available)."
    echo "[7/8] Skipping migrations (PostgreSQL not available)."
    echo "[8/8] Skipping seeds (PostgreSQL not available)."
fi

# Optional: Fix vulnerabilities
echo "Running npm audit fix (optional)..."
npm audit fix --force 2>/dev/null || true

echo ""
echo "============================================================"
echo "  Installation complete!"
echo "============================================================"
echo ""
echo "To start the server, run: ./run.sh"
echo "Or manually: node server.js"
echo ""
echo "Default admin credentials (after seeding):"
echo "  Email:    owner@leaxos.local"
echo "  Password: (set during seed or first login)"
echo ""
