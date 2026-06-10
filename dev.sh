#!/bin/bash

# FlowForge local dev startup script
# Starts all services in background, logs to logs/ directory
# Usage: ./dev.sh
# Stop: ./stop.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

echo "🔧 Starting FlowForge dev environment..."

# ── Step 1: Start PostgreSQL via Docker ──────────────────────────────
echo "▶ Starting PostgreSQL..."
docker-compose -f "$ROOT/docker-compose.yml" up postgres -d

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec flowforge-postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL ready"

# ── Step 2: Build all services ────────────────────────────────────────
echo "▶ Building all services..."

for service in primary-backend hooks processor worker; do
    echo "  Building $service..."
    cd "$ROOT/$service"
    npm install --silent
    npx tsc -b 2>&1 | tee "$LOGS/$service-build.log"
done

echo "  Building frontend..."
cd "$ROOT/frontend"
npm install --silent

# ── Step 3: Run migrations + seed ────────────────────────────────────
echo "▶ Running database migrations..."
cd "$ROOT/primary-backend"
npx prisma migrate deploy 2>&1 | tee "$LOGS/migrate.log"

echo "▶ Seeding database..."
npx prisma db seed 2>&1 | tee "$LOGS/seed.log"

# ── Step 4: Start all services ────────────────────────────────────────
echo "▶ Starting services..."

cd "$ROOT/primary-backend"
node dist/index.js > "$LOGS/primary-backend.log" 2>&1 &
echo $! > "$LOGS/primary-backend.pid"
echo "  ✅ primary-backend started (port 3000) — PID $(cat $LOGS/primary-backend.pid)"

cd "$ROOT/hooks"
node dist/index.js > "$LOGS/hooks.log" 2>&1 &
echo $! > "$LOGS/hooks.pid"
echo "  ✅ hooks started (port 3002) — PID $(cat $LOGS/hooks.pid)"

cd "$ROOT/processor"
node dist/index.js > "$LOGS/processor.log" 2>&1 &
echo $! > "$LOGS/processor.pid"
echo "  ✅ processor started — PID $(cat $LOGS/processor.pid)"

cd "$ROOT/worker"
node dist/index.js > "$LOGS/worker.log" 2>&1 &
echo $! > "$LOGS/worker.pid"
echo "  ✅ worker started — PID $(cat $LOGS/worker.pid)"

cd "$ROOT/frontend"
npm run dev > "$LOGS/frontend.log" 2>&1 &
echo $! > "$LOGS/frontend.pid"
echo "  ✅ frontend started (port 3001) — PID $(cat $LOGS/frontend.pid)"

echo ""
echo "🚀 FlowForge is running!"
echo ""
echo "   Frontend:        http://localhost:3001"
echo "   Primary Backend: http://localhost:3000"
echo "   Hooks:           http://localhost:3002"
echo ""
echo "   Logs:  ./logs/<service>.log"
echo "   Stop:  ./stop.sh"
