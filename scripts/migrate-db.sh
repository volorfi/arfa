#!/usr/bin/env bash
# Dump the existing Manus-hosted MySQL database and load it into the new
# Railway MySQL instance. Idempotent: safe to re-run while you iterate.
#
# Required env vars:
#   MANUS_DB_URL    e.g. mysql://user:pass@manus-host:3306/dbname
#   RAILWAY_DB_URL  e.g. mysql://user:pass@railway-host:3306/railway
#
# Prerequisites: mysql and mysqldump on PATH (brew install mysql-client).

set -euo pipefail

if [[ -z "${MANUS_DB_URL:-}" ]]; then
  echo "error: MANUS_DB_URL is not set" >&2
  exit 1
fi
if [[ -z "${RAILWAY_DB_URL:-}" ]]; then
  echo "error: RAILWAY_DB_URL is not set" >&2
  exit 1
fi

for bin in mysqldump mysql; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "error: $bin not found on PATH" >&2
    exit 1
  fi
done

# Parse a mysql:// URL into the flags mysql/mysqldump expect.
parse_url() {
  local url="$1"
  # Strip scheme.
  local rest="${url#mysql://}"
  rest="${rest#mysql+mysql2://}"
  local creds="${rest%%@*}"
  local hostpart="${rest#*@}"
  local user="${creds%%:*}"
  local pass="${creds#*:}"
  local hostport="${hostpart%%/*}"
  local dbname="${hostpart#*/}"
  dbname="${dbname%%\?*}"
  local host="${hostport%%:*}"
  local port="${hostport#*:}"
  if [[ "$port" == "$host" ]]; then
    port=3306
  fi

  echo "--host=$host --port=$port --user=$user --password=$pass $dbname"
}

SRC_ARGS=$(parse_url "$MANUS_DB_URL")
DST_ARGS=$(parse_url "$RAILWAY_DB_URL")

echo "==> Dumping source database..."
# shellcheck disable=SC2086
mysqldump --single-transaction --quick --routines --triggers --events \
  --set-gtid-purged=OFF --column-statistics=0 \
  $SRC_ARGS > /tmp/manus_dump.sql

echo "==> Loading into Railway database..."
# shellcheck disable=SC2086
mysql $DST_ARGS < /tmp/manus_dump.sql

rm -f /tmp/manus_dump.sql
echo "==> Done. Run 'DATABASE_URL=\"\$RAILWAY_DB_URL\" pnpm db:push' to apply new migrations."
