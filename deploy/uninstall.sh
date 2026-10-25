#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

[[ "${LEAXPANEL_CONFIRM_UNINSTALL:-}" == "YES" ]] || { echo "Set LEAXPANEL_CONFIRM_UNINSTALL=YES to remove containers." >&2; exit 1; }
docker compose down
if [[ "${LEAXPANEL_DELETE_DATA:-NO}" == "YES" ]]; then
  docker compose down -v
  echo "Compose volumes removed."
else
  echo "Containers removed; data volumes were preserved."
fi
