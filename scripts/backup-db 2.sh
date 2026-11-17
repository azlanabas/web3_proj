#!/usr/bin/env bash
# Nightly compressed dump with 7-day rotation.
set -euo pipefail
ENV_FILE="${ENV_FILE:-/srv/web3proj/api/.env}"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
: "${MIGRATE_DATABASE_URL:?MIGRATE_DATABASE_URL missing}"

DIR=/srv/web3proj/backups
mkdir -p "$DIR"
STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT="$DIR/web3proj-$STAMP.dump"

pg_dump "$MIGRATE_DATABASE_URL" -Fc -f "$OUT"
find "$DIR" -name 'web3proj-*.dump' -mtime +7 -delete
echo "backup written: $OUT ($(du -h "$OUT" | cut -f1))"
