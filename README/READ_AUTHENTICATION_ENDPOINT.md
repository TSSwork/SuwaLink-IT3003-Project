# Authentication Module — What's Built, How to Use It

This covers the auth/onboarding module (registration, login, `/me`) that everyone else's
module (inventory, prescriptions, reservations) builds on top of. If you're adding a new
protected endpoint or need to know who's calling, read the "For other developers" section
near the bottom.

## Entities

**`users` table** (`com.suwalink.entity.User`)

| Column   | Type              | Notes                              |
|----------|-------------------|-------------------------------------|
| id       | UUID (PK)         | generated (`@UuidGenerator`)        |
| name     | VARCHAR           | required                            |
| email    | VARCHAR, unique   | login identifier                    |
| phone    | VARCHAR           | required                            |
| password | VARCHAR           | BCrypt hash, never plain text       |
| role     | ENUM/STRING       | `CUSTOMER` or `PHARMACY_OWNER`      |

**`pharmacies` table** (`com.suwalink.entity.Pharmacy`)

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

Errors use the same shape via `ApiErrorResponse` (`com.suwalink.dto.response`), with an
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
{ "name": "...", "email": "...", "phone": "...", "password": "...", "licenceNo": "...", "address": "...",
  "pharmacyName": "...", "district": "KANDY", "city": "...", "latitude": 7.2906, "longitude": 80.6337,
  "openingHours": "Mon-Sat 8am-8pm" }
```
`pharmacyName`, `district`, `city`, `latitude`, `longitude` are required; `openingHours` is optional
(max 255 chars). `district` is a Sri Lanka district name (case-insensitive). Coordinates must be
within Sri Lanka: `latitude` 5.85 to 9.90, `longitude` 79.50 to 81.95 (otherwise `400`).
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
  "data": { "token": "...", "role": "CUSTOMER | PHARMACY_OWNER", "id": "uuid", "name": "..." }
}
```
- `401` — bad credentials (also covers unknown email).
- `403` — pharmacy account not yet verified (`PharmacyNotVerifiedException`). Token is never
  issued in this case — enforced server-side, so no client can bypass it.
- `403` — "Demo accounts are currently disabled": the account is a demo account and demo mode is
  switched off (see `READ_INVENTORY_MODULE.md`, Search & offers).

### `GET /api/users/me` — authenticated

Returns the current user's profile. `pharmacy` is `null` for customers.

Response (`200`):
```json
{
  "success": true,
  "message": "Current user profile",
  "data": {
    "id": "uuid", "name": "...", "email": "...", "phone": "...", "role": "PHARMACY_OWNER",
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

Don't parse JWTs yourself. Inject `com.suwalink.security.CurrentUserProvider` and call
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
`@PreAuthorize("hasRole('PHARMACY_OWNER')")` on the controller method (roles are exposed as
`ROLE_CUSTOMER` / `ROLE_PHARMACY_OWNER` grants via `UserDetailsServiceImpl`).

## What's deliberately NOT built here (don't assume it exists)

- No refresh tokens, no session/token DB table.
- No httpOnly-cookie auth.
- No email verification flow (password reset now exists — see below).

## What's now built elsewhere (this doc used to say these didn't exist — they do now)

- Pharmacy verification: `is_verified` (boolean) was replaced by a `PharmacyStatus` enum
  (`PENDING`/`VERIFIED`/`REJECTED`). Admins approve/reject via `PUT /api/admin/pharmacies/{id}/approve`
  and `.../reject` (see `READ_ADMIN_MODULE.md`); login still checks `status == VERIFIED`.
- Password reset via email OTP: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`
  (both `permitAll`). `forgotPassword` always returns the same generic success response whether or
  not the email is registered, to avoid leaking which emails have accounts. Requires
  `GMAIL_USERNAME`/`GMAIL_APP_PASSWORD` env vars to actually send mail (see `application.properties`);
  without them, `/forgot-password` returns a `502` instead of crashing.
  `resetPassword` answers an unknown email, no pending reset, an expired code and a wrong code identically
  (`400 VALIDATION_FAILED`, message `Invalid code`), so it does not reveal which emails have accounts either.
  A reset code allows 5 wrong attempts; the 5th wrong one clears the code (request a new one). Issuing a
  code resets the counter (`users.reset_otp_attempts`, changeset 014).
- Rate limits (in-memory, `RateLimitFilter`, `app.rate-limit.*`): login 10 failed attempts per IP and 5 per
  email per 5 min (successful logins are not counted); register 5 per IP per hour; forgot-password 10 per IP
  and 3 per email per hour; reset-password 20 per IP and 10 per email per 15 min. Over the limit: 429
  `RATE_LIMITED` with `Retry-After`.
- Inventory, prescription-request, prescription-response, and reservation logic/tables all exist
  now — see `READ_INVENTORY_MODULE.md`, `READ_PRESCRIPTION_MODULE.md`, and the
  `PrescriptionResponse`/`Reservation` entities/controllers.

## Running it locally

1. **Database**: `docker compose up -d` (starts MySQL on the port/credentials in
   `docker-compose.yml`, currently `3308` / `suwalink_user` / `suwalink_db`). If you ever change
   those values in `docker-compose.yml` after the container's already been created once, you
   must `docker compose down -v && docker compose up -d` — Docker's MySQL image only applies
   `MYSQL_USER`/`MYSQL_DATABASE`/etc. on first init of an empty volume, not on every restart.
2. **Backend**: `cd backend && ./mvnw spring-boot:run`. Needs JDK 25 — if your default `java`
   isn't 25, set `JAVA_HOME` to whichever JDK 25 install you have before running Maven.
3. **Frontend**: being rebuilt with TanStack Start in `frontend/`; until then use Swagger at
   `http://localhost:8080/swagger-ui/index.html`. Dev CORS allows `http://localhost:3000`.
