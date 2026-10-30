#!/usr/bin/env bash
# Backup and restore drill for the production stack, on an isolated throwaway project.
#
# Usage (from anywhere): scripts/test-backup-restore.sh
#   Needs docker compose (or podman via DOCKER_HOST), curl, openssl and python3.
#
# 1. Starts the stack as project suwalink-prod-test on ports 8088/8443 with a generated,
#    git-ignored .env.prodtest (Mailpit UI on 127.0.0.1:18025 by default).
# 2. Creates a marker: a new customer and a prescription with a photo.
# 3. Runs scripts/backup.sh, and checks the retention rule on an old backup file.
# 4. Removes the stack with its volumes and starts it again on fresh volumes.
# 5. Runs scripts/restore.sh (a refused confirmation first, then --yes).
# 6. Checks the marker can sign in and the photo is identical.
# 7. Failed restores: a dump with bad SQL is refused with the live data untouched; a dump
#    that fails during the live load prints a command that undoes it, which is run and
#    checked; and backup.sh's retention keeps the pre-restore files.
# 8. Runs scripts/smoke.sh.
# Then tears everything down: containers, volumes, .env.prodtest and the backup files.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT=suwalink-prod-test
ENV_FILE=.env.prodtest
HTTP_PORT="${HTTP_PORT:-8088}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
MAILPIT_UI_PORT="${MAILPIT_UI_PORT:-18025}"
BASE_URL="http://localhost:$HTTP_PORT"

[[ ! -e "$ENV_FILE" ]] || { echo "refusing to overwrite an existing $ENV_FILE" >&2; exit 1; }

WORK="$(mktemp -d)"
BACKUP_DIR="$WORK/backups"
mkdir -p "$BACKUP_DIR"

compose() { docker compose --env-file "$ENV_FILE" -p "$PROJECT" --profile demo "$@"; }

cleanup() {
  local status=$?
  echo "---- teardown"
  if [[ -f "$ENV_FILE" ]]; then
    compose down -v --remove-orphans >/dev/null 2>&1 || echo "WARN  compose down -v failed" >&2
  fi
  rm -f "$ENV_FILE"
  rm -rf "$WORK"
  if (( status == 0 )); then echo "RESULT: backup/restore drill passed"; else echo "RESULT: drill FAILED" >&2; fi
}
trap cleanup EXIT

fail() { echo "FAIL  $*" >&2; exit 1; }
pass() { echo "PASS  $*"; }
step() { echo "---- $*"; }

[[ -x scripts/backup.sh ]] || fail "scripts/backup.sh is missing or not executable"
[[ -x scripts/restore.sh ]] || fail "scripts/restore.sh is missing or not executable"

secret() { openssl rand -base64 36 | tr -d '/+=\n' | cut -c1-40; }
ADMIN_EMAIL="drill-admin@example.invalid"
ADMIN_PASSWORD="Adm1n-$(secret)"
umask 077
cat > "$ENV_FILE" <<EOF
SITE_ADDRESS=http://localhost
HTTP_PORT=$HTTP_PORT
HTTPS_PORT=$HTTPS_PORT
MYSQL_DATABASE=suwalink_db
MYSQL_USER=suwalink_user
MYSQL_PASSWORD=$(secret)
MYSQL_ROOT_PASSWORD=$(secret)
JWT_SECRET=$(secret)$(secret)
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_NAME=Drill Admin
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_SMTP_AUTH=false
MAIL_SMTP_STARTTLS=false
DEMO_SEED_ENABLED=true
BACKUP_DIR=$BACKUP_DIR
BACKUP_KEEP_DAYS=14
MAILPIT_UI_PORT=$MAILPIT_UI_PORT
EOF
umask 022

# ---- HTTP helpers ------------------------------------------------------------------
BODY="$WORK/body"
# api METHOD PATH [curl args...] -> STATUS, body in $BODY
api() {
  local method="$1" path="$2"
  shift 2
  STATUS="$(curl -sS -o "$BODY" -w '%{http_code}' --max-time 30 -X "$method" "$@" "$BASE_URL$path")" \
    || fail "$method $path: no response"
}
# fetch_photo OUTPUT -> STATUS; the marker's prescription photo saved to OUTPUT
fetch_photo() {
  local BODY="$1"
  api GET "/api/images/$IMAGE_ID/content" -H "Authorization: Bearer $TOKEN"
}
# json_field DOTTED.PATH -> prints that value of the JSON in $BODY
json_field() {
  python3 -I -c 'import functools,json,sys; print(functools.reduce(lambda d,k: d[k], sys.argv[2].split("."), json.load(open(sys.argv[1]))))' "$BODY" "$1"
}
login() { # login EMAIL PASSWORD -> STATUS, TOKEN
  api POST /api/auth/login -H 'Content-Type: application/json' \
    --data-binary "{\"email\":\"$1\",\"password\":\"$2\"}"
  TOKEN=""
  if [[ "$STATUS" == 200 ]]; then TOKEN="$(json_field data.token)"; fi
}

start_stack() {
  compose up -d --build --wait --wait-timeout 600 >"$WORK/up.log" 2>&1 \
    || { tail -n 40 "$WORK/up.log" >&2; compose logs --tail 60 backend >&2 || true; fail "stack did not become healthy"; }
}

# ---- 1. Start ----------------------------------------------------------------------
step "1. start the stack (project $PROJECT, $BASE_URL)"
start_stack
pass "stack healthy"

# ---- 2. Marker -----------------------------------------------------------------------
step "2. create the marker customer and prescription"
login "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
[[ "$STATUS" == 200 ]] || fail "admin login: HTTP $STATUS"
api PUT /api/admin/settings -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data-binary '{"demoModePublic":true}'
[[ "$STATUS" == 200 ]] || fail "enable demo mode: HTTP $STATUS"

MARKER_EMAIL="drill-marker-$(date +%s)@example.invalid"
MARKER_PASSWORD="Marker-$(secret)"
api POST /api/auth/register/customer -H 'Content-Type: application/json' --data-binary \
  "{\"name\":\"Drill Marker\",\"email\":\"$MARKER_EMAIL\",\"phone\":\"0771234567\",\"password\":\"$MARKER_PASSWORD\",\"acceptTerms\":true}"
[[ "$STATUS" == 200 || "$STATUS" == 201 ]] || { cat "$BODY" >&2; fail "register marker: HTTP $STATUS"; }
TOKEN="$(json_field data.token)"

python3 -I - "$WORK/rx.png" <<'PY'
import struct, sys, zlib
w = h = 96
rows = b"".join(
    b"\x00" + b"".join(bytes(((x * 7 + y * 3) % 256, (x * y) % 256, (y * 5) % 256)) for x in range(w))
    for y in range(h))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) \
    + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")
open(sys.argv[1], "wb").write(png)
PY
api POST /api/prescriptions -H "Authorization: Bearer $TOKEN" \
  -F "image=@$WORK/rx.png;type=image/png" -F patientAge=42 -F "note=backup drill" \
  -F targetScope=ALL -F consent=true
[[ "$STATUS" == 201 ]] || { cat "$BODY" >&2; fail "create prescription: HTTP $STATUS"; }
IMAGE_ID="$(json_field data.imageId)"
fetch_photo "$WORK/photo-before"
[[ "$STATUS" == 200 ]] || fail "load photo before backup: HTTP $STATUS"
PHOTO_SHA="$(sha256sum "$WORK/photo-before" | cut -d' ' -f1)"
pass "marker $MARKER_EMAIL, prescription photo $IMAGE_ID (sha256 ${PHOTO_SHA:0:16})"

# ---- 3. Backup -----------------------------------------------------------------------
step "3. backup"
OLD_DB="$BACKUP_DIR/db-20000101-000000.sql.gz"
OLD_UP="$BACKUP_DIR/uploads-20000101-000000.tar.gz"
KEEP_LOG="$BACKUP_DIR/backup.log"
touch -d '20 days ago' "$OLD_DB" "$OLD_UP" "$KEEP_LOG"
scripts/backup.sh --env-file "$ENV_FILE" -p "$PROJECT" | tee "$WORK/backup.out"
grep -q '^backup ok' "$WORK/backup.out" || fail "backup.sh did not log its summary line"
DB_DUMP="" UPLOADS_TAR=""
for f in "$BACKUP_DIR"/db-*.sql.gz; do [[ "$f" == *20000101* ]] || DB_DUMP="$f"; done
for f in "$BACKUP_DIR"/uploads-*.tar.gz; do [[ "$f" == *20000101* ]] || UPLOADS_TAR="$f"; done
[[ -s "$DB_DUMP" && -s "$UPLOADS_TAR" ]] || fail "backup files missing or empty"
gzip -dc "$DB_DUMP" | grep -q "$MARKER_EMAIL" || fail "database dump lacks the marker account"
tar tzf "$UPLOADS_TAR" | grep -q . || fail "uploads archive is empty"
[[ ! -e "$OLD_DB" && ! -e "$OLD_UP" ]] || fail "retention kept backups older than 14 days"
[[ -e "$KEEP_LOG" ]] || fail "retention deleted a file that is not a backup (backup.log)"
pass "backup written: $(basename "$DB_DUMP") $(basename "$UPLOADS_TAR"); old backups pruned, log kept"

# ---- 4. Fresh volumes ----------------------------------------------------------------
step "4. down -v, then up on fresh volumes"
compose down -v >/dev/null 2>&1
start_stack
login "$MARKER_EMAIL" "$MARKER_PASSWORD"
[[ "$STATUS" == 401 ]] || fail "marker login on fresh volumes: expected 401, got $STATUS"
pass "fresh stack healthy; marker does not exist (401)"

# ---- 5. Restore ----------------------------------------------------------------------
step "5. restore"
if echo n | scripts/restore.sh --env-file "$ENV_FILE" -p "$PROJECT" "$DB_DUMP" "$UPLOADS_TAR" >"$WORK/refused.out" 2>&1; then
  fail "restore.sh went ahead although the confirmation was refused"
fi
login "$MARKER_EMAIL" "$MARKER_PASSWORD"
[[ "$STATUS" == 401 ]] || fail "refused restore changed the database (marker login $STATUS)"
pass "refused confirmation aborts without changes"

scripts/restore.sh --yes --env-file "$ENV_FILE" -p "$PROJECT" "$DB_DUMP" "$UPLOADS_TAR"
PRE_FILES=("$BACKUP_DIR"/pre-restore-db-*.sql.gz "$BACKUP_DIR"/pre-restore-uploads-*.tar.gz)
[[ -s "${PRE_FILES[0]}" && -s "${PRE_FILES[1]}" ]] || fail "restore did not save the data it replaced (pre-restore-*)"
pass "restore saved the replaced data first: $(basename "${PRE_FILES[0]}") $(basename "${PRE_FILES[1]}")"

# ---- 6. Verify -----------------------------------------------------------------------
step "6. verify"
login "$MARKER_EMAIL" "$MARKER_PASSWORD"
[[ "$STATUS" == 200 ]] || fail "marker login after restore: HTTP $STATUS"
pass "marker signs in after restore"
fetch_photo "$WORK/photo-after"
[[ "$STATUS" == 200 ]] || fail "load photo after restore: HTTP $STATUS"
[[ "$(sha256sum "$WORK/photo-after" | cut -d' ' -f1)" == "$PHOTO_SHA" ]] || fail "restored photo differs"
pass "prescription photo loads and is byte-identical"
OWNERS="$(compose exec -T backend sh -c 'find /app/uploads ! -user suwalink | wc -l')"
[[ "$OWNERS" == 0 ]] || fail "$OWNERS restored upload entries are not owned by the backend user"
pass "restored uploads owned by the backend user (uid 10001)"
# Proves the backend can still write there: a second prescription with a new photo
api POST /api/prescriptions -H "Authorization: Bearer $TOKEN" \
  -F "image=@$WORK/rx.png;type=image/png" -F patientAge=43 -F targetScope=ALL -F consent=true
[[ "$STATUS" == 201 ]] || { cat "$BODY" >&2; fail "new prescription after restore: HTTP $STATUS"; }
pass "backend writes new uploads after restore"

# ---- 7. Failed restores ---------------------------------------------------------------
step "7a. restore a dump that does not load (valid gzip and trailer, bad SQL)"
BAD_DUMP="$WORK/db-bad-sql.sql.gz"
gzip -dc "$DB_DUMP" | awk '/^CREATE TABLE /{n++} n==10 && !done {print "THIS IS NOT SQL;"; done=1} {print}' \
  | gzip > "$BAD_DUMP"
gzip -dc "$BAD_DUMP" | tail -n1 | grep -q '^-- Dump completed' || fail "test dump lost its trailer"
if scripts/restore.sh --yes --env-file "$ENV_FILE" -p "$PROJECT" "$BAD_DUMP" "$UPLOADS_TAR" >"$WORK/bad.out" 2>&1; then
  cat "$WORK/bad.out"; fail "restore.sh succeeded with a dump that does not load"
fi
cat "$WORK/bad.out"
grep -q 'does not load' "$WORK/bad.out" && grep -q 'Nothing was changed' "$WORK/bad.out" \
  || fail "failed restore did not say that nothing was changed"
login "$MARKER_EMAIL" "$MARKER_PASSWORD"
[[ "$STATUS" == 200 ]] || fail "marker login after the refused dump: HTTP $STATUS"
fetch_photo "$WORK/photo-bad"
[[ "$STATUS" == 200 && "$(sha256sum "$WORK/photo-bad" | cut -d' ' -f1)" == "$PHOTO_SHA" ]] \
  || fail "photo changed by the refused dump"
# shellcheck disable=SC2016
LEFTOVER="$(compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root -N -B -e "SHOW DATABASES LIKE '"'"'%restore_check'"'"'"')"
[[ -z "$LEFTOVER" ]] || fail "scratch database left behind: $LEFTOVER"
pass "bad dump refused before the backend was stopped; live data intact, scratch database dropped"

step "7b. restore a dump that fails only once the live data is replaced, then undo it"
# The extra table loads into the scratch database during the test load, but the scratch
# database is gone by the time the live load reaches that statement
LATE_DUMP="$WORK/db-fails-late.sql.gz"
{ gzip -dc "$DB_DUMP" | sed '$d'
  echo 'CREATE TABLE `suwalink_db_restore_check`.`drill_late_failure` (id int);'
  gzip -dc "$DB_DUMP" | tail -n1
} | gzip > "$LATE_DUMP"
if scripts/restore.sh --yes --env-file "$ENV_FILE" -p "$PROJECT" "$LATE_DUMP" "$UPLOADS_TAR" >"$WORK/late.out" 2>&1; then
  cat "$WORK/late.out"; fail "restore.sh succeeded although the live load failed"
fi
cat "$WORK/late.out"
grep -q 'FAILED while: loading' "$WORK/late.out" && grep -q 'the backend is STOPPED' "$WORK/late.out" \
  || fail "late failure did not name the step and the stopped backend"
UNDO="$(grep -A1 'put that data back with:' "$WORK/late.out" | tail -n1)"
[[ "$UNDO" == *"scripts/restore.sh --yes"*pre-restore-db-*pre-restore-uploads-* ]] || fail "no undo command printed"
echo "running the printed command:$UNDO"
eval "$UNDO"
login "$MARKER_EMAIL" "$MARKER_PASSWORD"
[[ "$STATUS" == 200 ]] || fail "marker login after running the printed undo command: HTTP $STATUS"
fetch_photo "$WORK/photo-undo"
[[ "$STATUS" == 200 && "$(sha256sum "$WORK/photo-undo" | cut -d' ' -f1)" == "$PHOTO_SHA" ]] \
  || fail "photo not back after the undo command"
pass "late failure names the step; the printed command brings the marker and photo back"

step "7c. retention never deletes pre-restore files"
touch -d '20 days ago' "$BACKUP_DIR"/pre-restore-*
scripts/backup.sh --env-file "$ENV_FILE" -p "$PROJECT" >/dev/null
PRE_LEFT="$(find "$BACKUP_DIR" -maxdepth 1 -name 'pre-restore-*' | wc -l)"
(( PRE_LEFT >= 4 )) || fail "retention deleted pre-restore files ($PRE_LEFT left)"
pass "$PRE_LEFT pre-restore files older than BACKUP_KEEP_DAYS kept"

# ---- 8. Smoke ------------------------------------------------------------------------
step "8. smoke"
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" ENV_FILE="$ENV_FILE" scripts/smoke.sh "$BASE_URL"
