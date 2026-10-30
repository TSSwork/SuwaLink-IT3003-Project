#!/usr/bin/env bash
# Stops running Docker containers that could take SuwaLink's dev ports (e.g. the backend
# needs 8080), then starts SuwaLink's MySQL. Leaves alone the containers of any SuwaLink
# compose project (suwalink, suwalink-prod, suwalink-prod-test, ...) and the buildx builder.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon isn't running. Start Docker Desktop first." >&2
  exit 1
fi

docker ps -q | while read -r id; do
  info="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}|{{.Name}}' "$id")"
  project="${info%%|*}"
  name="${info#*|}"
  name="${name#/}"
  if [[ "$project" == suwalink* || "$name" == buildx_buildkit_* ]]; then
    continue
  fi
  echo "Stopping $name (not part of SuwaLink) to free its ports"
  docker stop "$id" >/dev/null
done

echo "Starting SuwaLink MySQL..."
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
