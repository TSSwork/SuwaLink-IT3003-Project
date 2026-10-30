#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh into the running production stack.
#
# Usage: scripts/restore.sh [--yes] [--env-file FILE] [-p PROJECT] DB_DUMP UPLOADS_TAR
#   e.g. scripts/restore.sh backups/db-20261030-023000.sql.gz backups/uploads-20261030-023000.tar.gz
#
# Replaces the whole database and every uploaded image, so it asks first; --yes skips
# the question. The db service must be running (docker compose up -d). Steps:
#   1. save the current database and photos to $BACKUP_DIR/pre-restore-*-<stamp> files
#      (never pruned by backup.sh), so the restore can be undone;
#   2. test-load the dump into a scratch database and check it, while the site keeps
#      running: a dump that does not load stops here, with nothing changed;
#   3. stop the backend, drop and recreate MYSQL_DATABASE, load the dump, empty the uploads
#      volume and unpack the archive into it (owned by the backend user, uid 10001);
#   4. start the backend and wait until it is healthy.
# If anything fails once step 3 has begun, it prints the command that puts the saved data back.
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
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
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
SCRATCH_DB="${DATABASE}_restore_check"

if [[ "$ASSUME_YES" != true ]]; then
  echo "This REPLACES database '$DATABASE' and every file in volume '$VOLUME' with:"
  echo "  $DB_DUMP"
  echo "  $UPLOADS_TAR"
  read -r -p "Type 'yes' to continue: " answer || answer=""
  [[ "$answer" == yes ]] || die "aborted, nothing was changed"
fi

# mysql as root inside the db container; the password never leaves it.
#   db_sql SQL            runs one statement
#   db_load DATABASE      loads the SQL on stdin into DATABASE
# shellcheck disable=SC2016
db_sql() { compose exec -T -e SQL="$1" db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root -N -B -e "$SQL"'; }
# shellcheck disable=SC2016
db_load() { compose exec -T -e TARGET_DB="$1" db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$TARGET_DB"'; }

# The command that undoes this restore, with the same stack options
STACK_OPTS="--env-file $(printf '%q' "$ENV_FILE")"
if (( ${#PROJECT_ARGS[@]} )); then STACK_OPTS+=" -p $(printf '%q' "${PROJECT_ARGS[1]}")"; fi

STEP="" LIVE_TOUCHED=false SCRATCH_CREATED=false
on_exit() {
  local status=$?
  if [[ "$SCRATCH_CREATED" == true ]]; then
    db_sql "DROP DATABASE IF EXISTS \`$SCRATCH_DB\`" >/dev/null 2>&1 \
      || echo "restore: could not drop the scratch database $SCRATCH_DB; drop it by hand" >&2
  fi
  if (( status != 0 )) && [[ "$LIVE_TOUCHED" == true ]]; then
    cat >&2 <<EOF

restore: FAILED while: $STEP
restore: the backend is STOPPED, and the database and photos may be half restored.
restore: the data from just before this restore was saved to:
  $PRE_DB
  $PRE_UPLOADS
restore: fix the cause above, then put that data back with:
  scripts/restore.sh --yes $STACK_OPTS $(printf '%q' "$PRE_DB") $(printf '%q' "$PRE_UPLOADS")
EOF
  fi
}
trap on_exit EXIT

step() { STEP="$*"; log "$*"; }

# ---- 1. Save the current data ---------------------------------------------------------
BACKUP_DIR="$(env_value BACKUP_DIR ./backups)"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
PRE_DB="$BACKUP_DIR/pre-restore-db-$STAMP.sql.gz"
PRE_UPLOADS="$BACKUP_DIR/pre-restore-uploads-$STAMP.tar.gz"
step "saving the current data to $(basename "$PRE_DB") and $(basename "$PRE_UPLOADS") in $BACKUP_DIR"
(umask 077; dump_database "$PRE_DB"; dump_uploads "$VOLUME" "$PRE_UPLOADS")

# ---- 2. Test-load the dump while the site keeps running ---------------------------------
step "test-loading $(basename "$DB_DUMP") into the scratch database $SCRATCH_DB"
db_sql "DROP DATABASE IF EXISTS \`$SCRATCH_DB\`; CREATE DATABASE \`$SCRATCH_DB\`;"
SCRATCH_CREATED=true
if ! gzip -dc "$DB_DUMP" | db_load "$SCRATCH_DB"; then
  die "$(basename "$DB_DUMP") does not load (the MySQL error is above). Nothing was changed: the site is still running on its current data."
fi
EXPECTED_TABLES="$(gzip -dc "$DB_DUMP" | grep -c '^CREATE TABLE ' || true)"
LOADED_TABLES="$(db_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SCRATCH_DB'")"
HAS_CHANGELOG="$(db_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SCRATCH_DB' AND UPPER(table_name)='DATABASECHANGELOG'")"
[[ "$LOADED_TABLES" == "$EXPECTED_TABLES" && "$HAS_CHANGELOG" == 1 ]] \
  || die "$(basename "$DB_DUMP") loaded $LOADED_TABLES of $EXPECTED_TABLES tables$( [[ "$HAS_CHANGELOG" == 1 ]] || echo ' and has no DATABASECHANGELOG table, so it is not a SuwaLink backup'). Nothing was changed: the site is still running on its current data."
db_sql "DROP DATABASE \`$SCRATCH_DB\`"
SCRATCH_CREATED=false
log "the dump loads cleanly ($LOADED_TABLES tables)"

# ---- 3. Replace the live data -----------------------------------------------------------
LIVE_TOUCHED=true
step "stopping backend"
compose stop backend

step "recreating database $DATABASE"
db_sql "DROP DATABASE IF EXISTS \`$DATABASE\`; CREATE DATABASE \`$DATABASE\`;"

step "loading $(basename "$DB_DUMP") into $DATABASE"
gzip -dc "$DB_DUMP" | db_load "$DATABASE"

step "replacing the contents of volume $VOLUME"
docker run --rm -i -v "$VOLUME":/data "$HELPER_IMAGE" sh -c \
  'find /data -mindepth 1 -delete && tar xzf - -C /data && chown -R 10001:10001 /data' < "$UPLOADS_TAR"

# ---- 4. Start -------------------------------------------------------------------------
step "starting backend and waiting until it is healthy"
# --no-recreate: start the stopped container as it was, without applying config changes
compose up -d --no-recreate --wait --wait-timeout 300 backend web

LIVE_TOUCHED=false
log "done (the data from before the restore is in $BACKUP_DIR/pre-restore-*-$STAMP.*; delete it when no longer needed)"
