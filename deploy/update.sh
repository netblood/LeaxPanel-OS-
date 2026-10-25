#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

./deploy/backup.sh
docker compose config --quiet
docker compose build
docker compose up -d --remove-orphans
docker compose ps
curl --fail --silent http://127.0.0.1:8787/api/health/live >/dev/null
echo "LeaxPanel update completed."
