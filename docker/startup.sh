#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# HOLLY AI — Startup Script
#
# Intentionally minimal. DB schema is managed separately (prisma db push is
# a one-time operation, not a per-restart task). Running it on every cold
# start caused crash loops when the DB wasn't immediately reachable.
#
# Must use #!/bin/bash — Alpine's /bin/sh (busybox ash) lacks features needed
# by Node's startup environment. bash is installed via apk in the runner stage.
# ─────────────────────────────────────────────────────────────────────────────

set +e  # Never exit on error — prevent Docker restart loops

echo "============================================"
echo " HOLLY AI — Startup"
echo " $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " NODE_ENV = ${NODE_ENV:-not set}"
echo " PORT     = ${PORT:-3000}"
echo "============================================"

# Verify the standalone server exists before starting
if [ ! -f "./holly-server.js" ]; then
  echo "FATAL: holly-server.js not found in $(pwd)"
  echo "Files present:"
  ls -la
  # Sleep so logs are visible before Docker restarts
  sleep 30
  exit 1
fi

echo "Starting HOLLY server..."
exec node holly-server.js
