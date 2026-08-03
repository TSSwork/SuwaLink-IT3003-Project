# SuwaLink

A marketplace connecting patients and pharmacies in Sri Lanka. Patients search medicines or
upload a prescription photo; nearby pharmacies respond with matching stock; patients compare and
reserve. See [`CONTEXT/PITCH_MVP.md`](CONTEXT/PITCH_MVP.md) for the full product pitch.

## Stack

- **Backend**: Spring Boot 4 (Java 26), Spring Security + JWT, Spring Data JPA/Hibernate, MySQL 8
  via Liquibase migrations, springdoc-openapi.
- **Frontend**: Plain HTML/CSS/vanilla JS (ES modules) + jQuery, Material Design 3 styling — no
  frontend framework. See [`CONTEXT/DESIGN.md`](CONTEXT/DESIGN.md).
- **Tests**: JUnit 5 + MockMvc against an in-memory H2 database.

## Quick start

```bash
# 1. Database
docker compose up -d                     # MySQL on localhost:3308

# 2. Backend (needs JDK 26)
cd backend && ./mvnw spring-boot:run     # http://localhost:8080

# 3. Frontend (must be port 5500 - see CORS note below)
cd frontend && python -m http.server 5500
```

Open `http://localhost:5500` for the app, or `http://localhost:8080/swagger-ui/index.html` to
call every endpoint directly and inspect real request/response shapes.

A bootstrap admin account is seeded automatically: `admin@suwalink.local` / `AdminPass123!`.

**CORS note**: the frontend must be served on port 5500 (or add your port to
`app.cors.allowed-origins` in `backend/src/main/resources/application.properties`) — opening the
HTML files directly (`file://`) or serving on another port gets every API call blocked.

More commands (tests, Liquibase, Docker debugging, smoke-test curls) are in
[`commands.md`](commands.md).

## Documentation

| Doc | Covers |
|---|---|
| [`CONTEXT/PITCH_MVP.md`](CONTEXT/PITCH_MVP.md) | Product pitch, user journeys |
| [`CONTEXT/SPECS.md`](CONTEXT/SPECS.md) | Engineering standards, layered architecture |
| [`CONTEXT/DESIGN.md`](CONTEXT/DESIGN.md) | Material Design 3 + brand palette |
| [`README/READ_AUTHENTICATION_ENDPOINT.md`](README/READ_AUTHENTICATION_ENDPOINT.md) | Auth, JWT, roles, password reset |
| [`README/READ_INVENTORY_MODULE.md`](README/READ_INVENTORY_MODULE.md) | Pharmacy inventory, search |
| [`README/READ_PRESCRIPTION_MODULE.md`](README/READ_PRESCRIPTION_MODULE.md) | Prescription requests, responses |
| [`README/READ_ADMIN_MODULE.md`](README/READ_ADMIN_MODULE.md) | Admin dashboard, pharmacy verification |
| [`README/READ_NOTIFICATION_MODULE.md`](README/READ_NOTIFICATION_MODULE.md) | Notification events |
| [`README/DIAGRAMS.md`](README/DIAGRAMS.md) | ER, use case, class, sequence, activity, state diagrams |

## Project structure

```
backend/    Spring Boot API (com.suwalink.IT3003)
frontend/   Static HTML/CSS/JS
CONTEXT/    Product pitch, design system, specs
README/     Per-module technical docs + diagrams
```
