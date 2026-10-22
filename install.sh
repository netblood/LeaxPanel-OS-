#!/usr/bin/env bash
# ============================================================================
#  LeaxPanel(os) - Linux / macOS Installer
# ============================================================================
#  One-command install straight from GitHub:
#
#    curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
#
#  Or clone and run:
#
#    git clone https://github.com/netblood/LeaxPanel-OS-.git
#    cd LeaxPanel-OS-
#    chmod +x install.sh run.sh
#    ./install.sh
#
#  The installer auto-detects your OS, installs Node.js 22+ if missing,
#  installs PM2, configures the firewall, generates all secrets, applies
#  migrations, seeds the administrator, and starts the panel automatically.
# ============================================================================

set -euo pipefail

# Always operate on the directory that holds this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; CYAN=$'\033[36m'; RESET=$'\033[0m'

step() { echo -e "${CYAN}[$1/8]${RESET} ${BOLD}$2${RESET}"; }
info() { echo -e "     ${DIM}$1${RESET}"; }
warn() { echo -e "     ${YELLOW}$1${RESET}"; }
ok()   { echo -e "     ${GREEN}$1${RESET}"; }
fail() { echo -e "     ${RED}$1${RESET}"; }

have() { command -v "$1" >/dev/null 2>&1; }

is_root() { [ "$(id -u)" -eq 0 ]; }
SUDO=""
if ! is_root && have sudo; then SUDO="sudo"; fi

echo
echo "============================================================================"
echo "  LeaxPanel(os) - Complete Cloud Platform Operating System"
echo "  Linux / macOS Installer - One Command Setup"
echo "============================================================================"
echo

# --------------------------------------------------------------- OS detect --
step 1 "Detecting operating system..."
OS="unknown"
ARCH="$(uname -m)"
case "$(uname -s)" in
  Linux*)     OS="linux";;
  Darwin*)    OS="macos";;
  *)          OS="unknown";;
esac
info "OS: $OS  Arch: $ARCH"
ok "Operating system detected"

# --------------------------------------------------------------- Node.js ----
step 2 "Checking Node.js runtime (22+ required)..."
if ! have node; then
  info "Node.js not found - installing automatically..."
  if [ "$OS" = "linux" ]; then
    # Detect package manager
    if have apt-get; then
      $SUDO apt-get update -y >/dev/null 2>&1 || warn "apt-get update failed (continuing anyway)"
      $SUDO apt-get install -y curl gnupg ca-certificates >/dev/null 2>&1 || warn "Could not install curl/gnupg"
      curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - >/dev/null 2>&1 || warn "NodeSource setup failed"
      $SUDO apt-get install -y nodejs >/dev/null 2>&1 || fail "Failed to install Node.js via apt"
    elif have dnf; then
      $SUDO dnf install -y nodejs npm >/dev/null 2>&1 || fail "Failed to install Node.js via dnf"
    elif have yum; then
      $SUDO yum install -y nodejs npm >/dev/null 2>&1 || fail "Failed to install Node.js via yum"
    elif have apk; then
      $SUDO apk add nodejs npm >/dev/null 2>&1 || fail "Failed to install Node.js via apk"
    else
      fail "No supported package manager found. Install Node.js 22+ manually from https://nodejs.org"
    fi
  elif [ "$OS" = "macos" ]; then
    if have brew; then
      brew install node@22 >/dev/null 2>&1 || fail "Failed to install Node.js via brew"
    else
      fail "Homebrew not found. Install it from https://brew.sh, then re-run this installer."
    fi
  else
    fail "Automatic Node.js installation is not supported on this OS. Install Node.js 22+ manually."
  fi
fi

if ! have node; then
  fail "Node.js is still not available after installation attempt."
  exit 1
fi

NODE_VERSION="$(node --version)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Node.js 22 or newer is required. Found ${NODE_VERSION}."
  exit 1
fi
info "Found Node.js ${NODE_VERSION}"
if ! have npm; then
  fail "npm was not found. Reinstall Node.js with npm included."
  exit 1
fi
info "Found npm $(npm --version)"
ok "Node.js runtime ready"

# --------------------------------------------------------------- build tools -
if [ "$OS" = "linux" ] && have apt-get; then
  $SUDO apt-get install -y build-essential python3 >/dev/null 2>&1 || warn "Could not install build-essential (better-sqlite3 may fail to compile)"
fi
if ! have pm2; then
  info "PM2 not found - installing globally..."
  npm install -g pm2 >/dev/null 2>&1 || fail "Failed to install PM2 globally"
fi
if ! have pm2; then
  # Try with npx fallback
  info "PM2 not in PATH after global install, trying npx..."
  npm install -g pm2 --prefix /usr/local >/dev/null 2>&1 || true
fi
if have pm2; then
  info "Found PM2 $(pm2 --version)"
  ok "PM2 process manager ready"
else
  warn "PM2 installation failed - the panel will start with npm start instead"
fi

# -------------------------------------------------------------- firewall -----
step 4 "Configuring firewall (port 3000)..."
if [ "$OS" = "linux" ]; then
  if have ufw; then
    if $SUDO ufw status >/dev/null 2>&1; then
      $SUDO ufw allow 3000/tcp >/dev/null 2>&1 && ok "ufw: TCP 3000 allowed" || warn "ufw rule could not be added"
    else
      warn "ufw is inactive - run 'sudo ufw enable && sudo ufw allow 3000/tcp' yourself"
    fi
  elif have firewall-cmd; then
    $SUDO firewall-cmd --permanent --add-port=3000/tcp >/dev/null 2>&1 && $SUDO firewall-cmd --reload >/dev/null 2>&1 && ok "firewalld: TCP 3000 allowed" || warn "firewalld rule could not be added"
  else
    warn "No firewall manager detected - open TCP 3000 manually if needed"
  fi
else
  info "Skipping firewall on macOS"
fi

# --------------------------------------------------------------- bootstrap --
step 5 "Running bootstrap (.env, dependencies, migrations, seeds)..."
node scripts/bootstrap.js
ok "Bootstrap complete - .env generated, database migrated and seeded"

# ------------------------------------------------------------------ verify --
step 6 "Verifying installation..."
node scripts/verify.js 2>&1 || warn "Some verification checks did not pass - run /doctor after starting"
ok "Verification complete"

# ------------------------------------------------------------------ final ---
step 7 "Preparing working directories..."
mkdir -p data data/uploads data/files logs backups
ok "Directories ready"

# ------------------------------------------------------------------- start --
step 8 "Starting LeaxPanel..."
if have pm2; then
  if pm2 describe leaxpanel >/dev/null 2>&1; then
    pm2 restart leaxpanel --update-env >/dev/null 2>&1 && ok "PM2: leaxpanel restarted" || warn "PM2 restart failed"
  else
    pm2 start ecosystem.config.js --name leaxpanel >/dev/null 2>&1 && ok "PM2: leaxpanel started" || warn "PM2 start failed - try 'npm start' manually"
  fi
  pm2 save >/dev/null 2>&1 || true
else
  info "PM2 not available - start manually with: npm start"
fi

# ------------------------------------------------------- access information --
echo
echo "============================================================================"
echo "  LeaxPanel(os) - Installation Complete!"
echo "============================================================================"
echo

# Detect external IP for web access
EXTERNAL_IP=""
if have curl; then
  EXTERNAL_IP="$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || curl -s --max-time 5 https://ifconfig.me 2>/dev/null || true)"
fi
if [ -z "$EXTERNAL_IP" ]; then
  EXTERNAL_IP="<your-server-ip>"
fi

PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo 3000)"
PORT="${PORT:-3000}"

echo "  Local access:     http://localhost:${PORT}"
echo "  External access:  http://${EXTERNAL_IP}:${PORT}"
echo "  Health check:     http://${EXTERNAL_IP}:${PORT}/doctor"
echo "  Setup wizard:     http://${EXTERNAL_IP}:${PORT}/setup"
echo
echo "  Admin email:      owner@leaxos.local"
echo "  Admin password:   see INSTALL_CREDENTIALS.txt"
echo
echo "  Manage with PM2:"
echo "    pm2 status leaxpanel"
echo "    pm2 logs leaxpanel"
echo "    pm2 stop leaxpanel"
echo
echo "  If the external URL does not work, open TCP port ${PORT} in your"
echo "  cloud firewall / security group (AWS, DigitalOcean, Hetzner, etc.)"
echo
echo "  Docs:    https://github.com/netblood/LeaxPanel-OS-"
echo "  Issues:  https://github.com/netblood/LeaxPanel-OS-/issues"
echo "============================================================================"
echo
