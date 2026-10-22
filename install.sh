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
#  The installer checks Node.js, generates every secret, installs the npm
#  dependencies, applies the database migrations and seeds the administrator.
# ============================================================================

set -euo pipefail

# Always operate on the directory that holds this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; CYAN=$'\033[36m'; RESET=$'\033[0m'

step() { echo -e "${CYAN}[$1/5]${RESET} ${BOLD}$2${RESET}"; }
info() { echo -e "     ${DIM}$1${RESET}"; }
warn() { echo -e "     ${YELLOW}$1${RESET}"; }
ok()   { echo -e "     ${GREEN}$1${RESET}"; }
fail() { echo -e "     ${RED}$1${RESET}"; }

have() { command -v "$1" >/dev/null 2>&1; }

echo
echo "============================================================================"
echo "  LeaxPanel(os) - Complete Cloud Platform Operating System"
echo "  Linux / macOS Installer - One Command Setup"
echo "============================================================================"
echo

# --------------------------------------------------------------- Node.js ----
step 1 "Checking Node.js runtime..."
if ! have node; then
  fail "Node.js was not found in your PATH."
  echo "     LeaxPanel requires Node.js 22 or newer."
  echo "     Install it with one of:"
  echo "       curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
  echo "       curl -fsSL https://get.pagerduty.github.io/nodedistro/deb/x64/nodesource-release.deb.new | sudo dpkg -i --force-confnew - && sudo apt-get install -y nodejs"
  echo "       brew install node@22"
  echo "     Or download: https://nodejs.org/en/download"
  exit 1
fi

NODE_VERSION="$(node --version)"
info "Found Node.js ${NODE_VERSION}"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Node.js 22 or newer is required. Found ${NODE_VERSION}."
  exit 1
fi
ok "Node.js version is supported"

if ! have npm; then
  fail "npm was not found in your PATH. Reinstall Node.js with npm included."
  exit 1
fi
info "Found npm $(npm --version)"

# -------------------------------------------------------------- firewall ----
step 2 "Configuring the firewall..."
if have ufw; then
  if sudo -n ufw status >/dev/null 2>&1; then
    sudo ufw allow 3000/tcp >/dev/null 2>&1 && ok "ufw rule added for TCP 3000" || warn "Could not add the ufw rule automatically"
  else
    warn "ufw needs sudo - run 'sudo ufw allow 3000/tcp' yourself"
  fi
elif have firewall-cmd; then
  sudo firewall-cmd --permanent --add-port=3000/tcp >/dev/null 2>&1 && sudo firewall-cmd --reload >/dev/null 2>&1 && ok "firewalld rule added for TCP 3000" || warn "Could not add the firewalld rule automatically"
elif have ufw || have firewall-cmd; then
  warn "No supported firewall manager detected"
else
  warn "No supported firewall manager detected (open TCP 3000 manually if needed)"
fi

# --------------------------------------------------------------- bootstrap --
step 3 "Running the LeaxPanel bootstrap (dependencies, migrations, seeds)..."
node scripts/bootstrap.js

# ------------------------------------------------------------------ doctor --
step 4 "Verifying the installation..."
node scripts/verify.js || warn "Some verification checks did not pass - run /doctor after starting the panel"

# ------------------------------------------------------------------ final ---
step 5 "Finalising..."
mkdir -p data data/uploads data/files logs backups
ok "Working directories ready"

# ------------------------------------------------------------------- PM2 ----
if have pm2; then
  info "PM2 detected - start the panel with: pm2 start ecosystem.config.js"
else
  info "PM2 not found - start the panel with: npm start"
fi

echo
echo "============================================================================"
echo "  Ready to run."
echo "============================================================================"
echo
echo "  Start the panel:   ./run.sh      (or: npm start)"
echo "  Open:              http://localhost:3000"
echo "  Health check:      http://localhost:3000/doctor"
echo "  Setup wizard:      http://localhost:3000/setup"
echo
echo "  Admin email:       owner@leaxos.local"
echo "  Admin password:    see INSTALL_CREDENTIALS.txt in this folder"
echo
echo "  Docs:    https://github.com/netblood/LeaxPanel-OS-"
echo "  Issues:  https://github.com/netblood/LeaxPanel-OS-/issues"
echo "============================================================================"
echo
