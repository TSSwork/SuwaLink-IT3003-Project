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

Everything runs in Docker — no JDK or Python needed on your machine:

```bash
docker compose up -d --build
```

That brings up MySQL (localhost:3308), the backend (http://localhost:8080) and the frontend
(http://localhost:5500). `frontend/` is bind-mounted, so HTML/CSS/JS edits only need a refresh.

<details>
<summary>Or run the pieces on your host</summary>

```bash
# 1. Database
docker compose up -d mysql               # MySQL on localhost:3308

# 2. Backend (needs JDK 26)
cd backend && ./mvnw spring-boot:run     # http://localhost:8080

# 3. Frontend (must be port 5500 - see CORS note below)
cd frontend && python -m http.server 5500
```

</details>

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
| [`README/ARCHITECTURE.md`](README/ARCHITECTURE.md) | What every layer does — controllers, DTOs, services, repositories, `CurrentUserProvider` |
| [`README/READ_AUTHENTICATION_ENDPOINT.md`](README/READ_AUTHENTICATION_ENDPOINT.md) | Auth, JWT, roles, password reset |
| [`README/READ_INVENTORY_MODULE.md`](README/READ_INVENTORY_MODULE.md) | Pharmacy inventory, search |
| [`README/READ_PRESCRIPTION_MODULE.md`](README/READ_PRESCRIPTION_MODULE.md) | Prescription requests, responses |
| [`README/READ_ADMIN_MODULE.md`](README/READ_ADMIN_MODULE.md) | Admin dashboard, pharmacy verification |
| [`README/READ_NOTIFICATION_MODULE.md`](README/READ_NOTIFICATION_MODULE.md) | Notification events |
| [`README/DIAGRAMS.md`](README/DIAGRAMS.md) | ER, use case, class, sequence, activity, state diagrams |
| [`README/CONTRIBUTIONS.md`](README/CONTRIBUTIONS.md) | Who created which file, with dates and commits |

## Team contributions

Every file in the repo is listed against the person who created it, with the date and commit, in
[`README/CONTRIBUTIONS.md`](README/CONTRIBUTIONS.md). Headline numbers across 126 commits
(15 Jul – 5 Aug 2026):

| Team member | Commits | Files created | Lines added |
|---|---:|---:|---:|
| TSSwork | 61 | 115 | +10,264 |
| Kenura Gunarathna | 23 | 73 | +6,131 |
| Kaveesha Induwara | 26 | 13 | +560 |
| Chamith Madushan | 6 | 7 | +535 |
| Shehan Lakshitha | 8 | 7 | +389 |
| SASADA | 1 | 10 | +458 |

## Project structure

```
backend/    Spring Boot API (com.suwalink.IT3003)
frontend/   Static HTML/CSS/JS
CONTEXT/    Product pitch, design system, specs
README/     Per-module technical docs + diagrams
```

### Backend layers

A request falls straight down these layers, each with exactly one job:

| Package | Responsibility |
|---|---|
| `security/` | Validates the JWT and puts the caller in the security context. `CurrentUserProvider` then answers "who is logged in?" anywhere in the app — so no endpoint ever trusts a user ID sent by the client |
| `controller/` | HTTP only — URL, verb, `@Valid`, `@PreAuthorize`, status code. No business rules |
| `dto/` | The request/response shapes. Keeps the API decoupled from the tables, and is why the password hash can't leak |
| `service/` | Every business rule, plus the `@Transactional` boundary. Interface + `impl/` so tests can mock it |
| `repository/` | Spring Data interfaces — database access, no logic |
| `entity/` | The tables as Java objects, with audit columns and optimistic locking from `BaseAuditEntity` |
| `exception/` | Business-named exceptions + `GlobalExceptionHandler`, which maps any of them to a status code and a consistent error body |
| `event/` | Side effects (notifications) decoupled from the code that triggers them |
| `config/` | Security, CORS, static uploads, JPA auditing, DB startup wait |

[`README/ARCHITECTURE.md`](README/ARCHITECTURE.md) explains each of these properly, with real code
and a full request walkthrough.
