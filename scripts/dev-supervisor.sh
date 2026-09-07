#!/bin/bash
# Keeps the Next.js dev server alive — restarts it if it ever exits.
cd /home/z/my-project
while true; do
  bun run dev >> dev.log 2>&1
  echo "[$(date)] dev server exited with $? — restarting in 2s" >> dev.log
  sleep 2
done
