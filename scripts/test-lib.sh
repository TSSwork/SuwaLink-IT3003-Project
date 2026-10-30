#!/usr/bin/env bash
# Fast checks of the backup scripts' own logic; needs no containers.
#
# Usage: scripts/test-lib.sh
#   1. env_value (scripts/lib/stack.sh) reads .env values the way docker compose does.
#   2. scripts/backup.sh refuses a BACKUP_KEEP_DAYS that is not a whole number >= 1,
#      before it touches docker or deletes anything.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
FAILED=0

check() { # check LABEL EXPECTED ACTUAL
  if [[ "$2" == "$3" ]]; then echo "PASS  $1"; else echo "FAIL  $1: expected [$2], got [$3]" >&2; FAILED=1; fi
}

# ---- 1. env_value ------------------------------------------------------------------
# Expected values are what `docker compose config` makes of the same lines.
ENV_FILE="$WORK/probe.env"
cat > "$ENV_FILE" <<'EOF'
PLAIN=plain
COMMENTED=value # a comment
QUOTED_HASH="quoted # kept"
QUOTED_COMMENTED="quoted" # a comment
INNER_HASH=pa#ss
SINGLE='single' # a comment
SPACED=  spaced
LEADING_HASH=#hash
TWO_COMMENTS=val #c1 #c2
EMPTY=
export EXPORTED=exported
EOF
printf 'CRLF=crlf\r\n' >> "$ENV_FILE"

# shellcheck source=lib/stack.sh
source "$ROOT/scripts/lib/stack.sh"
check "plain value" plain "$(env_value PLAIN)"
check "unquoted value with ' # comment'" value "$(env_value COMMENTED)"
check "double-quoted value keeps #" "quoted # kept" "$(env_value QUOTED_HASH)"
check "double-quoted value then comment" quoted "$(env_value QUOTED_COMMENTED)"
check "# inside a word is kept" "pa#ss" "$(env_value INNER_HASH)"
check "single-quoted value then comment" single "$(env_value SINGLE)"
check "surrounding spaces trimmed" spaced "$(env_value SPACED)"
check "value starting with # is kept" "#hash" "$(env_value LEADING_HASH)"
check "only the first comment counts" val "$(env_value TWO_COMMENTS)"
check "empty value uses the default" fallback "$(env_value EMPTY fallback)"
check "missing key uses the default" fallback "$(env_value NOT_THERE fallback)"
check "export prefix" exported "$(env_value EXPORTED)"
check "CRLF line ending" crlf "$(env_value CRLF)"
check "shell environment wins" from-shell "$(PLAIN=from-shell env_value PLAIN)"

# ---- 2. BACKUP_KEEP_DAYS -----------------------------------------------------------
# A docker stub that records any call: a rejected value must stop before docker
mkdir -p "$WORK/bin" "$WORK/backups"
cat > "$WORK/bin/docker" <<EOF
#!/bin/sh
touch "$WORK/docker-called"
exit 99
EOF
chmod +x "$WORK/bin/docker"
OLD="$WORK/backups/db-20000101-000000.sql.gz"

for days in 0 00 -1 7x " " ""; do
  rm -f "$WORK/docker-called"
  touch -d '20 days ago' "$OLD"
  printf 'BACKUP_DIR=%s\nBACKUP_KEEP_DAYS="%s"\n' "$WORK/backups" "$days" > "$WORK/keep.env"
  status=0
  PATH="$WORK/bin:$PATH" "$ROOT/scripts/backup.sh" --env-file "$WORK/keep.env" >"$WORK/out" 2>&1 || status=$?
  label="BACKUP_KEEP_DAYS='$days'"
  if [[ -z "$days" ]]; then
    # Blank means "use the default (14)": accepted, so the run goes on to docker
    check "$label falls back to the default and reaches docker" yes "$([[ -e "$WORK/docker-called" ]] && echo yes || echo no)"
    continue
  fi
  check "$label is refused" refused "$( (( status != 0 )) && grep -q 'BACKUP_KEEP_DAYS must be a whole number of days, 1 or more' "$WORK/out" && echo refused || { cat "$WORK/out" >&2; echo "status=$status"; })"
  check "$label stops before docker" no "$([[ -e "$WORK/docker-called" ]] && echo yes || echo no)"
  check "$label deletes nothing" kept "$([[ -e "$OLD" ]] && echo kept || echo deleted)"
done

if (( FAILED )); then echo "RESULT: script checks FAILED" >&2; exit 1; fi
echo "RESULT: all script checks passed"
