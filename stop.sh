#!/bin/bash

# FlowForge stop script
# Kills all services started by dev.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/logs"

echo "🛑 Stopping FlowForge services..."

for service in primary-backend hooks processor worker frontend; do
    PID_FILE="$LOGS/$service.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            echo "  ✅ Stopped $service (PID $PID)"
        else
            echo "  ⚠️  $service was not running"
        fi
        rm "$PID_FILE"
    else
        echo "  ⚠️  No PID file for $service"
    fi
done

echo "▶ Stopping PostgreSQL container..."
docker-compose -f "$ROOT/docker-compose.yml" stop postgres

echo "✅ All services stopped."
