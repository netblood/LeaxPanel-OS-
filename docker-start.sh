#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to start the production stack." >&2
  exit 1
fi
if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and fill every required value." >&2
  exit 1
fi

docker compose up --build -d
docker compose ps
