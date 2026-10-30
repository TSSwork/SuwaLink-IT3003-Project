# SuwaLink

A marketplace connecting patients and pharmacies in Sri Lanka. Patients search medicines or
upload a prescription photo; nearby pharmacies respond with matching stock; patients compare and
reserve. See [`CONTEXT/PITCH_MVP.md`](CONTEXT/PITCH_MVP.md) for the full product pitch.

## Stack

- **Backend**: Spring Boot 4 (Java 25), Spring Security + JWT, Spring Data JPA/Hibernate, MySQL 8
  via Liquibase migrations, springdoc-openapi.
- **Frontend**: React 19 single-page app (TanStack Start in SPA mode, TanStack Router/Query, Tailwind CSS 4,
  shadcn/ui, react-i18next for English/Sinhala/Tamil, Leaflet + OpenStreetMap for maps). See
  [`CONTEXT/DESIGN.md`](CONTEXT/DESIGN.md) and [`CONTEXT/SPECS.md`](CONTEXT/SPECS.md).
- **Tests**: JUnit 5 + MockMvc against an in-memory H2 database, plus one Testcontainers test that applies the
  Liquibase changelog to MySQL 8 (needs a running Docker or Podman; see [`commands.md`](commands.md)).

## Quick start

```bash
# 1. Database
docker compose -f docker-compose.dev.yml up -d                     # MySQL on localhost:3308, Mailpit on localhost:8025

# 2. Backend (needs JDK 25; the dev profile is the default, no extra config needed)
cd backend && ./mvnw spring-boot:run     # http://localhost:8080

# 3. Web app (Node 22+; /api is proxied to the backend on :8080)
cd frontend && npm install && npm run dev   # http://localhost:3000
```

> **Migrations were squashed into a single baseline.** If your local database was created before that change, reset
> it once after pulling: `docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d` (this wipes local dev data).

Open `http://localhost:8080/swagger-ui/index.html` to
call every endpoint directly and inspect real request/response shapes.

Emails (e.g. password reset OTPs) are caught by Mailpit: open `http://localhost:8025`.
Production runs with `SPRING_PROFILES_ACTIVE=prod` and needs a `.env` (copy `.env.example`).

On startup an admin account is created if none exists. In the `dev` profile it is `admin@suwalink.local` with the
dev-only password in `application-dev.properties` (never use it elsewhere). In production, set `ADMIN_EMAIL` and
`ADMIN_PASSWORD` (at least 12 characters) in `.env`; optionally `ADMIN_NAME`.

**CORS note**: in dev the backend accepts browser calls from `http://localhost:3000` (the frontend dev server).
Change `app.cors.allowed-origins` in `backend/src/main/resources/application-dev.properties`, or set
`CORS_ALLOWED_ORIGINS` in production, if you serve it elsewhere.

More commands (tests, Liquibase, Docker debugging, smoke-test curls) are in
[`commands.md`](commands.md).

## Deployment

To run SuwaLink on a server, or as a showcase on your laptop, follow
[`README/DEPLOYMENT.md`](README/DEPLOYMENT.md): first-time setup with `docker compose up -d --build`,
HTTPS, updates, backups and restore, operations and troubleshooting. The production stack
(`docker-compose.yml`, project `suwalink-prod`) is separate from the dev stack above
(`docker-compose.dev.yml`, project `suwalink`).

## Documentation

| Doc | Covers |
|---|---|
| [`CONTEXT/PITCH_MVP.md`](CONTEXT/PITCH_MVP.md) | Product pitch, user journeys |
| [`CONTEXT/SPECS.md`](CONTEXT/SPECS.md) | Engineering standards, layered architecture |
| [`CONTEXT/DESIGN.md`](CONTEXT/DESIGN.md) | Material Design 3 + brand palette |
| [`README/READ_AUTHENTICATION_ENDPOINT.md`](README/READ_AUTHENTICATION_ENDPOINT.md) | Auth, JWT, roles, password reset |
| [`README/READ_INVENTORY_MODULE.md`](README/READ_INVENTORY_MODULE.md) | Pharmacy inventory, search |
| [`README/READ_PRESCRIPTION_MODULE.md`](README/READ_PRESCRIPTION_MODULE.md) | Prescription requests, responses |
| [`README/READ_RESERVATION_MODULE.md`](README/READ_RESERVATION_MODULE.md) | Reservations, pickup codes, hold and expiry |
| [`README/READ_ADMIN_MODULE.md`](README/READ_ADMIN_MODULE.md) | Admin dashboard, pharmacy verification |
| [`README/READ_NOTIFICATION_MODULE.md`](README/READ_NOTIFICATION_MODULE.md) | Notification events |
| [`README/DEPLOYMENT.md`](README/DEPLOYMENT.md) | Server setup, showcase, HTTPS, updates, backups, operations |
| [`README/DIAGRAMS.md`](README/DIAGRAMS.md) | ER, use case, class, sequence, activity, state diagrams |

## Project structure

```
backend/    Spring Boot API (com.suwalink)
frontend/   Web app (TanStack Start in SPA mode + React, Tailwind, shadcn/ui)
CONTEXT/    Product pitch, design system, specs
README/     Per-module technical docs + diagrams
```
