#!/bin/sh
set -eu
: "${DATA_DIR:=/data}"
export DATA_DIR
mkdir -p "$DATA_DIR"
# Railway mounts volumes as root; hand the data directory to the runtime user.
if [ "$(id -u)" = 0 ]; then
  chown node:node "$DATA_DIR"
  exec gosu node sh "$0"
fi
# Every container writer holds this kernel lock, including after PID/host changes.
# flock releases automatically on termination; no time-based lease can expire mid-sale.
export AUTOLOOT_CONTAINER_LOCKED=1
exec flock --exclusive --nonblock --no-fork "$DATA_DIR/.container.lock" node scripts/runtime/container-start.mjs
