#!/bin/bash
# ============================================================================
# LeaxPanel(os) - Linux/macOS Runner
# ============================================================================
# This script ensures Docker services are running, then starts the
# LeaxPanel(os) server.
# Run with: chmod +x run.sh && ./run.sh
# ============================================================================

set -e

echo ""
echo "============================================================"
echo "  LeaxPanel(os) - Complete Cloud Operating System"
echo "  Starting Server..."
echo "============================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Running install first..."
    ./install.sh
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo ".env not found. Creating from .env.example..."
    cp .env.example .env
fi

# Check Docker and start services if available
if command -v docker &> /dev/null; then
    echo "Checking Docker services..."
    if command -v docker compose &> /dev/null; then
        DOCKER_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_CMD="docker-compose"
    else
        DOCKER_CMD=""
    fi

    if [ -n "$DOCKER_CMD" ]; then
        echo "Starting Docker services (PostgreSQL, Redis, Minio)..."
        $DOCKER_CMD up -d postgres redis minio 2>/dev/null || true

        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to be ready..."
        ATTEMPTS=0
        until $DOCKER_CMD exec -T postgres pg_isready -U leaxos -d leaxos &> /dev/null; do
            ATTEMPTS=$((ATTEMPTS + 1))
            if [ "$ATTEMPTS" -ge 60 ]; then
                echo "WARNING: PostgreSQL did not become ready. Server will start in degraded mode."
                break
            fi
            sleep 2
        done
        if [ "$ATTEMPTS" -lt 60 ]; then
            echo "PostgreSQL is ready."
        fi
    fi
else
    echo "WARNING: Docker not found. Server will start in degraded mode (no PostgreSQL/Redis)."
fi

# Start the server
echo "Starting LeaxPanel(os) server on port 3000..."
echo "Press Ctrl+C to stop the server."
echo ""
node server.js
