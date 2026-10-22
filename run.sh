#!/usr/bin/env bash
# ============================================================================
#  LeaxPanel(os) - Linux / macOS launcher
# ============================================================================
#  Starts the panel with PM2 when available, otherwise in the foreground.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BOLD=$'\033[1m'; CYAN=$'\033[36m'; GREEN=$'\033[32m'; RESET=$'\033[0m'

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
  echo "  Dashboard:  http://localhost:${PORT}"
  echo "  Logs:       pm2 logs leaxpanel"
  echo "  Stop:       pm2 stop leaxpanel"
else
  echo -e "${CYAN}LeaxPanel${RESET}: starting in the foreground (PM2 not found)..."
  echo "  Dashboard:  http://localhost:${PORT}"
  echo "  Health:     http://localhost:${PORT}/health"
  echo
  exec node server.js
fi
