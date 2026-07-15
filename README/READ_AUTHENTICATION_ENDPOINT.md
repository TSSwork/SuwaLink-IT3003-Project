# Authentication Module — What's Built, How to Use It

This covers the auth/onboarding module (registration, login, `/me`) that everyone else's
module (inventory, prescriptions, reservations) builds on top of. If you're adding a new
protected endpoint or need to know who's calling, read the "For other developers" section
near the bottom.

## Entities

**`users` table** (`com.suwalink.IT3003.entity.User`)

| Column   | Type              | Notes                              |
|----------|-------------------|-------------------------------------|
| id       | UUID (PK)         | generated (`@UuidGenerator`)        |
| name     | VARCHAR           | required                            |
| email    | VARCHAR, unique   | login identifier                    |
| phone    | VARCHAR           | required                            |
| password | VARCHAR           | BCrypt hash, never plain text       |
| role     | ENUM/STRING       | `CUSTOMER` or `PHARMACY_ADMIN`      |

**`pharmacies` table** (`com.suwalink.IT3003.entity.Pharmacy`)

| Column      | Type              | Notes                          |
|-------------|-------------------|----------------------------------|
| id          | UUID (PK)         | generated                       |
| licence_no  | VARCHAR, unique   | required                        |
| address     | VARCHAR           | required                        |
| is_verified | BOOLEAN           | default `false`; gates login    |
| user_id     | FK -> users.id    | one-to-one, `@OneToOne`         |

A pharmacy is an **extension of a user**, not a separate identity system — one `users` table
for both actor types, one login endpoint, one JWT-issuing path.

## Standard response envelope

Every endpoint (success or error) returns this shape:

```json
{ "success": true, "message": "...", "data": { } }
```

Errors use the same shape via `ApiErrorResponse` (`com.suwalink.IT3003.dto.response`), with an
optional `errors` array of `{ "field": "...", "message": "..." }` for validation failures.

## Endpoints

### `POST /api/auth/register/customer` — public

Registers a customer and **auto-logs them in** (same response shape as login).

Request:
```json
{ "name": "...", "email": "...", "phone": "...", "password": "..." }
```
Response (`201`):
```json
{
  "success": true,
  "message": "Registration successful",
  "data": { "token": "...", "role": "CUSTOMER", "id": "uuid", "name": "..." }
}
```
`409` if the email is already registered.

### `POST /api/auth/register/pharmacy` — public

Registers a pharmacy with `is_verified = false`. **No token issued** — pharmacies can't log in
until verified (verification itself is someone else's part; this module just respects the flag).

Request:
```json
{ "name": "...", "email": "...", "phone": "...", "password": "...", "licenceNo": "...", "address": "..." }
```
Response (`201`):
```json
{ "success": true, "message": "Registered. Awaiting verification.", "data": null }
```
`409` if the email is already registered.

### `POST /api/auth/login` — public

Single endpoint for both roles.

Request:
```json
{ "email": "...", "password": "..." }
```
Response (`200`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "...", "role": "CUSTOMER | PHARMACY_ADMIN", "id": "uuid", "name": "..." }
}
```
- `401` — bad credentials (also covers unknown email).
- `403` — pharmacy account not yet verified (`PharmacyNotVerifiedException`). Token is never
  issued in this case — enforced server-side, so no client can bypass it.

### `GET /api/users/me` — authenticated

Returns the current user's profile. `pharmacy` is `null` for customers.

Response (`200`):
```json
{
  "success": true,
  "message": "Current user profile",
  "data": {
    "id": "uuid", "name": "...", "email": "...", "phone": "...", "role": "PHARMACY_ADMIN",
    "pharmacy": { "id": "uuid", "licenceNo": "...", "address": "...", "verified": true }
  }
}
```
`401` if the token is missing/invalid/expired (`{"success":false,"message":"Authentication required"}`).

## Auth mechanics

- **JWT, stateless.** No sessions, no cookies, no refresh tokens (MVP scope). 24h expiry
  (`app.jwt.expiration-ms`). On expiry, clients are expected to just log in again.
- Password hashing: BCrypt via `PasswordEncoderFactories.createDelegatingPasswordEncoder()`.
- `permitAll`: `/api/auth/register/**`, `/api/auth/login`. Everything else requires a valid
  `Authorization: Bearer <token>` header — default-deny (`anyRequest().authenticated()`).
- Missing/invalid/expired token -> `401` (custom `JwtAuthenticationEntryPoint`, not Spring
  Security's 403 default). Real authorization denials (e.g. `PharmacyNotVerifiedException`)
  stay `403`. Don't conflate the two when adding new exception handling.

## For other developers: getting the current user

Don't parse JWTs yourself. Inject `com.suwalink.IT3003.security.CurrentUserProvider` and call
`getCurrentUser()` — it returns the `User` entity for whoever the request's Bearer token
resolved to:

```java
@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {
    private final CurrentUserProvider currentUserProvider;

    public void addMedicine(...) {
        User currentUser = currentUserProvider.getCurrentUser();
        // currentUser.getId(), currentUser.getRole(), etc.
    }
}
```

For pharmacy-only endpoints, look up the `Pharmacy` row via
`pharmacyRepository.findByUserId(currentUser.getId())` — there's no `pharmacyId` shortcut on
the user/JWT itself.

Role gating: use Spring Security annotations rather than manual `if` checks, e.g.
`@PreAuthorize("hasRole('PHARMACY_ADMIN')")` on the controller method (roles are exposed as
`ROLE_CUSTOMER` / `ROLE_PHARMACY_ADMIN` grants via `UserDetailsServiceImpl`).

## What's deliberately NOT built here (don't assume it exists)

- No refresh tokens, no session/token DB table.
- No admin-verification UI/endpoint — `is_verified` exists and login respects it, but flipping
  it to `true` is a separate module's job.
- No inventory, prescription, or reservation logic/tables.
- No password reset / email verification flow.
- No httpOnly-cookie auth.

## Frontend integration (`frontend/`)

- `assets/js/api/apiService.js` — central `fetch` wrapper. Attaches `Authorization: Bearer`,
  parses the `{success,message,data}` envelope, throws `ApiError` (with `.status` and
  `.errors`) on failure, clears the stored session and redirects to `login.html` on `401`.
- `assets/js/auth/auth.js` — `registerCustomer`, `registerPharmacy`, `login`, `logout`,
  `getCurrentAuth()`, `requireAuth()`, `redirectIfAuthenticated()`. Session is stored in
  `localStorage` under key `suwalink.auth` as `{ token, role, id, name }`.
- Pages: `login.html`, `register.html` (customer/pharmacy tabs), `index.html` (stub),
  `pharmacy-dashboard.html` (stub, calls `/api/users/me`).
- Styling: hand-rolled CSS implementing MD3 tokens (`assets/css/themes/tokens.css`), **light
  theme only** (dark mode was removed on purpose).

## Running it locally

1. **Database**: `docker compose up -d` (starts MySQL on the port/credentials in
   `docker-compose.yml`, currently `3308` / `suwalink_user` / `suwalink_db`). If you ever change
   those values in `docker-compose.yml` after the container's already been created once, you
   must `docker compose down -v && docker compose up -d` — Docker's MySQL image only applies
   `MYSQL_USER`/`MYSQL_DATABASE`/etc. on first init of an empty volume, not on every restart.
2. **Backend**: `cd backend && ./mvnw spring-boot:run`. Needs JDK 26 — if your default `java`
   isn't 26, set `JAVA_HOME` to whichever JDK 26 install you have before running Maven.
3. **Frontend**: it's plain static HTML/CSS/JS, so serve it with a simple static server rather
   than opening the files directly — from the `frontend/` directory:
   ```
   python -m http.server 5500
   ```
   This matters: the backend's CORS config (`app.cors.allowed-origins` in
   `application.properties`) only allows specific origins (`http://localhost:5500` by default).
   If you open `index.html` straight from disk (a `file://` URL) or serve it on a different
   port, the browser will block every API call with a CORS error. Either serve it on port 5500,
   or add whatever port you use to `app.cors.allowed-origins`.
