#!/bin/bash
# ============================================================================
# LeaxPanel(os) - Linux/macOS Installer
# ============================================================================
# One-command install from GitHub:
#   curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
#
# This script:
#   1. Auto-installs Node.js 22+ if missing
#   2. Auto-installs Docker if missing
#   3. Opens firewall ports (ufw: 3000, 5432, 6379, 9000, 9001)
#   4. Generates secure random passwords for all services
#   5. Creates .env with generated credentials
#   6. Creates docker-compose.override.yml to wire passwords into Docker
#   7. Starts PostgreSQL, Redis, Minio via Docker
#   8. Runs database migrations and seeds
#   9. Displays all service credentials
# ============================================================================

set -e

# Change to the directory where this script lives (project root)
# When run via `curl | bash`, BASH_SOURCE[0] is not a real file,
# so we download the project to a temp directory and work from there.
if [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    echo "[*] Downloading project files from GitHub..."
    INSTALL_DIR="$(mktemp -d)"
    cd "$INSTALL_DIR"
    if command -v git &> /dev/null; then
        git clone --depth 1 https://github.com/netblood/LeaxPanel-OS-.git .
    else
        curl -fsSL https://github.com/netblood/LeaxPanel-OS-/archive/refs/heads/main.tar.gz | tar xz --strip-components=1
    fi
    SCRIPT_DIR="$(pwd)"
fi
cd "$SCRIPT_DIR"

echo ""
echo "============================================================"
echo "  LeaxPanel(os) - Complete Cloud Operating System"
echo "  Linux/macOS Installer - Auto Setup"
echo "============================================================"
echo ""

# ---- Detect OS / package manager ----
OS_ID=""
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
fi

# ---- Password generator ----
generate_password() {
    local len=${1:-16}
    LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c "$len"
    echo
}

# ---- Ensure Node.js 22+ is installed ----
ensure_nodejs() {
    echo "[1/9] Checking Node.js..."
    if command -v node &> /dev/null; then
        NODE_VER=$(node --version | sed 's/v//')
        NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
        if [ "$NODE_MAJOR" -ge 22 ]; then
            echo "Node.js v$NODE_VER found (>= 22)."
            return 0
        else
            echo "Node.js v$NODE_VER found but version 22+ is required. Upgrading..."
        fi
    else
        echo "Node.js not found. Installing Node.js 22.x..."
    fi

    if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
        if ! command -v curl &> /dev/null; then apt-get update -y && apt-get install -y curl gnupg ca-certificates; fi
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    elif [ "$OS_ID" = "rhel" ] || [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rocky" ] || [ "$OS_ID" = "almalinux" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
        yum install -y nodejs || dnf install -y nodejs
    elif [ "$OS_ID" = "fedora" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
        dnf install -y nodejs
    elif [ "$(uname)" = "Darwin" ]; then
        if command -v brew &> /dev/null; then
            brew install node@22
        else
            echo "ERROR: Homebrew not found. Please install Node.js 22+ manually from https://nodejs.org/"
            exit 1
        fi
    else
        echo "ERROR: Unsupported OS for automatic Node.js install ($OS_ID)."
        echo "Please install Node.js 22+ manually from https://nodejs.org/"
        exit 1
    fi

    node --version
    npm --version
}

# ---- Ensure Docker is installed ----
ensure_docker() {
    echo "[2/9] Checking Docker..."
    if command -v docker &> /dev/null; then
        echo "Docker found."
        return 0
    fi

    echo "Docker not found. Installing Docker CE..."

    if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
        apt-get update -y
        apt-get install -y ca-certificates curl gnupg lsb-release
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS_ID/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS_ID $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl enable --now docker
        usermod -aG docker "$USER" 2>/dev/null || true
    elif [ "$OS_ID" = "rhel" ] || [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rocky" ] || [ "$OS_ID" = "almalinux" ]; then
        yum install -y yum-utils || dnf install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl enable --now docker
        usermod -aG docker "$USER" 2>/dev/null || true
    elif [ "$OS_ID" = "fedora" ]; then
        dnf -y install dnf-plugins-core
        dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
        dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl enable --now docker
        usermod -aG docker "$USER" 2>/dev/null || true
    elif [ "$(uname)" = "Darwin" ]; then
        echo "WARNING: Docker Desktop must be installed manually on macOS from https://docs.docker.com/desktop/install/mac-install/"
        return 1
    else
        echo "ERROR: Unsupported OS for automatic Docker install ($OS_ID)."
        return 1
    fi

    echo "Docker installed successfully."
    return 0
}

# ---- Open firewall ports ----
open_firewall_ports() {
    echo "[3/9] Opening firewall ports..."
    if command -v ufw &> /dev/null; then
        ufw allow 3000/tcp comment 'LeaxPanel App' 2>/dev/null || true
        ufw allow 5432/tcp comment 'PostgreSQL' 2>/dev/null || true
        ufw allow 6379/tcp comment 'Redis' 2>/dev/null || true
        ufw allow 9000/tcp comment 'Minio API' 2>/dev/null || true
        ufw allow 9001/tcp comment 'Minio Console' 2>/dev/null || true
        echo "    Firewall ports opened via ufw: 3000, 5432, 6379, 9000, 9001"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=5432/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=6379/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=9000/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=9001/tcp 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        echo "    Firewall ports opened via firewalld: 3000, 5432, 6379, 9000, 9001"
    else
        echo "    WARNING: No firewall manager (ufw/firewalld) found. Please open ports manually: 3000, 5432, 6379, 9000, 9001"
    fi
}

# ---- Install Node.js ----
ensure_nodejs

# ---- Install Docker ----
DOCKER_AVAILABLE=0
if ensure_docker; then
    DOCKER_AVAILABLE=1
fi

# ---- Open firewall ports ----
open_firewall_ports

# ---- Generate all credentials ----
echo "[4/9] Generating secure service credentials..."
DB_PASSWORD=$(generate_password 16)
REDIS_PASSWORD=$(generate_password 16)
MINIO_PASSWORD=$(generate_password 16)
SESSION_SECRET=$(generate_password 32)
JWT_SECRET=$(generate_password 32)
ENCRYPTION_KEY=$(generate_password 32)
echo "    Credentials generated."

# Create .env with generated credentials
echo "[5/9] Setting up environment configuration (.env)..."
cat > .env <<ENVEOF
# LeaxPanel(os) Environment Configuration
# Auto-generated by installer - DO NOT COMMIT TO VERSION CONTROL
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://leaxos:${DB_PASSWORD}@localhost:5432/leaxos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leaxos
DB_USER=leaxos
DB_PASSWORD=${DB_PASSWORD}

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Minio (Object Storage)
MINIO_HOST=localhost
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ROOT_USER=leaxos
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}

# Session
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=86400000

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# Encryption (AES-256-GCM, must be 32 chars)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# AI Providers (users can configure their own)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
GROK_API_KEY=
OPENROUTER_API_KEY=

# Email (Stalwart / SMTP)
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@leaxos.local

# Billing (disabled by default)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox

# Cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ZONE_ID=

# Docker
DOCKER_HOST=/var/run/docker.sock

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
FAIL2BAN_ENABLED=false
CROWDSEC_ENABLED=false

# Monitoring
MONITORING_INTERVAL=30000

# Backup
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
ENVEOF
echo "    .env created with auto-generated credentials."

# Create docker-compose.override.yml to wire credentials into Docker services
echo "[6/9] Creating Docker Compose override with credentials..."
cat > docker-compose.override.yml <<OVERRIDEEOF
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  redis:
    command: redis-server --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
  minio:
    environment:
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
  leaxos:
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
OVERRIDEEOF
echo "    docker-compose.override.yml created."

# Install npm dependencies
echo "[7/9] Installing npm dependencies..."
npm install
echo "Dependencies installed successfully."

# Start Docker services if available
if [ "$DOCKER_AVAILABLE" -eq 1 ]; then
    echo "[8/9] Starting Docker services (PostgreSQL, Redis, Minio)..."
    if command -v docker compose &> /dev/null; then
        docker compose up -d postgres redis minio
    elif command -v docker-compose &> /dev/null; then
        docker-compose up -d postgres redis minio
    else
        echo "WARNING: Neither 'docker compose' nor 'docker-compose' found."
        DOCKER_AVAILABLE=0
    fi

    # Wait for PostgreSQL to be ready
    if [ "$DOCKER_AVAILABLE" -eq 1 ]; then
        echo "[9/9] Waiting for PostgreSQL to be ready..."
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
            echo "Running database migrations..."
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
    fi
else
    echo "[8/9] Skipping Docker services (Docker not available)."
    echo "[9/9] Skipping migrations (PostgreSQL not available)."
fi

# Optional: Fix vulnerabilities
echo "Running npm audit fix (optional)..."
npm audit fix --force 2>/dev/null || true

# ---- Summary ----
echo ""
echo "============================================================"
echo "  Installation complete!"
echo "============================================================"
echo ""
echo "To start the server, run: ./run.sh"
echo "Or manually: node server.js"
echo ""
echo "============================================================"
echo "  SERVICE CREDENTIALS (auto-generated)"
echo "============================================================"
echo ""
echo "  PostgreSQL:"
echo "    Host:     localhost:5432"
echo "    Database: leaxos"
echo "    User:     leaxos"
echo "    Password: ${DB_PASSWORD}"
echo ""
echo "  Redis:"
echo "    Host:     localhost:6379"
echo "    Password: ${REDIS_PASSWORD}"
echo ""
echo "  Minio (Object Storage):"
echo "    Host:     localhost:9000"
echo "    Console:  localhost:9001"
echo "    User:     leaxos"
echo "    Password: ${MINIO_PASSWORD}"
echo ""
echo "  Session Secret:   ${SESSION_SECRET}"
echo "  JWT Secret:       ${JWT_SECRET}"
echo "  Encryption Key:   ${ENCRYPTION_KEY}"
echo ""
echo "All credentials have been saved to .env"
echo "Default admin account: owner@leaxos.local"
echo ""
echo "============================================================"