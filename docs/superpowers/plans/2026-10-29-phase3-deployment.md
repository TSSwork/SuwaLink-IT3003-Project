# Phase 3 — Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the full SuwaLink stack with Docker Compose on a small university VPS, or on `localhost` for the showcase. The stack is MySQL, the Spring Boot backend and Caddy, which serves the built web app and proxies `/api`. It uses one `.env`, keeps data on persistent volumes, has daily backups with restore, and a README a non-developer can follow.

**Architecture:**
- Three long-running services on one internal Docker network:
  - `db`: MySQL 8.4 with a named volume.
  - `backend`: a multi-stage image, Java 25 JRE, profile `prod`, uploads on a named volume. It publishes no ports.
  - `web`: a multi-stage image that builds the frontend with Node 22 and ships the static `dist/client` inside Caddy. Caddy is the only public entry.
- `mailpit` runs only under the compose profile `demo` and catches email for the showcase.
- Local development keeps its own compose file (MySQL and Mailpit only).

**Tech Stack:** Docker Compose v2 (works with podman's docker-compatible socket), MySQL 8.4 LTS, `eclipse-temurin:25` (JDK to build, JRE to run), Node 22, Caddy 2, Liquibase (existing), Spring Boot Actuator (health only).

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md`, §6 decision 7, §9.4 (upload volume), §9.9, §11, §14 (localhost showcase with Mailpit).

## Global Constraints

- **Secrets** come only from `.env`, which stays git-ignored. `.env.example` lists every variable with a comment. Nothing secret goes in compose files, Dockerfiles or images.
- **Backend exposure:** the backend is reachable only on the internal network. `server.forward-headers-strategy=framework` trusts X-Forwarded-For, so Caddy must be the sole entry and must set it.
- **Timezone:** the backend container runs with `TZ=Asia/Colombo`. `LocalDateTime` has no zone, and the frontend reads times as local. Keep `serverTimezone=UTC` in the JDBC URL, exactly as dev does.
- **SPA routing:** the entry is `/srv/_shell.html`. Every non-file path falls back to it, `/api/*` is proxied, and `/assets/*` is cached for a year as immutable. `_shell.html` is `no-cache`.
- **Upload size:** the backend multipart limit is 5 MB. Caddy's request body limit for `/api` is 6 MB.
- **Site address:** `SITE_ADDRESS` defaults to `http://localhost`. With a real domain, e.g. `suwalink.example.lk`, Caddy obtains HTTPS automatically. The in-app QR camera needs a secure context, so it works on `localhost` or HTTPS only; manual code entry works everywhere. Document this.
- **Ports:** `HTTP_PORT` (default 80) and `HTTPS_PORT` (default 443) are configurable, since rootless podman cannot bind below 1024 without a sysctl. Mailpit's UI binds only to `127.0.0.1:8025`.
- **Mail:** SMTP auth and STARTTLS are env-driven (`MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS`; default true in prod) so the same image works with Mailpit (false/false) and a real relay.
- **Containers:** run as a non-root user and set `restart: unless-stopped`. Every service has a healthcheck, and `depends_on` uses `condition: service_healthy`.
- **Commands:**
  - Backend tests: `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock ./mvnw -Dmaven.compiler.release= -Dmaven.compiler.source=25 -Dmaven.compiler.target=25 -q clean test` from `backend/`. Inside Docker the JDK image has `ct.sym`, so the normal `./mvnw package` works there.
  - Compose: `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock docker compose …`.
- **Leave the developer's running services alone:** dev MySQL on 3308, the dev backend on 8080, and static servers on 4173/4174. Test the prod stack on `HTTP_PORT=8088`, `HTTPS_PORT=8443`, under a separate compose project name (`-p suwalink-prod-test`), and tear it down with `down -v` afterwards. Never use `pkill -f`.
- Branch `feature/phase3-deployment` off `main`; one commit per task.

## Review Focus

1. **First start on an empty volume.** Liquibase must create the schema, the admin bootstrap must create the admin from `.env`, and the demo seed must run. A missing required variable (`JWT_SECRET`, `DB_PASSWORD`, `ADMIN_*`) must stop the backend with a clear log line, not crash-loop silently. Verified in Task 3's smoke run, and the README explains reading `docker compose logs backend`.
2. **Deep links and refresh.** Opening `/pharmacy/requests/<id>` or `/r/<code>` directly, or reloading on it, must serve the app, not a 404. Unknown `/api/...` paths must give the backend's JSON 404, not the HTML shell. Covered by the smoke script.
3. **Restart and redeploy keep data.** `docker compose down && up -d` (no `-v`) and image rebuilds must keep the database and uploaded prescription photos. Covered by the Task 3 smoke run and the Task 4 restore drill.
4. **Restore from a backup onto a fresh volume.** The restore must bring back users and photos, and the app must start against it. Liquibase must not fail on checksums. Covered by the Task 4 restore drill.
5. **Spoofed client IP.** A request to Caddy with a forged `X-Forwarded-For` must not bypass login rate limiting. Caddy replaces the header with the real client IP rather than appending, and the backend port is not published. Smoke check in Task 3.

---

### Task 1: Backend image, health endpoint, env-driven mail, inventory unique key

**Files:**
- Create `backend/Dockerfile` (multi-stage):
  - Build stage: `eclipse-temurin:25-jdk`. Copy the wrapper and `pom.xml` first and run `./mvnw -q dependency:go-offline` so the layer caches, then copy `src` and run `./mvnw -q -DskipTests package`.
  - Run stage: `eclipse-temurin:25-jre` with a non-root `suwalink` user, workdir `/app`, the jar at `/app/app.jar`, and `/app/uploads` owned by that user (`VOLUME`). Set `ENV TZ=Asia/Colombo SPRING_PROFILES_ACTIVE=prod UPLOAD_DIR=/app/uploads` and `EXPOSE 8080`.
  - `ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-jar","/app/app.jar"]`.
  - Healthcheck: `curl -fsS http://localhost:8080/actuator/health`. Verify that curl exists in the JRE image; install it in the run stage if not.
- Create `backend/.dockerignore`: `target/`, `uploads/`, `.idea`, `*.iml`, `.env*`.
- Modify `backend/pom.xml`: add `spring-boot-starter-actuator`.
- Modify `application.properties`:
  - `management.endpoints.web.exposure.include=health`, `management.endpoint.health.show-details=never`, `management.endpoint.health.probes.enabled=true`.
  - `spring.mail.properties.mail.smtp.auth=${MAIL_SMTP_AUTH:true}` and `spring.mail.properties.mail.smtp.starttls.enable=${MAIL_SMTP_STARTTLS:true}`. Remove the hard-coded pair from `application-prod.properties`; dev keeps Mailpit-friendly values.
- Modify `SecurityConfig`: permit `GET /actuator/health` (and `/actuator/health/**`). Caddy never proxies `/actuator`.
- Create a Liquibase changeset `015-inventory-unique-medicine` (follow the existing changelog layout and naming): unique constraint `uk_inventory_pharmacy_medicine` on (pharmacy_id, medicine_master_id), with a precondition that no duplicate pairs exist. On failure, halt with a clear message rather than silently skipping. The Phase 2C service guard stays as the friendly 409, and the constraint backs it.
- Modify `SchemaMigrationTest`: image `mysql:8.4`, to match prod.
- Tests:
  - `HealthEndpointTest`: anonymous `GET /actuator/health` → 200 `{"status":"UP"}`; `GET /actuator/env` → 401 or 404.
  - `SchemaMigrationTest` passes on 8.4 with 015.
  - `InventoryDuplicateTest` still passes.
  - A repository-level test: saving a second row for the same pharmacy and medicine throws `DataIntegrityViolationException`.

- [ ] **Step 1:** Write the failing tests and run them. Expected: FAIL (no actuator; no constraint).
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** The backend suite passes. `docker build -t suwalink-backend:test backend` succeeds. The image runs as non-root (`docker run --rm --entrypoint id suwalink-backend:test`), and `java -version` inside shows 25.
- [ ] **Step 4:** Commit `build(backend): container image, health endpoint, env-driven SMTP, unique inventory per medicine`.

### Task 2: Web image (frontend build + Caddy)

**Files:**
- Create `frontend/Dockerfile` (multi-stage):
  - Build stage: `node:22-alpine`, `npm ci`, then `npm run build`. Tests are not run in the image.
  - Run stage: `caddy:2-alpine`. Copy `dist/client` to `/srv` and `deploy/Caddyfile` to `/etc/caddy/Caddyfile`, and run as non-root if the image supports it. Caddy needs `/data` and `/config` writable, as named volumes in compose.
- Create `frontend/.dockerignore`: `node_modules`, `dist`, `.tanstack`, `coverage`, `.env*`.
- Create `deploy/Caddyfile`:
  - Site `{$SITE_ADDRESS:http://localhost}`.
  - `encode zstd gzip`.
  - `handle /api/*`: `request_body { max_size 6MB }`, then `reverse_proxy backend:8080` with `header_up X-Forwarded-For {remote_host}`. This replaces the header, so a client cannot inject IPs.
  - `handle`:
    - `root * /srv`;
    - `@assets path /assets/*` with `header @assets Cache-Control "public, max-age=31536000, immutable"`;
    - `try_files {path} /_shell.html`;
    - `file_server`;
    - `header /_shell.html Cache-Control "no-cache"`, also applied when the fallback serves it.
  - Security headers on all responses:
    - `X-Content-Type-Options nosniff`
    - `Referrer-Policy strict-origin-when-cross-origin`
    - `X-Frame-Options DENY`
    - `Permissions-Policy "camera=(self), geolocation=(self), microphone=()"`
    - No `Server` header.
  - Do not add a CSP in this phase. Note it in the README as a follow-up, since Leaflet tiles and inline styles need a tested policy.
  - JSON access log to stdout.
- Test (shell script `deploy/test-web-image.sh`, run in this task): build the image and run it alone with a stub upstream, a tiny `caddy respond` container or a `--add-host` to nothing. Then assert:
  - `/` → 200 HTML;
  - `/pharmacy/requests/abc` → 200 HTML (`_shell.html`);
  - `/assets/<some built file>` → 200 with the immutable cache header;
  - `/_shell.html` → `no-cache`;
  - security headers are present.
- Note: `/api` behaviour is verified in Task 3 with the real backend.

- [ ] **Step 1:** Write `deploy/test-web-image.sh` and run it. Expected: FAIL (no image).
- [ ] **Step 2:** Implement the Dockerfile and Caddyfile.
- [ ] **Step 3:** The script passes. Check that `caddy validate` runs in the image with the Caddyfile.
- [ ] **Step 4:** Commit `build(frontend): Caddy web image serving the SPA and proxying /api`.

### Task 3: Production compose, env template, smoke test

**Files:**
- Rename the current `docker-compose.yml` to `docker-compose.dev.yml` and drop the obsolete `version:` key. Update every reference: README quick start, `README/*.md`, `CONTEXT/*`, scripts. Grep for `docker compose up`.
- Create `docker-compose.yml` (prod) with services:
  - **`db`**:
    - `mysql:8.4`, env from `.env` (`MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`);
    - volume `db_data`;
    - healthcheck `mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD`;
    - no ports.
  - **`backend`**:
    - built from `./backend`, `env_file: .env`;
    - `DB_URL=jdbc:mysql://db:3306/${MYSQL_DATABASE}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`;
    - `DB_USERNAME=${MYSQL_USER}`, `DB_PASSWORD=${MYSQL_PASSWORD}`;
    - `CORS_ALLOWED_ORIGINS` and `FRONTEND_BASE_URL` default to `${SITE_ADDRESS}`;
    - volume `uploads:/app/uploads`;
    - `depends_on: db: service_healthy`;
    - no ports.
  - **`web`**:
    - built from `./frontend`, ports `${HTTP_PORT:-80}:80` and `${HTTPS_PORT:-443}:443`, `SITE_ADDRESS` from env;
    - volumes `caddy_data`, `caddy_config`;
    - `depends_on: backend: service_healthy`.
  - **`mailpit`**: under `profiles: ["demo"]`, ports `127.0.0.1:8025:8025` only.
  - Named volumes: `db_data`, `uploads`, `caddy_data`, `caddy_config`.
  - Every service: `restart: unless-stopped` and log rotation (`json-file`, `max-size 10m`, `max-file 3`).
- Rewrite `.env.example`, grouped and commented: site (`SITE_ADDRESS`, `HTTP_PORT`, `HTTPS_PORT`), database (`MYSQL_*`), security (`JWT_SECRET` with generate command), admin (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`), mail (`MAIL_*`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS`, `DEMO_MAIL_REDIRECT`), demo (`DEMO_SEED_ENABLED`), backups (`BACKUP_DIR`, `BACKUP_KEEP_DAYS`). Add a "showcase on localhost" block: `MAIL_HOST=mailpit`, port 1025, auth/starttls false, run with `--profile demo`.
  - Drop `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`/`UPLOAD_DIR` from the template, because compose derives them. Keep them documented as backend variables for non-compose runs.
- Create `scripts/smoke.sh BASE_URL`, using curl only. It exits non-zero on the first failure, with a message. It asserts:
  - `/` → 200 HTML;
  - `/r/ABCDEFGHJK` → 200 HTML;
  - `/api/settings/public` → 200 JSON `success:true`;
  - `/api/does-not-exist` → 404 JSON (not HTML);
  - `/actuator/health` via Caddy → not 200, since it is not exposed publicly;
  - login with `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env → 200 with token;
  - an authenticated `GET /api/admin/dashboard` → 200;
  - 11 failed logins sent with a forged `X-Forwarded-For` that changes each time → the 11th still answers 429 (Review Focus 5).
- Verification run (record the outputs in the report). Use a throwaway `.env.prodtest` with generated secrets, `SITE_ADDRESS=http://localhost`, `HTTP_PORT=8088`, `HTTPS_PORT=8443`, `-p suwalink-prod-test`, `--profile demo`:
  1. `up -d --build` → all healthy.
  2. `scripts/smoke.sh http://localhost:8088` passes.
  3. Sign in as the admin in a browser screenshot at 1280 px and view it.
  4. Missing-variable run: blank `JWT_SECRET` → the backend exits with a clear log line (Review Focus 1). Capture that line.
  5. Upload a prescription photo as the demo customer via the API, then `down` / `up -d` (no `-v`), and confirm the photo still loads (Review Focus 3).
  6. `down -v` and delete `.env.prodtest`.

- [ ] **Step 1:** Write `scripts/smoke.sh` and run it against nothing. Expected: FAIL.
- [ ] **Step 2:** Implement compose, env and the rename.
- [ ] **Step 3:** Complete the verification run.
- [ ] **Step 4:** Commit `build: production compose stack with Caddy, env template and smoke test`.

### Task 4: Backups and restore

**Files:**
- Create `scripts/backup.sh`:
  - Run from the repo root on the server, reading `.env`.
  - Steps:
    1. `docker compose exec -T db mysqldump --single-transaction --routines --triggers -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" | gzip > "$BACKUP_DIR/db-YYYYmmdd-HHMMSS.sql.gz"`.
    2. Tar the `uploads` volume through a throwaway container: `docker run --rm -v <project>_uploads:/data:ro -v "$BACKUP_DIR":/backup alpine tar czf /backup/uploads-<stamp>.tar.gz -C /data .`.
    3. Delete files older than `BACKUP_KEEP_DAYS` (default 14).
    4. Exit non-zero on any failure (`set -euo pipefail`), and log one summary line.
  - Default `BACKUP_DIR` is `./backups`, which is git-ignored.
- Create `scripts/restore.sh DB_DUMP UPLOADS_TAR`:
  - It asks for confirmation; `--yes` skips the prompt.
  - It stops `backend`, recreates the database, then pipes the dump into `mysql`.
  - It empties the uploads volume and untars into it, then starts `backend` again and waits for it to be healthy.
- Document a cron line, e.g. `30 2 * * * cd /opt/suwalink && ./scripts/backup.sh >> backups/backup.log 2>&1`, and recommend copying `backups/` off the VPS.
- Restore drill (record outputs in the report), with the same throwaway project and `.env.prodtest` approach as Task 3:
  1. Start the stack.
  2. Create a marker: a customer account, plus a prescription with a photo.
  3. Run a backup.
  4. `down -v`, then `up -d` on fresh volumes.
  5. Run a restore.
  6. Check the marker account can log in, the photo loads, and the smoke test passes.
  7. Tear down.
- Shell hygiene: run `shellcheck` on all scripts if it's available; otherwise use `bash -n`.

- [ ] **Step 1:** Write the drill as `scripts/test-backup-restore.sh` and run it. Expected: FAIL (scripts missing).
- [ ] **Step 2:** Implement `backup.sh` and `restore.sh`.
- [ ] **Step 3:** The drill passes.
- [ ] **Step 4:** Commit `ops: database and uploads backup with retention, and restore`.

### Task 5: Deployment documentation

**Files:**
- Create `README/DEPLOYMENT.md`, written for a non-developer, with copy-paste commands:
  1. **Requirements:** a VPS with 2 GB RAM, 2 vCPU and 20 GB disk; Docker Engine + Compose v2; ports 80/443 open; optional domain with DNS A record.
  2. **First-time setup:** clone to `/opt/suwalink`, `cp .env.example .env`, fill it in (generate secrets with `openssl rand`), `docker compose up -d --build`, watch `docker compose logs -f backend` until started, open the site, sign in as admin.
  3. **Showcase on localhost:** `--profile demo`, Mailpit at `http://localhost:8025`, demo mode switch, "Reset demo data" before presenting.
  4. **HTTPS and domains:** set `SITE_ADDRESS` to the domain. With only an IP there is no HTTPS, so phone cameras can't scan in-app; manual code entry and the phone's own camera app (the QR encodes a URL) still work.
  5. **Updating:** `git pull && docker compose up -d --build`. Migrations run automatically.
  6. **Backups and restore:** cron, off-site copy, restore steps, and the drill.
  7. **Operations:** logs, restarting one service, disk usage, and rotating `JWT_SECRET` (signs everyone out).
  8. **Troubleshooting:** backend won't start (missing env, DB not healthy), 502 from Caddy, emails not arriving, demo accounts can't log in (demo mode off).
  9. **Security notes:**
     - The backend port is never published.
     - Change the admin password after first login.
     - Keep `.env` at mode 600.
     - CSP is a follow-up.
     - Revoke the old Gmail app password leaked in git history.
- Modify `README.md`: add a Deployment section linking `README/DEPLOYMENT.md`, and update the quick start to use `docker compose -f docker-compose.dev.yml up -d`.
- Modify `.gitignore`: `backups/`, `.env.*` except `.env.example`.
- No tests. Verification: an independent dry read. Follow the doc's first-time setup literally on the throwaway project (ports 8088/8443), using only the commands as written, and note any step that needed knowledge not in the doc. Fix those steps, then tear down.

- [ ] **Step 1:** Write the docs.
- [ ] **Step 2:** Do the literal dry run and fix any gaps.
- [ ] **Step 3:** Commit `docs: deployment, showcase and operations guide`.
