#!/usr/bin/env bash
# Smoke test for a running SuwaLink stack, through its public entry (Caddy).
#
# Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... scripts/smoke.sh BASE_URL
#   e.g. scripts/smoke.sh http://localhost:8088
#
# Uses curl only. Stops at the first failing check and exits non-zero.
#
# The last check spends the login rate limit of this machine's IP (10 failed logins per
# 5 minutes). Running the script again within 5 minutes fails at the admin login with 429.
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... $0 BASE_URL" >&2
  exit 2
fi
BASE_URL="${BASE_URL%/}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL must be set}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD must be set}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
BODY="$TMP/body"
HEADERS="$TMP/headers"

fail() { echo "FAIL  $*" >&2; exit 1; }
pass() { echo "PASS  $*"; }

# request METHOD PATH [curl args...] -> sets STATUS and CTYPE; body in $BODY
request() {
  local method="$1" path="$2"
  shift 2
  STATUS="$(curl -sS -o "$BODY" -D "$HEADERS" -w '%{http_code}' --max-time 15 \
    -X "$method" "$@" "$BASE_URL$path")" || fail "$method $path: no response from $BASE_URL"
  CTYPE="$(grep -i '^content-type:' "$HEADERS" | tail -n1 | tr -d '\r' | cut -d' ' -f2- || true)"
}

expect_status() { [[ "$STATUS" == "$1" ]] || fail "$2: expected HTTP $1, got $STATUS"; }
expect_type() { [[ "$CTYPE" == *"$1"* ]] || fail "$2: expected Content-Type $1, got '${CTYPE:-none}'"; }

# Credentials may contain any character, so build the JSON with escaping
json_string() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '"%s"' "$s"
}

# 1. Home page
request GET /
expect_status 200 "GET /"
expect_type text/html "GET /"
pass "GET / -> 200 HTML"

# 2. Deep link into the SPA (prescription QR code route)
request GET /r/ABCDEFGHJK
expect_status 200 "GET /r/ABCDEFGHJK"
expect_type text/html "GET /r/ABCDEFGHJK"
pass "GET /r/ABCDEFGHJK -> 200 HTML (SPA fallback)"

# 3. Public settings from the backend through the proxy
request GET /api/settings/public
expect_status 200 "GET /api/settings/public"
expect_type application/json "GET /api/settings/public"
grep -q '"success":true' "$BODY" || fail "GET /api/settings/public: body lacks \"success\":true"
pass "GET /api/settings/public -> 200 JSON success:true"

# 4. Actuator stays internal
request GET /actuator/health
[[ "$STATUS" != "200" ]] || fail "GET /actuator/health: is publicly reachable (200)"
pass "GET /actuator/health -> $STATUS (not exposed)"

# 5. Admin login
request POST /api/auth/login -H 'Content-Type: application/json' \
  --data-binary "{\"email\":$(json_string "$ADMIN_EMAIL"),\"password\":$(json_string "$ADMIN_PASSWORD")}"
expect_status 200 "admin login"
TOKEN="$(grep -o '"token":"[^"]*"' "$BODY" | head -n1 | cut -d'"' -f4 || true)"
[[ -n "$TOKEN" ]] || fail "admin login: no token in response"
pass "admin login -> 200 with token"

# 6. Unknown API path is the backend's JSON 404, not the HTML shell. The backend answers
# unknown paths 401 until the caller is signed in, so ask with the token.
request GET /api/does-not-exist -H "Authorization: Bearer $TOKEN"
expect_status 404 "GET /api/does-not-exist"
expect_type application/json "GET /api/does-not-exist"
pass "GET /api/does-not-exist (authenticated) -> 404 JSON"

# 7. Authenticated admin call
request GET /api/admin/dashboard -H "Authorization: Bearer $TOKEN"
expect_status 200 "GET /api/admin/dashboard"
pass "GET /api/admin/dashboard (authenticated) -> 200"

# 8. A forged X-Forwarded-For must not reset the per-IP login limit. Each attempt uses a
# new email, so only the IP bucket (10 failures) can stop the 11th.
run_id="$(date +%s)-$$"
for i in $(seq 1 11); do
  request POST /api/auth/login -H 'Content-Type: application/json' \
    -H "X-Forwarded-For: 203.0.113.$i" \
    --data-binary "{\"email\":\"smoke-$run_id-$i@example.invalid\",\"password\":\"wrong-password\"}"
  [[ "$STATUS" == "401" || "$STATUS" == "429" ]] || fail "failed login $i: expected 401 or 429, got $STATUS"
done
expect_status 429 "11th failed login with forged X-Forwarded-For"
pass "11 failed logins with forged X-Forwarded-For -> 11th is 429"

echo "RESULT: all smoke checks passed"
