#!/bin/bash
# Detached launcher for the Next.js dev server + realtime mini-service.
# Uses disown + unset PID so the EXIT trap can't reap the children after
# the launching shell returns — the sandbox kills processes whose parent
# shell still references them on exit.
set -u

PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

# --- realtime mini-service (socket.io :3003 / bridge :3013) ---
RT_DIR="$PROJECT_DIR/mini-services/realtime"
(
  cd "$RT_DIR"
  exec bun run dev
) >"$PROJECT_DIR/realtime.log" 2>&1 &
RT_PID=$!
disown "$RT_PID" 2>/dev/null || true

# --- Next.js dev server (port 3000) ---
# Run next dev directly (not via `bun run dev`, which pipes through tee and
# breaks the detach). Logs go to dev.log.
(
  cd "$PROJECT_DIR"
  exec bun x next dev -p 3000
) >"$PROJECT_DIR/dev.log" 2>&1 &
DEV_PID=$!
disown "$DEV_PID" 2>/dev/null || true

# unset so any inherited EXIT trap can't kill them
unset DEV_PID RT_PID

# give the server a moment to bind before returning
sleep 1
echo "launched"
