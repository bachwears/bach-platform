#!/usr/bin/env bash
# Nightly Supabase production dump with 30-day rotation (covers the no-PITR
# decision: restore granularity = last night). Cron: deploy user, 03:15 Beirut.
set -euo pipefail

BACKUP_DIR=/srv/bach/backup
# .env defines DATABASE_URL (session-pooler URL — IPv4-safe). Never in git.
source "$BACKUP_DIR/.env"

mkdir -p "$BACKUP_DIR/dumps"
STAMP=$(date +%Y-%m-%d_%H%M)
OUT="$BACKUP_DIR/dumps/bach_$STAMP.sql.gz"

docker run --rm --network host postgres:17-alpine \
  pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$OUT"

# Fail loudly on suspiciously small dumps (auth/network issue, empty output).
if [ "$(stat -c%s "$OUT")" -lt 10000 ]; then
  echo "backup suspiciously small: $OUT" >&2
  exit 1
fi

find "$BACKUP_DIR/dumps" -name 'bach_*.sql.gz' -mtime +30 -delete
echo "ok $OUT ($(du -h "$OUT" | cut -f1))"
