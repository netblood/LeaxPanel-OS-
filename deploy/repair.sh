#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "Missing .env" >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required" >&2; exit 1; }
docker compose config --quiet
docker compose up -d --remove-orphans
docker compose ps
curl --fail --silent http://127.0.0.1:8787/api/health/live >/dev/null
echo "LeaxPanel repair completed."
