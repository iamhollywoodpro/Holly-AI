#!/bin/bash
# =====================================================================
# ZCODE GOAL-MODE DATABASE INITIALIZATION ENGINE
# =====================================================================
echo "🚀 [ZCode Hook] Inspecting workspace database configuration..."

if [ -f .env ]; then
  echo "⚙️ Found active .env file. Parsing database variables..."
  DB_URL=$(grep -E "^DATABASE_URL=|^MONGODB_URI=|^REDIS_URL=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
else
  echo "⚠️ Warning: No .env file detected in repository root."
fi

DB_TYPE="none"

if [ -f package.json ]; then
  if grep -q '"prisma"' package.json || grep -q '"pg"' package.json || [[ "$DB_URL" == "postgres" ]]; then
    DB_TYPE="postgres"
  elif grep -q '"mongoose"' package.json || grep -q '"mongodb"' package.json || [[ "$DB_URL" == "mongodb" ]]; then
    DB_TYPE="mongodb"
  elif grep -q '"redis"' package.json || [[ "$DB_URL" == "redis" ]]; then
    DB_TYPE="redis"
  fi
elif [ -f requirements.txt ]; then
  if grep -q "psycopg2" requirements.txt; then DB_TYPE="postgres"; fi
  if grep -q "pymongo" requirements.txt; then DB_TYPE="mongodb"; fi
fi

if [ "$DB_TYPE" == "none" ]; then
  echo "ℹ️ No explicit database requirements detected. Skipping startup routine."
  exit 0
fi

echo "📦 Target dependency cluster detected: $DB_TYPE"

if [ -f docker-compose.yml ]; then
  echo "🐳 Found docker-compose.yml. Booting container network..."
  docker compose up -d
  exit 0
fi

case $DB_TYPE in
  postgres)
    if [ "$(docker ps -q -f name=zcode-local-postgres)" ]; then
      echo "✅ zcode-local-postgres container is already running."
    else
      echo "⚡ Starting isolated PostgreSQL container..."
      docker run --name zcode-local-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dev_db -p 5432:5432 -d postgres:16-alpine
      sleep 4
    fi
    ;;
  mongodb)
    if [ "$(docker ps -q -f name=zcode-local-mongo)" ]; then
      echo "✅ zcode-local-mongo container is already running."
    else
      echo "⚡ Starting isolated MongoDB container..."
      docker run --name zcode-local-mongo -p 27017:27017 -d mongo:latest
      sleep 3
    fi
    ;;
  redis)
    if [ "$(docker ps -q -f name=zcode-local-redis)" ]; then
      echo "✅ zcode-local-redis container is already running."
    else
      echo "⚡ Starting isolated Redis cache engine..."
      docker run --name zcode-local-redis -p 6379:6379 -d redis:alpine
      sleep 2
    fi
    ;;
esac

echo "🚀 Workspace environment synchronized. GLM 5.2 engine cleared to execute goal."
exit 0
