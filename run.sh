#!/usr/bin/env bash
# ============================================================================
#  LeaxPanel(os) - Linux / macOS launcher
# ============================================================================
#  Starts the panel with PM2 when available, otherwise in the foreground.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BOLD=$'\033[1m'; CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'

if ! command -v node >/dev/null 2>&1; then
  echo -e "${CYAN}LeaxPanel${RESET}: Node.js is required but was not found in your PATH."
  echo "  Install Node.js 22+ from https://nodejs.org/en/download"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo -e "${CYAN}LeaxPanel${RESET}: dependencies are missing, running the installer first..."
  node scripts/bootstrap.js
fi

if [ ! -f .env ]; then
  echo -e "${CYAN}LeaxPanel${RESET}: no .env found, generating one..."
  node scripts/bootstrap.js
fi

PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '\r' || echo 3000)"
PORT="${PORT:-3000}"

if command -v pm2 >/dev/null 2>&1; then
  echo -e "${CYAN}LeaxPanel${RESET}: starting with PM2..."
  if pm2 describe leaxpanel >/dev/null 2>&1; then
    pm2 restart leaxpanel --update-env
  else
    pm2 start ecosystem.config.js --name leaxpanel
  fi
  pm2 save >/dev/null 2>&1 || true
  echo -e "${GREEN}LeaxPanel is running under PM2${RESET}"
else
  echo -e "${CYAN}LeaxPanel${RESET}: starting in the foreground (PM2 not found)..."
  exec node server.js
fi

# ------------------------------------------------------- access information --
EXTERNAL_IP=""
if command -v curl >/dev/null 2>&1; then
  EXTERNAL_IP="$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || curl -s --max-time 5 https://ifconfig.me 2>/dev/null || true)"
fi
if [ -z "$EXTERNAL_IP" ]; then
  EXTERNAL_IP="<your-server-ip>"
fi

echo
echo "  Dashboard:  http://localhost:${PORT}"
echo "  External:   http://${EXTERNAL_IP}:${PORT}"
echo "  Logs:       pm2 logs leaxpanel"
echo "  Stop:       pm2 stop leaxpanel"
