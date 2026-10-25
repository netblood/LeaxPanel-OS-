#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root on Ubuntu 22.04 or 24.04." >&2
  exit 1
fi

APP_DIR="${LEAXPANEL_DIR:-/opt/leaxpanel}"
apt-get update
apt-get install -y ca-certificates curl openssl docker.io docker-compose-plugin
systemctl enable --now docker
mkdir -p "${APP_DIR}"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  read -r -p "Admin email: " ADMIN_EMAIL
  read -r -s -p "Admin password: " ADMIN_PASSWORD
  echo
  cat > "${APP_DIR}/.env" <<EOF
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
DATABASE_URL=postgresql://leaxpanel:$(openssl rand -hex 24)@postgres:5432/leaxpanel
REDIS_URL=redis://redis:6379
APP_URL=https://panel.example.com
APP_DOMAIN=panel.example.com
TRAEFIK_EMAIL=ops@example.com
POSTGRES_DB=leaxpanel
POSTGRES_USER=leaxpanel
POSTGRES_PASSWORD=$(openssl rand -hex 24)
EOF
  chmod 600 "${APP_DIR}/.env"
fi

cd "${APP_DIR}"
docker compose up --build -d
docker compose ps
