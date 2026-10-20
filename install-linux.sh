#!/bin/bash
# ============================================================================
# LeaxPanel(os) - Complete One-Command Linux Installer
# ============================================================================
# This script does everything in one command:
#   1. Clones LeaxPanel(os) from GitHub
#   2. Installs all system requirements (Node.js 22+, Docker, git, curl, wget, figlet)
#   3. Sets up all passwords for PostgreSQL, Redis, Minio, etc.
#   4. Starts Docker services (PostgreSQL, Redis, Minio)
#   5. Runs database migrations and seeds
#   6. Starts the LeaxPanel(os) server
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-linux.sh | bash
#   OR
#   wget -qO- https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/install-linux.sh | bash
#
# ============================================================================

set -e

# ============================================================================
# CONFIGURATION - Edit these values before running
# ============================================================================
GITHUB_REPO="https://github.com/leaxsysAgency/leaxpanel-os.git"
APP_NAME="LeaxPanel(os)"
APP_DIR="/opt/leaxpanel-os"
APP_PORT="3000"
ADMIN_EMAIL="bilalchentouf102@hotmail.com"
AGENCY_NAME="leaxsysAgency"

# Database passwords (change these for production)
DB_NAME="leaxos"
DB_USER="leaxos"
DB_PASSWORD="leaxos_password"
REDIS_PASSWORD="leaxos_redis_password"
MINIO_USER="leaxos"
MINIO_PASSWORD="leaxos_password"
SESSION_SECRET="leaxos_session_secret_$(date +%s | sha256sum | cut -c1-32)"
JWT_SECRET="leaxos_jwt_secret_$(date +%s | sha256sum | cut -c1-32)"
ENCRYPTION_KEY="leaxos_encryption_key_32_chars_!!"

# ============================================================================
# COLORS
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
print_header() {
    echo -e "${CYAN}"
    echo "============================================================"
    echo "  $1"
    echo "============================================================"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)."
        print_info "Run: sudo bash install-linux.sh"
        exit 1
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        print_error "Cannot detect OS. This script supports Ubuntu/Debian and CentOS/RHEL."
        exit 1
    fi
    print_info "Detected OS: $OS $OS_VERSION"
}

install_system_deps() {
    print_step "Installing system dependencies..."

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get update -y
        apt-get install -y curl wget git gnupg software-properties-common ca-certificates figlet
    elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "alma" ]]; then
        yum install -y curl wget git gnupg figlet || dnf install -y curl wget git gnupg figlet
    else
        print_warning "Unsupported OS. Attempting to install dependencies anyway..."
        apt-get update -y 2>/dev/null || yum install -y curl wget git gnupg figlet 2>/dev/null || true
    fi

    print_success "System dependencies installed."
}

install_nodejs() {
    print_step "Installing Node.js 22+..."

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | sed 's/v//')
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
        if [[ "$NODE_MAJOR" -ge 22 ]]; then
            print_success "Node.js $NODE_VERSION already installed (>= 22)."
            return
        fi
    fi

    # Install Node.js 22 via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get install -y nodejs
    elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "alma" ]]; then
        yum install -y nodejs || dnf install -y nodejs
    fi

    print_success "Node.js installed: $(node --version)"
    print_success "npm installed: $(npm --version)"
}

install_docker() {
    print_step "Installing Docker..."

    if command -v docker &> /dev/null; then
        print_success "Docker already installed: $(docker --version)"
        return
    fi

    # Install Docker using official script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh

    # Enable and start Docker
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true

    # Add current user to docker group (if not root)
    if [[ -n "${SUDO_USER:-}" ]]; then
        usermod -aG docker "$SUDO_USER" 2>/dev/null || true
    fi

    print_success "Docker installed."
}

clone_repo() {
    print_step "Cloning $APP_NAME from GitHub..."

    if [[ -d "$APP_DIR" ]]; then
        print_warning "$APP_DIR already exists. Backing up and removing..."
        mv "$APP_DIR" "${APP_DIR}.backup.$(date +%s)" 2>/dev/null || true
    fi

    git clone "$GITHUB_REPO" "$APP_DIR"
    cd "$APP_DIR"

    print_success "Repository cloned to $APP_DIR"
}

setup_env() {
    print_step "Setting up environment configuration..."

    cd "$APP_DIR"

    # Create .env with all passwords configured
    cat > .env << EOF
# LeaxPanel(os) Environment Configuration
# Auto-generated by install-linux.sh on $(date)
# Email: $ADMIN_EMAIL
# Agency: $AGENCY_NAME

NODE_ENV=production
PORT=$APP_PORT
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379

# Session
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=86400000

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Email (configure your SMTP)
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@leaxos.local
ADMIN_EMAIL=${ADMIN_EMAIL}

# AI Providers (users can configure their own)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
GROK_API_KEY=
OPENROUTER_API_KEY=

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
EOF

    print_success ".env created with all passwords configured."
    print_info "  DB_PASSWORD: $DB_PASSWORD"
    print_info "  REDIS_PASSWORD: $REDIS_PASSWORD"
    print_info "  MINIO_PASSWORD: $MINIO_PASSWORD"
    print_info "  ADMIN_EMAIL: $ADMIN_EMAIL"
}

start_docker_services() {
    print_step "Starting Docker services (PostgreSQL, Redis, Minio)..."

    cd "$APP_DIR"

    # Pull and start services
    if command -v docker compose &> /dev/null; then
        DOCKER_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_CMD="docker-compose"
    else
        print_error "Neither 'docker compose' nor 'docker-compose' found."
        exit 1
    fi

    $DOCKER_CMD up -d postgres redis minio

    print_success "Docker services started."

    # Wait for PostgreSQL to be ready
    print_step "Waiting for PostgreSQL to be ready..."
    ATTEMPTS=0
    until $DOCKER_CMD exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; do
        ATTEMPTS=$((ATTEMPTS + 1))
        if [[ "$ATTEMPTS" -ge 90 ]]; then
            print_error "PostgreSQL did not become ready in time."
            exit 1
        fi
        sleep 2
    done
    print_success "PostgreSQL is ready."

    # Wait for Redis to be ready
    print_step "Waiting for Redis to be ready..."
    ATTEMPTS=0
    until $DOCKER_CMD exec -T redis redis-cli -a "$REDIS_PASSWORD" ping &> /dev/null; do
        ATTEMPTS=$((ATTEMPTS + 1))
        if [[ "$ATTEMPTS" -ge 90 ]]; then
            print_error "Redis did not become ready in time."
            exit 1
        fi
        sleep 2
    done
    print_success "Redis is ready."

    # Wait for Minio to be ready
    print_step "Waiting for Minio to be ready..."
    ATTEMPTS=0
    until $DOCKER_CMD exec -T minio curl -f "http://localhost:9000/minio/health/live" &> /dev/null; do
        ATTEMPTS=$((ATTEMPTS + 1))
        if [[ "$ATTEMPTS" -ge 90 ]]; then
            print_warning "Minio did not become ready in time. Continuing anyway..."
            break
        fi
        sleep 2
    done
    if [[ "$ATTEMPTS" -lt 90 ]]; then
        print_success "Minio is ready."
    fi
}

install_npm_deps() {
    print_step "Installing npm dependencies..."

    cd "$APP_DIR"
    npm install

    print_success "npm dependencies installed."
}

run_migrations() {
    print_step "Running database migrations..."

    cd "$APP_DIR"
    if node migrations/run.js; then
        print_success "Migrations completed successfully."
    else
        print_error "Migrations failed."
        exit 1
    fi
}

run_seeds() {
    print_step "Running database seeds..."

    cd "$APP_DIR"
    if node seeds/run.js; then
        print_success "Seeds completed successfully."
    else
        print_error "Seeds failed."
        exit 1
    fi
}

install_pm2() {
    print_step "Installing PM2 process manager..."

    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi

    print_success "PM2 installed: $(pm2 --version)"
}

start_server() {
    print_step "Starting $APP_NAME server..."

    cd "$APP_DIR"

    # Stop any existing PM2 process
    pm2 delete leaxpanel-os 2>/dev/null || true

    # Start with PM2
    pm2 start ecosystem.config.js --name leaxpanel-os 2>/dev/null || \
    pm2 start server.js --name leaxpanel-os

    pm2 save 2>/dev/null || true

    print_success "$APP_NAME server started on port $APP_PORT"
    print_info "  Access URL: http://$(hostname -I | awk '{print $1}'):$APP_PORT"
}

show_banner() {
    print_header "============================================================"

    # Try figlet, fallback to echo
    if command -v figlet &> /dev/null; then
        figlet -f slant "LeaxPanel(os)" 2>/dev/null || echo "  LeaxPanel(os)"
    else
        echo "  LeaxPanel(os)"
    fi

    echo ""
    echo -e "${BOLD}${MAGENTA}  Powered By $AGENCY_NAME${NC}"
    echo -e "${BOLD}${CYAN}  Email: $ADMIN_EMAIL${NC}"
    echo ""
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo ""
    echo -e "${BOLD}  Access Information:${NC}"
    echo -e "    ${CYAN}URL:${NC}      http://$(hostname -I | awk '{print $1}'):$APP_PORT"
    echo -e "    ${CYAN}Admin Email:${NC} $ADMIN_EMAIL"
    echo -e "    ${CYAN}DB User:${NC}    $DB_USER"
    echo -e "    ${CYAN}DB Password:${NC} $DB_PASSWORD"
    echo -e "    ${CYAN}Redis Password:${NC} $REDIS_PASSWORD"
    echo -e "    ${CYAN}Minio User:${NC}  $MINIO_USER"
    echo -e "    ${CYAN}Minio Password:${NC} $MINIO_PASSWORD"
    echo ""
    echo -e "${BOLD}  Management Commands:${NC}"
    echo -e "    ${CYAN}pm2 status${NC}          - Check server status"
    echo -e "    ${CYAN}pm2 logs leaxpanel-os${NC} - View server logs"
    echo -e "    ${CYAN}pm2 restart leaxpanel-os${NC} - Restart server"
    echo -e "    ${CYAN}pm2 stop leaxpanel-os${NC}   - Stop server"
    echo ""
    echo -e "${BOLD}  App Directory:${NC} $APP_DIR"
    echo -e "${BOLD}  Config File:${NC} $APP_DIR/.env"
    echo ""
    print_header "============================================================"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
main() {
    clear

    # Show figlet banner at start
    if command -v figlet &> /dev/null; then
        figlet -f slant "LeaxPanel(os)" 2>/dev/null || true
    fi
    echo -e "${BOLD}${MAGENTA}  Powered By $AGENCY_NAME${NC}"
    echo -e "${BOLD}${CYAN}  Email: $ADMIN_EMAIL${NC}"
    echo ""
    print_info "Starting one-command installation of $APP_NAME..."
    echo ""

    check_root
    detect_os
    install_system_deps
    install_nodejs
    install_docker
    clone_repo
    setup_env
    start_docker_services
    install_npm_deps
    run_migrations
    run_seeds
    install_pm2
    start_server

    show_banner
}

# Run main
main "$@"