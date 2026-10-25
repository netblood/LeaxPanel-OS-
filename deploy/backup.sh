#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/postgres-${STAMP}.sql"
docker compose exec -T redis redis-cli --rdb /data/dump.rdb >/dev/null || true
docker compose cp redis:/data/dump.rdb "backups/redis-${STAMP}.rdb" 2>/dev/null || true
echo "Backup written to backups/*-${STAMP}.*"
