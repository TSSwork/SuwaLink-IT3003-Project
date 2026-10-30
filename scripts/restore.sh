#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh into the running production stack.
#
# Usage: scripts/restore.sh [--yes] [--env-file FILE] [-p PROJECT] DB_DUMP UPLOADS_TAR
#   e.g. scripts/restore.sh backups/db-20261030-023000.sql.gz backups/uploads-20261030-023000.tar.gz
#
# Replaces the whole database and every uploaded image, so it asks first; --yes skips
# the question. The db service must be running (docker compose up -d). Steps: stop the
# backend, drop and recreate MYSQL_DATABASE, load the dump, empty the uploads volume and
# unpack the archive into it (owned by the backend user, uid 10001), then start the
# backend and wait until it is healthy.
set -euo pipefail

# shellcheck source=lib/stack.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/stack.sh"

usage() { echo "usage: $0 [--yes] [--env-file FILE] [-p PROJECT] DB_DUMP UPLOADS_TAR" >&2; exit 2; }

ASSUME_YES=false
FILES=()
while (( $# )); do
  if parse_stack_option "$@"; then shift "$SHIFT_BY"; continue; fi
  case "$1" in
    -y|--yes) ASSUME_YES=true; shift ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) FILES+=("$1"); shift ;;
  esac
done
(( ${#FILES[@]} == 2 )) || usage

# Absolute paths before enter_stack changes directory
abs() { [[ -f "$1" && -r "$1" ]] || die "cannot read $1"; echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }
DB_DUMP="$(abs "${FILES[0]}")"
UPLOADS_TAR="$(abs "${FILES[1]}")"
enter_stack

log() { echo "restore: $*"; }

log "checking the backup files"
gzip -t "$DB_DUMP" || die "$DB_DUMP is not a valid gzip file"
gzip -dc "$DB_DUMP" | tail -n1 | grep -q '^-- Dump completed' || die "$DB_DUMP is not a complete mysqldump"
tar tzf "$UPLOADS_TAR" >/dev/null || die "$UPLOADS_TAR is not a valid .tar.gz"

VOLUME="$(uploads_volume)"
DATABASE="$(compose exec -T db printenv MYSQL_DATABASE)" || die "the db service is not running (docker compose up -d db)"

if [[ "$ASSUME_YES" != true ]]; then
  echo "This REPLACES database '$DATABASE' and every file in volume '$VOLUME' with:"
  echo "  $DB_DUMP"
  echo "  $UPLOADS_TAR"
  read -r -p "Type 'yes' to continue: " answer || answer=""
  [[ "$answer" == yes ]] || die "aborted, nothing was changed"
fi

log "stopping backend"
compose stop backend

log "recreating database $DATABASE"
# The $MYSQL_* variables are expanded by the db container from its own environment
# shellcheck disable=SC2016
compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root -e \
  "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`;"'

log "loading $(basename "$DB_DUMP")"
# shellcheck disable=SC2016
gzip -dc "$DB_DUMP" | compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"'

log "replacing the contents of volume $VOLUME"
docker run --rm -i -v "$VOLUME":/data "$HELPER_IMAGE" sh -c \
  'find /data -mindepth 1 -delete && tar xzf - -C /data && chown -R 10001:10001 /data' < "$UPLOADS_TAR"

log "starting backend and waiting until it is healthy"
# --no-recreate: start the stopped container as it was, without applying config changes
compose up -d --no-recreate --wait --wait-timeout 300 backend web

log "done"
