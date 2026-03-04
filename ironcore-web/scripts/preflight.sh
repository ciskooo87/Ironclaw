#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/8] Checking required files..."
for f in .env.example docs/RELEASE_CHECKLIST.md docs/GO_LIVE_QUICKSTART.md; do
  [[ -f "$f" ]] || { echo "Missing $f"; exit 1; }
done

if [[ ! -f .env ]]; then
  echo "WARN: .env not found (copy .env.example -> .env)"
fi

echo "[2/8] Node + npm versions"
node -v
npm -v

echo "[3/8] Install deps"
npm ci >/dev/null

echo "[4/8] Build"
npm run build >/dev/null

echo "[5/8] Check migration files"
ls -1 db/migrations/*.sql

echo "[6/8] Validate env vars (non-blocking)"
missing=0
for key in DATABASE_URL TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID WHATSAPP_WEBHOOK_URL SMTP_HOST SMTP_USER SMTP_PASS SMTP_TO; do
  if [[ -z "${!key:-}" ]]; then
    echo "WARN: $key is empty"
    missing=$((missing+1))
  fi
done

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[7/8] DB connectivity check"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -c 'select now();' >/dev/null && echo "DB OK" || echo "DB check failed"
  else
    echo "WARN: psql not installed, skipping DB check"
  fi
else
  echo "[7/8] DB connectivity check skipped (DATABASE_URL missing)"
fi

echo "[8/8] Summary"
echo "Preflight done. Missing optional integration env count: $missing"
