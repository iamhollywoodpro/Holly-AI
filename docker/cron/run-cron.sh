#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# HOLLY Cron Runner
# Called by crond with: /run-cron.sh <path>
# Fires an authenticated HTTP POST to the Next.js API route
# ─────────────────────────────────────────────────────────────────────────────

PATH_ARG="$1"

if [ -z "$PATH_ARG" ]; then
  echo "[holly-cron] ERROR: no path argument supplied" >&2
  exit 1
fi

URL="${APP_URL}${PATH_ARG}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[holly-cron] ${TIMESTAMP} → POST ${URL}"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${URL}" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  --max-time 300 \
  --retry 2 \
  --retry-delay 10)

echo "[holly-cron] ${TIMESTAMP} ← HTTP ${RESPONSE} for ${PATH_ARG}"
