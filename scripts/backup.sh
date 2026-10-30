#!/usr/bin/env bash
# Backs up the production database and the uploaded images, then prunes old backups.
#
# Usage: scripts/backup.sh [--env-file FILE] [-p PROJECT]
#   Reads BACKUP_DIR (default ./backups, relative to the repo root) and BACKUP_KEEP_DAYS
#   (default 14, at least 1) from the environment or the env file (default .env).
#
# Writes, per run:
#   $BACKUP_DIR/db-YYYYmmdd-HHMMSS.sql.gz        mysqldump of MYSQL_DATABASE
#   $BACKUP_DIR/uploads-YYYYmmdd-HHMMSS.tar.gz   contents of the uploads volume
# and deletes db-*.sql.gz / uploads-*.tar.gz files older than BACKUP_KEEP_DAYS days.
# The pre-restore-* files scripts/restore.sh writes are never deleted; remove them by hand.
# Prints one summary line; exits non-zero on any failure, leaving no partial files.
#
# Nightly, from cron (keep a copy off this server too, e.g. rsync backups/ elsewhere).
# Run `mkdir -p backups` once first: cron opens the log before the script runs.
#   30 2 * * * cd /opt/suwalink && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

# shellcheck source=lib/stack.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/stack.sh"

while (( $# )); do
  if parse_stack_option "$@"; then shift "$SHIFT_BY"; continue; fi
  case "$1" in
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done
enter_stack

BACKUP_DIR="$(env_value BACKUP_DIR ./backups)"
KEEP_DAYS="$(env_value BACKUP_KEEP_DAYS 14)"
# At least 1: 0 would delete every earlier backup on each run
[[ "$KEEP_DAYS" =~ ^[1-9][0-9]*$ ]] \
  || die "BACKUP_KEEP_DAYS must be a whole number of days, 1 or more, got '$KEEP_DAYS'; nothing was changed"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
VOLUME="$(uploads_volume)"

# The dumps are written under .partial names and renamed when complete (lib/stack.sh);
# this also removes them if the run is interrupted
trap 'rm -f "$DB_FILE.partial" "$UPLOADS_FILE.partial"' EXIT
umask 077

dump_database "$DB_FILE"
dump_uploads "$VOLUME" "$UPLOADS_FILE"

# Retention: only this script's own files, older than KEEP_DAYS whole days
PRUNED="$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) \
  -mmin +$(( KEEP_DAYS * 1440 )) -print -delete | wc -l)"

size() { du -h "$1" | cut -f1; }
echo "backup ok $(date '+%F %T') db=$(basename "$DB_FILE") ($(size "$DB_FILE")) uploads=$(basename "$UPLOADS_FILE") ($(size "$UPLOADS_FILE")) pruned=$PRUNED keep_days=$KEEP_DAYS dir=$BACKUP_DIR"
