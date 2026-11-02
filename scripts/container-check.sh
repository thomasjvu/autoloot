#!/bin/sh
set -eu
image="autoloot-check:local"
container="autoloot-check-$$"
volume="autoloot-check-$$"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker build -t "$image" .
docker volume create "$volume" >/dev/null
docker run -d --name "$container" -p 127.0.0.1::4173 -v "$volume:/data" \
  -e AUTOLOOT_NODE_MODE=hosted -e PUBLIC_URL=https://shop.example.com \
  -e AUTOLOOT_OWNER_TWITCH_ID=123 -e TWITCH_CLIENT_ID=fixture \
  -e TWITCH_CLIENT_SECRET=fixture -e METADATA_MODE=demo "$image" >/dev/null
ready() {
  address=$(docker port "$container" 4173/tcp)
  attempt=0
  until curl --fail --silent -H 'Host: healthcheck.railway.app' "http://$address/api/health" >/dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 40 ]; then docker logs "$container"; return 1; fi
    sleep 1
  done
}
ready
docker exec "$container" test -s /data/autoloot.sqlite
# A kill leaves the previous SQLite writer marker. Replacement must recover it.
docker kill --signal KILL "$container" >/dev/null
docker start "$container" >/dev/null
ready
docker exec "$container" test -s /data/autoloot.sqlite
docker stop --time 35 "$container" >/dev/null
echo 'Container build, hosted health, persistent volume and forced restart passed.'
