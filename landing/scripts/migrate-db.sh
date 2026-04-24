#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/migrate-db.sh
# Dumps your Manus MySQL database and restores it to Railway (or any target).
#
# Usage:
#   chmod +x scripts/migrate-db.sh
#   ./scripts/migrate-db.sh
#
# Required env vars (set inline or export beforehand):
#   MANUS_DB_URL   — full mysql:// URL from Manus dashboard
#   RAILWAY_DB_URL — full mysql:// URL from Railway MySQL plugin
# ─────────────────────────────────────────────────────────────────────────────

set -e

MANUS_DB_URL="${MANUS_DB_URL:?Set MANUS_DB_URL}"
RAILWAY_DB_URL="${RAILWAY_DB_URL:?Set RAILWAY_DB_URL}"
DUMP_FILE="/tmp/arfa_manus_dump_$(date +%Y%m%d_%H%M%S).sql"

# ── Parse a mysql:// URL into components ─────────────────────────────────────
parse_url() {
  local url="$1"
  # mysql://user:password@host:port/dbname
  local userpass host_port dbname
  url="${url#mysql://}"
  userpass="${url%%@*}"
  url="${url#*@}"
  host_port="${url%%/*}"
  dbname="${url##*/}"
  DB_USER="${userpass%%:*}"
  DB_PASS="${userpass#*:}"
  DB_HOST="${host_port%%:*}"
  DB_PORT="${host_port##*:}"
  DB_NAME="$dbname"
}

echo "═══════════════════════════════════════════════"
echo "  ARFA Database Migration: Manus → Railway"
echo "═══════════════════════════════════════════════"

# ── 1. Dump from Manus ────────────────────────────────────────────────────────
echo ""
echo "▶ Step 1/3 — Dumping Manus database..."
parse_url "$MANUS_DB_URL"
MANUS_USER="$DB_USER" MANUS_PASS="$DB_PASS" MANUS_HOST="$DB_HOST" MANUS_PORT="$DB_PORT" MANUS_NAME="$DB_NAME"

MYSQL_PWD="$MANUS_PASS" mysqldump \
  --host="$MANUS_HOST" \
  --port="$MANUS_PORT" \
  --user="$MANUS_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --no-tablespaces \
  "$MANUS_NAME" > "$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
echo "  ✓ Dump complete: $DUMP_FILE ($DUMP_SIZE)"

# ── 2. Restore to Railway ─────────────────────────────────────────────────────
echo ""
echo "▶ Step 2/3 — Restoring to Railway..."
parse_url "$RAILWAY_DB_URL"

MYSQL_PWD="$DB_PASS" mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME" < "$DUMP_FILE"

echo "  ✓ Restore complete"

# ── 3. Run new migrations ─────────────────────────────────────────────────────
echo ""
echo "▶ Step 3/3 — Applying new schema migrations..."
echo "  Run this command next:"
echo ""
echo "  DATABASE_URL=\"$RAILWAY_DB_URL\" pnpm db:push"
echo ""

rm -f "$DUMP_FILE"
echo "═══════════════════════════════════════════════"
echo "  ✓ Migration complete!"
echo "  Next: set all env vars in Railway dashboard"
echo "        then push to GitHub to trigger deploy"
echo "═══════════════════════════════════════════════"
