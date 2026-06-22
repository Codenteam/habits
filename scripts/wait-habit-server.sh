#!/usr/bin/env bash
# Start a habit cortex server and wait until the port is listening.
# Usage: ./scripts/wait-habit-server.sh <port> <config-path>
set -euo pipefail
PORT="$1"
CONFIG="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
sleep 1

cd "$ROOT"
pnpm nx cortex habits --config "$CONFIG" >"/tmp/habit-server-$PORT.log" 2>&1 &
PID=$!

for i in $(seq 1 60); do
  if lsof -ti:"$PORT" >/dev/null 2>&1; then
    if grep -q "running on" "/tmp/habit-server-$PORT.log" 2>/dev/null; then
      echo "ready $PID $PORT"
      exit 0
    fi
  fi
  sleep 1
done

echo "timeout waiting for port $PORT" >&2
kill "$PID" 2>/dev/null || true
exit 1
