# SuwaLink Dev Commands Cheat Sheet

Reference for every day-to-day command needed to run and debug this project (DB, backend, frontend, Swagger, Liquibase, smoke tests). Run backend/Liquibase commands from the `backend/` directory unless noted.

## Database (MySQL via Docker)

```bash
docker compose up -d          # start MySQL (port 3308, db suwalink_db, user/pass suwalink_user/suwalink_password)
./scripts/dev-up.sh           # same, but first stops other Docker containers hogging ports (e.g. 8080)
docker compose ps             # check container status
docker compose down -v        # wipe DB volume — REQUIRED after changing creds in docker-compose.yml
                               # (the MySQL image only applies MYSQL_USER/DATABASE on first init of an empty volume)
```

## Backend (Spring Boot, needs JDK 26)

```bash
cd backend && ./mvnw spring-boot:run   # run the API (localhost:8080)
cd backend && ./mvnw test              # run tests
cd backend && ./mvnw clean install     # full build + tests
```

If your default `java` isn't 26, set `JAVA_HOME` to a JDK 26 install before running Maven.

## Frontend (static server)

```bash
cd frontend && python -m http.server 5500
```

Must be port 5500 (or add your port to `app.cors.allowed-origins` in `application.properties`) — CORS blocks `file://` URLs and other ports.

## Swagger / OpenAPI

Backend must be running first (`./mvnw spring-boot:run`).

- `http://localhost:8080/swagger-ui/index.html` — interactive API explorer
- `http://localhost:8080/v3/api-docs` — raw OpenAPI JSON

## Liquibase (migrations)

Schema is now version-controlled via Liquibase, not `ddl-auto` (`spring.jpa.hibernate.ddl-auto=validate` in `application.properties` — Hibernate only checks the schema matches, it never creates/alters tables anymore). Migrations live in `backend/src/main/resources/db/changelog/`:
- `db.changelog-master.xml` — the changelog Spring Boot loads on every boot (`spring.liquibase.change-log`)
- `sql/001-baseline.sql` — the initial schema (12 tables incl. Envers `_aud`/`revinfo` audit tables), captured from Hibernate's own generated DDL via `mysqldump --no-data`, not hand-written

**Applying migrations is automatic** — `./mvnw spring-boot:run` runs them on every startup, no separate command needed. The test profile (`application-test.properties`) explicitly disables Liquibase (`spring.liquibase.enabled=false`) since tests run against H2 and this changelog is MySQL-specific.

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
