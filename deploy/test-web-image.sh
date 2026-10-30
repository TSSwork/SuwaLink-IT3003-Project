#!/usr/bin/env bash
# Builds the web image (frontend + Caddy) and checks how it serves the SPA.
# The container runs alone: no backend, so /api is not checked here (Task 3 covers it).
#
# Usage: deploy/test-web-image.sh            (from the repo root or anywhere)
# Env:   DOCKER_HOST     e.g. unix:///run/user/1000/podman/podman.sock for rootless podman
#        WEB_TEST_PORT   host port to publish the container on (default 18090)
#        SKIP_BUILD=1    reuse an existing $IMAGE instead of building
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-suwalink-web:test-web-image}"
CONTAINER="suwalink-web-test-$$"
PORT="${WEB_TEST_PORT:-18090}"
BASE="http://localhost:${PORT}"
TMP="$(mktemp -d)"
failures=0

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

# fetch NAME PATH: headers to $TMP/NAME.h, body to $TMP/NAME.b, prints the status code
fetch() {
  curl -s -o "$TMP/$1.b" -D "$TMP/$1.h" -w '%{http_code}' "$BASE$2"
}

# header NAME HEADER: prints the header value (case-insensitive name, CR stripped)
header() {
  grep -i "^$2:" "$TMP/$1.h" | head -n1 | cut -d: -f2- | sed 's/^ *//' | tr -d '\r'
}

expect_status() { # NAME PATH WANT GOT
  if [[ "$4" == "$3" ]]; then pass "$2 -> $4"; else fail "$2 -> $4 (want $3)"; fi
}

expect_header() { # NAME HEADER WANT
  local got
  got="$(header "$1" "$2")"
  if [[ "$got" == "$3" ]]; then pass "$1: $2: $got"; else fail "$1: $2 is '${got}' (want '$3')"; fi
}

expect_shell() { # NAME
  if grep -q '<title>SuwaLink</title>' "$TMP/$1.b" && [[ "$(header "$1" Content-Type)" == text/html* ]]; then
    pass "$1 body is the SPA shell (text/html)"
  else
    fail "$1 body is not the SPA shell (Content-Type '$(header "$1" Content-Type)')"
  fi
}

if [[ "${SKIP_BUILD:-0}" != 1 ]]; then
  echo "== Building $IMAGE"
  # buildx with a docker-container builder needs --load to put the image in the local store
  if docker buildx version >/dev/null 2>&1; then
    docker build --load -t "$IMAGE" --build-context deploy="$REPO_ROOT/deploy" "$REPO_ROOT/frontend"
  else
    docker build -t "$IMAGE" --build-context deploy="$REPO_ROOT/deploy" "$REPO_ROOT/frontend"
  fi
fi

echo "== caddy validate inside the image"
if docker run --rm "$IMAGE" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >"$TMP/validate.log" 2>&1; then
  pass "caddy validate"
else
  fail "caddy validate"; cat "$TMP/validate.log"
fi

echo "== Starting $CONTAINER on port $PORT"
docker run -d --name "$CONTAINER" -p "127.0.0.1:${PORT}:80" "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  curl -s -o /dev/null "$BASE/" && break
  sleep 0.5
done

user="$(docker exec "$CONTAINER" id -u)"
if [[ "$user" != 0 ]]; then pass "runs as non-root (uid $user)"; else fail "runs as root"; fi

echo "== Requests"
code="$(fetch root /)";                          expect_status root / 200 "$code"; expect_shell root
code="$(fetch deeplink /pharmacy/requests/abc)"; expect_status deeplink /pharmacy/requests/abc 200 "$code"; expect_shell deeplink
expect_header deeplink Cache-Control "no-cache"
code="$(fetch reserve /r/ABC123)";               expect_status reserve /r/ABC123 200 "$code"; expect_shell reserve

code="$(fetch shell /_shell.html)";              expect_status shell /_shell.html 200 "$code"; expect_shell shell
expect_header shell Cache-Control "no-cache"
expect_header root Cache-Control "no-cache"

asset="$(grep -o '/assets/[^"]*\.js' "$TMP/root.b" | head -n1 || true)"
if [[ -z "$asset" ]]; then
  fail "no /assets/*.js referenced from the shell"
else
  code="$(fetch asset "$asset")";                expect_status asset "$asset" 200 "$code"
  expect_header asset Cache-Control "public, max-age=31536000, immutable"
fi

code="$(fetch missingasset /assets/does-not-exist.js)"
expect_status missingasset /assets/does-not-exist.js 404 "$code"
expect_header missingasset Cache-Control "no-store"

code="$(fetch robots /robots.txt)";              expect_status robots /robots.txt 200 "$code"
if [[ "$(header robots Cache-Control)" == *immutable* ]]; then fail "robots.txt is cached as immutable"; else pass "robots.txt not immutable"; fi

echo "== Security headers"
for name in root deeplink asset missingasset; do
  [[ -f "$TMP/$name.h" ]] || continue
  expect_header "$name" X-Content-Type-Options "nosniff"
  expect_header "$name" Referrer-Policy "strict-origin-when-cross-origin"
  expect_header "$name" X-Frame-Options "DENY"
  expect_header "$name" Permissions-Policy "camera=(self), geolocation=(self), microphone=()"
  if grep -qi '^Server:' "$TMP/$name.h"; then fail "$name: Server header present"; else pass "$name: no Server header"; fi
done

code="$(curl -s -o /dev/null -D "$TMP/gzip.h" -w '%{http_code}' -H 'Accept-Encoding: gzip' "$BASE/_shell.html")"
expect_header gzip Content-Encoding "gzip"

echo "== Access log"
docker logs "$CONTAINER" >"$TMP/stdout.log" 2>/dev/null
if grep -q '"logger":"http.log.access' "$TMP/stdout.log"; then
  pass "JSON access log on stdout"
else
  fail "no JSON access log line"; docker logs "$CONTAINER" 2>&1 | tail -n 5
fi

echo
if (( failures > 0 )); then
  echo "RESULT: $failures check(s) failed"
  exit 1
fi
echo "RESULT: all checks passed"
