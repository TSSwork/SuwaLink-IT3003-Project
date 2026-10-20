# SuwaLink Dev Commands Cheat Sheet

Reference for every day-to-day command needed to run and debug this project (DB, backend, frontend, Swagger, Liquibase, smoke tests). Run backend/Liquibase commands from the `backend/` directory unless noted.

## Database (MySQL via Docker)

```bash
docker compose up -d          # start MySQL + Mailpit (MySQL port 3308, db suwalink_db, user/pass suwalink_user/suwalink_password)
./scripts/dev-up.sh           # same, but first stops other Docker containers hogging ports (e.g. 8080)
docker compose ps             # check container status
docker compose down -v        # wipe DB volume — REQUIRED after changing creds in docker-compose.yml
                               # (the MySQL image only applies MYSQL_USER/DATABASE on first init of an empty volume)
```

After pulling the Liquibase squash (migrations collapsed into one baseline), reset your local DB once:
`docker compose down -v && docker compose up -d`.

## Backend (Spring Boot, needs JDK 25)

```bash
cd backend && ./mvnw spring-boot:run   # run the API (localhost:8080); dev profile is the default, nothing else to set
# Mailpit inbox (OTP emails in dev): http://localhost:8025
# Prod: SPRING_PROFILES_ACTIVE=prod with variables from .env (see .env.example)
cd backend && ./mvnw test              # run tests
cd backend && ./mvnw clean install     # full build + tests
```

`mvn test` needs a reachable container runtime: `SchemaMigrationTest` starts a throwaway MySQL 8 with Testcontainers.
Docker works as-is. With Podman, enable the user socket (`systemctl --user enable --now podman.socket`) and export
`DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock` before running Maven (if the Ryuk reaper container fails
to start, also set `TESTCONTAINERS_RYUK_DISABLED=true`).

If your default `java` isn't 25, set `JAVA_HOME` to a JDK 25 install before running Maven.

## Swagger / OpenAPI

Backend must be running first (`./mvnw spring-boot:run`).

- `http://localhost:8080/swagger-ui/index.html` — interactive API explorer
- `http://localhost:8080/v3/api-docs` — raw OpenAPI JSON

## Liquibase (migrations)

Schema is now version-controlled via Liquibase, not `ddl-auto` (`spring.jpa.hibernate.ddl-auto=validate` in `application.properties` — Hibernate only checks the schema matches, it never creates/alters tables anymore). Migrations live in `backend/src/main/resources/db/changelog/`:
- `db.changelog-master.xml` — the changelog Spring Boot loads on every boot (`spring.liquibase.change-log`)
- `sql/001-baseline.sql` — the full schema (incl. Envers `_aud`/`revinfo` audit tables): the earlier migrations 001–011 squashed into one file via `mysqldump --no-data`. It creates no users; the admin comes from `AdminBootstrap`
- `sql/002-reference-data.sql` — seed categories, manufacturers and medicines

**Applying migrations is automatic** — `./mvnw spring-boot:run` runs them on every startup, no separate command needed. The test profile (`application-test.properties`) disables Liquibase (`spring.liquibase.enabled=false`) since most tests run against H2 and this changelog is MySQL-specific; `SchemaMigrationTest` turns it back on against a MySQL 8 Testcontainer and runs Hibernate `validate` on the result.

**Adding a new migration** (when you change an entity): create `sql/00N-description.sql` with the raw `ALTER TABLE`/etc., add a matching `<changeSet>` to `db.changelog-master.xml`. This is manual — Liquibase doesn't auto-generate migrations from entity changes.

```bash
cd backend && ./mvnw liquibase:diff   # prints (doesn't write) a text diff between entities and the live DB — useful for spotting drift before hand-writing a migration; needs MySQL running on 3308
```

Note: `liquibase.properties` (used only by the `diff` command above) points at the same dev DB as `application.properties` — no separate staging config yet.

## Smoke-test curl commands

From `README/READ_AUTHENTICATION_ENDPOINT.md`. Backend must be running on `localhost:8080`.

```bash
# Register customer (auto-logs in, returns token)
curl -X POST http://localhost:8080/api/auth/register/customer -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@x.com","phone":"0770000000","password":"pass1234"}'

# Register pharmacy (no token issued, is_verified=false until someone approves it)
curl -X POST http://localhost:8080/api/auth/register/pharmacy -H "Content-Type: application/json" \
  -d '{"name":"Pharm","email":"pharm@x.com","phone":"0770000001","password":"pass1234","licenceNo":"LIC123","address":"Colombo"}'

# Login (both roles use this one endpoint)
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@x.com","password":"pass1234"}'

# Current user profile (needs Bearer token from register/login response)
curl http://localhost:8080/api/users/me -H "Authorization: Bearer <token>"
```

## Docker debugging

```bash
docker ps                                              # confirm mysql container is up
docker exec -it <mysql_container_name> mysql -u suwalink_user -psuwalink_password suwalink_db   # open MySQL client inside the container
docker compose logs -f mysql                           # tail MySQL container logs
```
