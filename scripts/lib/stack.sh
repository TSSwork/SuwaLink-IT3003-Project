# shellcheck shell=bash
# Variables set here (SHIFT_BY, HELPER_IMAGE, ...) are read by the sourcing script.
# shellcheck disable=SC2034
#
# Shared by scripts/backup.sh, scripts/restore.sh and scripts/test-lib.sh; source it, do not run it.
#
# Compose resolves variables as usual: the shell environment first, then the env file
# (.env in the repo root, or the one given with --env-file / ENV_FILE). A project name
# given with -p / COMPOSE_PROJECT_NAME overrides the file's `name:`, so volume names are
# always read back from `docker compose config`, never assumed.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-}"
PROJECT_ARGS=()

# parse_stack_option ARG NEXT -> returns 0 and sets SHIFT_BY if ARG was a stack option
parse_stack_option() {
  case "$1" in
    --env-file) [[ -n "${2:-}" ]] || die "--env-file needs a file"; ENV_FILE="$2"; SHIFT_BY=2 ;;
    --env-file=*) ENV_FILE="${1#*=}"; SHIFT_BY=1 ;;
    -p|--project-name) [[ -n "${2:-}" ]] || die "$1 needs a name"; PROJECT_ARGS=(-p "$2"); SHIFT_BY=2 ;;
    --project-name=*) PROJECT_ARGS=(-p "${1#*=}"); SHIFT_BY=1 ;;
    *) return 1 ;;
  esac
}

die() { echo "$(basename "$0"): $*" >&2; exit 1; }

# Call after option parsing: makes the env file absolute and moves to the repo root
enter_stack() {
  if [[ -n "$ENV_FILE" ]]; then
    [[ -f "$ENV_FILE" ]] || die "env file not found: $ENV_FILE"
    ENV_FILE="$(cd "$(dirname "$ENV_FILE")" && pwd)/$(basename "$ENV_FILE")"
  fi
  cd "$ROOT" || exit 1
  if [[ -z "$ENV_FILE" ]]; then
    [[ -f .env ]] || die "no .env in $ROOT (copy .env.example), or pass --env-file"
    ENV_FILE="$ROOT/.env"
  fi
}

compose() { docker compose --env-file "$ENV_FILE" "${PROJECT_ARGS[@]}" "$@"; }

# env_value KEY [DEFAULT]: the shell environment wins, as in compose; then the env file.
# Parsed like compose: a quoted value ends at its closing quote; an unquoted one ends at
# the first " #" (inline comment) and is trimmed. Escapes inside quotes are not handled.
env_value() {
  local key="$1" default="${2:-}" line value
  if [[ -n "${!key:-}" ]]; then printf '%s' "${!key}"; return; fi
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?$key=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then printf '%s' "$default"; return; fi
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#"${value%%[![:space:]]*}"}"
  if [[ "$value" =~ ^\"([^\"]*)\" || "$value" =~ ^\'([^\']*)\' ]]; then
    value="${BASH_REMATCH[1]}"
  else
    value="${value%% #*}"
    value="${value%"${value##*[![:space:]]}"}"
  fi
  printf '%s' "${value:-$default}"
}

# The real name of the stack's uploads volume, e.g. suwalink-prod_uploads
uploads_volume() {
  local config name
  config="$(compose config --format json)" || die "docker compose config failed (is the env file complete?)"
  if command -v jq >/dev/null 2>&1; then
    name="$(jq -r '.volumes.uploads.name // empty' <<<"$config")"
  elif command -v python3 >/dev/null 2>&1; then
    name="$(python3 -I -c 'import json,sys; print(json.load(sys.stdin)["volumes"]["uploads"]["name"])' <<<"$config")"
  else
    die "jq or python3 is needed to read the volume name from docker compose config"
  fi
  [[ -n "$name" ]] || die "docker compose config has no uploads volume"
  docker volume inspect "$name" >/dev/null 2>&1 \
    || die "volume $name does not exist; start the stack first (docker compose up -d)"
  printf '%s' "$name"
}

# Throwaway container used to read and write the uploads volume
HELPER_IMAGE=docker.io/library/alpine:3.20

# dump_database FILE: gzipped mysqldump of MYSQL_DATABASE. Written as FILE.partial and
# renamed only when the dump is complete, so a failure leaves nothing that looks usable.
# The password is expanded inside the db container from its own environment, so it never
# appears in this host's process list.
dump_database() {
  local out="$1"
  # shellcheck disable=SC2016
  compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --single-transaction \
    --routines --triggers -u root "$MYSQL_DATABASE"' | gzip > "$out.partial" \
    || { rm -f "$out.partial"; die "database dump failed"; }
  gzip -dc "$out.partial" | tail -n1 | grep -q '^-- Dump completed' \
    || { rm -f "$out.partial"; die "database dump is incomplete"; }
  mv "$out.partial" "$out"
}

# dump_uploads VOLUME FILE: the volume's contents as a .tar.gz, streamed out of a throwaway
# container (no bind mount, so no SELinux relabelling or host-permission issues). Numeric
# owners are kept for the restore.
dump_uploads() {
  local volume="$1" out="$2"
  docker run --rm -v "$volume":/data:ro "$HELPER_IMAGE" tar czf - -C /data . > "$out.partial" \
    || { rm -f "$out.partial"; die "uploads archive failed"; }
  mv "$out.partial" "$out"
}
