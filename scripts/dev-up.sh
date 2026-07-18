#!/usr/bin/env bash
# Stops any Docker container that isn't part of this project's compose stack
# (avoids port clashes, e.g. backend needs 8080), then starts SuwaLink's MySQL.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon isn't running. Start Docker Desktop first." >&2
  exit 1
fi

project_containers="$(docker compose ps -q 2>/dev/null || true)"

docker ps -q | while read -r id; do
  if ! grep -qx "$id" <<< "$project_containers"; then
    name="$(docker inspect --format '{{.Name}}' "$id" | sed 's#^/##')"
    echo "Stopping $name (not part of SuwaLink) to free its ports"
    docker stop "$id" >/dev/null
  fi
done

echo "Starting SuwaLink MySQL..."
docker compose up -d
docker compose ps
