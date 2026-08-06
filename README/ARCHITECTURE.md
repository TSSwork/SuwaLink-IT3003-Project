# Architecture — What Each Layer Does

How the code is actually organised, and *why* each piece exists. If you only read one thing,
read [Following one request end to end](#following-one-request-end-to-end) — everything else is a
reference for the individual layers.

`CONTEXT/SPECS.md` is the *rulebook* (how new code must be written). This document is the *map*
(what is there today and what each part is responsible for).

---

## The big picture

The backend is a classic layered Spring Boot application. Each layer only talks to the one below
it, and each layer has exactly one job:

```
HTTP request
     │
     ▼
┌─────────────────┐
│ SecurityConfig  │  Is this request allowed in at all?
│ + JwtFilter     │  Reads the JWT, puts the user in the SecurityContext
└────────┬────────┘
         ▼
┌─────────────────┐
│   Controller    │  HTTP concerns only: URL, verb, status code, validation
│   (14 classes)  │  Never contains business rules
└────────┬────────┘
         │  request DTO in, response DTO out
         ▼
┌─────────────────┐
│    Service      │  ALL the business rules live here.
│  (interface +   │  "Can this person cancel this reservation?"
│      impl)      │  "Is there enough stock?" Transactions start here.
└────────┬────────┘
         ▼
┌─────────────────┐
│   Repository    │  Database access only. No logic.
│  (13 interfaces)│  Spring Data generates the implementations.
└────────┬────────┘
         ▼
┌─────────────────┐
│     Entity      │  The tables, as Java objects.
│  (24 classes)   │
└────────┬────────┘
         ▼
      MySQL
```

Two things cut *across* those layers:

- **`GlobalExceptionHandler`** catches any exception thrown at any depth and turns it into a
  proper JSON error response, so no layer has to think about error formatting.
- **Events** (`ApplicationEventPublisher`) let a service announce "a reservation was created"
  without knowing that notifications exist.

---

## The layers, one by one

### `controller/` — the HTTP doorway (14 classes)

A controller's whole job is translating HTTP into a method call and back again. It does four
things and nothing else:

1. Maps a URL + verb to a method — `@PostMapping`, `@GetMapping`, …
2. Validates the incoming body — `@Valid`
3. Checks the caller's role — `@PreAuthorize`
4. Picks the HTTP status code and wraps the result in `ApiResponse`

Real example from `ReservationController`:

```java
@PostMapping
@PreAuthorize("hasRole('CUSTOMER')")
public ResponseEntity<ApiResponse<ReservationResponse>> create(
        @Valid @RequestBody CreateReservationRequest request) {
    ReservationResponse response = reservationService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Reservation confirmed", response));
}
```

Notice what is *missing*: no stock checks, no database calls, no ownership checks. One line of
real work, delegated to the service. **If you find an `if` statement about business rules in a
controller, it's in the wrong place.**

| Controller | Owns |
|---|---|
| `AuthController` | Register (customer/pharmacy), login, forgot/reset password |
| `UserController` | The current user's own profile (`/api/users/me`) |
| `AdminController` | Admin dashboard, verifying and rejecting pharmacies |
| `InventoryController` | A pharmacy's stock; the public medicine search |
| `MedicineMasterController`, `MedicineCatalogController` | The shared medicine catalogue |
| `CategoryController`, `ManufacturerController` | Reference data used by search filters |
| `PrescriptionRequestController` | A patient uploads a prescription and asks for quotes |
| `PrescriptionResponseController` | A pharmacy quotes back against a prescription |
| `ReservationController` | Reserve stock, cancel, mark complete |
| `BookmarkController` | Saved medicines |
| `NotificationController` | The bell icon's list, mark-as-read |
| `ImageController` | Upload/serve prescription and product images |

### `dto/` — the shapes that cross the wire (33 classes)

DTOs (Data Transfer Objects) exist so the API's shape is **decoupled from the database's shape**.

- `dto/request/` (16) — what the client is allowed to send. Bean Validation annotations
  (`@NotBlank`, `@Email`, `@Min`) live here, which is why a controller only needs `@Valid`.
- `dto/response/` (16) — what the client gets back.

Why not just return entities directly? Three reasons that bite in practice:

1. **Security** — `User` has a `password` field. Returning the entity leaks the password hash.
   `UserResponse` simply has no such field, so it *cannot* leak.
2. **Infinite loops** — `Reservation` → `Pharmacy` → `Inventory` → `Reservation`. Serialising
   that to JSON never terminates. A flat DTO has no cycles.
3. **Stability** — renaming a database column shouldn't break every frontend page.

Every successful response is wrapped in the same envelope, `ApiResponse<T>`:

```json
{ "success": true, "message": "Reservation confirmed", "data": { ... } }
```

That consistency is what lets the frontend have exactly one response handler
(`frontend/assets/js/api/apiService.js`) instead of per-endpoint special cases.

### `service/` — where the business lives (13 interfaces + `impl/`)

This is the actual application. Everything a non-programmer would call "a rule" is here.

Each service is split into an **interface** (`ReservationService` — the contract) and an
**implementation** (`impl/ReservationServiceImpl` — the how). Controllers depend on the interface,
which is what makes the implementation swappable and easy to mock in tests.

A service method is where you find:

- Ownership checks — "is this *your* reservation to cancel?"
- Invariants — "you cannot reserve 5 units when 3 are in stock"
- State machine rules — "a `COMPLETED` reservation cannot be cancelled"
- `@Transactional` boundaries — the whole method commits or none of it does
- Publishing events for side effects

From `ReservationServiceImpl.create`:

```java
User patient = currentUserProvider.getCurrentUser();

Inventory inventory = inventoryRepository.findById(request.getInventoryItemId())
        .orElseThrow(() -> new ResourceNotFoundException(...));

if (inventory.getStockQuantity() < request.getQuantity()) {
    throw new InsufficientStockException(inventory.getStockQuantity(), request.getQuantity());
}
```

The `@Transactional` on that method matters: decrementing stock and inserting the reservation
either both happen or neither does. Two customers reserving the last box at the same moment can't
both succeed — the entity's `@Version` column (optimistic locking) makes the second write fail.

### `repository/` — database access, and nothing else (13 interfaces)

Each repository is an *interface only*. Spring Data JPA writes the implementation at startup by
reading the method names:

```java
Optional<User> findByEmail(String email);   // → SELECT * FROM users WHERE email = ?
```

Complex queries use `@Query` with JPQL. There are no hand-written SQL strings scattered through
services, and no service ever opens a JDBC connection itself.

### `entity/` — the database as Java objects (24 classes)

One class per table, plus the enums that back status columns (`ReservationStatus`, `Role`,
`PharmacyStatus`, …). Using enums instead of raw strings means an invalid status is a *compile*
error rather than a bad row in production.

Most entities extend **`BaseAuditEntity`**, which contributes five columns for free:

| Field | Filled by | Purpose |
|---|---|---|
| `createdAt` / `updatedAt` | `@CreatedDate` / `@LastModifiedDate` | When |
| `createdBy` / `updatedBy` | `@CreatedBy` / `@LastModifiedBy` | Who (from `JpaAuditingConfig`) |
| `version` | `@Version` | Optimistic locking — blocks lost updates |

On top of that, Hibernate Envers keeps `*_aud` history tables, so every change to a row is
recoverable — which matters for a system handling prescriptions.

The schema itself is **not** generated from these classes at runtime.
`spring.jpa.hibernate.ddl-auto=validate` means Hibernate only *checks* that the tables match.
The tables are created by **Liquibase** migrations in `resources/db/changelog/`, so the schema is
version-controlled and every teammate's database is identical.

---

## The supporting cast

### `security/` — who is calling? (5 classes)

| Class | Job |
|---|---|
| `JwtService` | Creates and validates the signed token. The only class that knows the secret. |
| `JwtAuthenticationFilter` | Runs on every request: reads `Authorization: Bearer …`, validates it, puts the user into Spring's `SecurityContext`. |
| `UserDetailsServiceImpl` | Loads a `User` from the database and hands Spring Security its roles. |
| `JwtAuthenticationEntryPoint` | Returns a clean JSON 401 instead of an HTML login-page redirect. |
| **`CurrentUserProvider`** | Answers "who is logged in?" anywhere in the app. |

**`CurrentUserProvider` deserves its own explanation**, because it's the piece that keeps every
service clean. The JWT filter has already put the authenticated email into a thread-local
`SecurityContextHolder`. Digging it back out looks like this:

```java
SecurityContextHolder.getContext().getAuthentication().getName()
```

…followed by a repository lookup and a null check. Without `CurrentUserProvider`, that six-line
dance would be copy-pasted into every single service method that needs the caller. Instead:

```java
User patient = currentUserProvider.getCurrentUser();
```

The payoff is real:

- **No user IDs in request bodies.** A client never sends `userId` — it's taken from the verified
  token. That closes the obvious attack where a customer edits the JSON to act as someone else.
- **One place to change.** Switch from email-based to ID-based tokens and exactly one class edits.
- **Fails loudly.** If it's somehow called on an unauthenticated request it throws
  `IllegalStateException` rather than silently returning `null` and NPE-ing three frames later.

Authorisation is split deliberately across two places: broad URL rules in `SecurityConfig`
(`/api/admin/**` needs `ROLE_ADMIN`), and per-method rules via `@PreAuthorize` on controllers.

### `exception/` — one place that decides what the client sees (14 classes)

13 of these are custom exceptions named after the business problem
(`InsufficientStockException`, `PharmacyNotVerifiedException`, `ReservationAccessDeniedException`)
rather than after HTTP.

The 14th, **`GlobalExceptionHandler`** (`@RestControllerAdvice`), is the translator. It catches
everything thrown anywhere below it and maps it to a status code and an `ApiErrorResponse`:

| Exception | HTTP |
|---|---|
| `ResourceNotFoundException` | 404 |
| `EmailAlreadyExistsException`, `DuplicateResourceException` | 409 |
| `*AccessDeniedException` | 403 |
| `InsufficientStockException`, `InvalidReservationStateException`, `InvalidOtpException` | 400 |
| `MethodArgumentNotValidException` (from `@Valid`) | 400 + per-field messages |
| `BadCredentialsException` | 401 |
| `DataIntegrityViolationException` | 409 |
| anything else | 500, with the real cause logged but not leaked to the client |

This is why services can just `throw` and never build a `ResponseEntity`, and why the frontend
can render validation errors generically — every failure has the same JSON shape.

### `event/` — side effects that don't tangle the code (7 classes)

When a reservation is created, the patient *and* the pharmacy should be notified. Calling
`NotificationService` from `ReservationServiceImpl` would make reservations depend on
notifications forever.

Instead the service publishes a small event object:

```java
eventPublisher.publishEvent(new ReservationCreatedEvent(reservation.getId()));
```

`NotificationEventListener` picks it up with `@EventListener` and creates the notifications. The
reservation code has no idea notifications exist. Adding an SMS alert later means adding one
listener and touching zero existing business logic.

Current events: `PharmacyVerifiedEvent`, `PharmacyRejectedEvent`, `PharmacyRespondedEvent`,
`PrescriptionAddedEvent`, `ReservationCreatedEvent`, `ReservationCancelledEvent`.

### `config/` — wiring (4 classes)

| Class | Job |
|---|---|
| `SecurityConfig` | Filter chain, which URLs are public, CORS, password encoder, stateless sessions |
| `WebConfig` | Serves uploaded images from disk at `/uploads/**` |
| `JpaAuditingConfig` | Supplies the "who" for `@CreatedBy` / `@LastModifiedBy` — the logged-in email, or `SYSTEM` for unauthenticated writes like registration |
| `DatabaseStartupWaiter` | Polls MySQL on boot instead of crashing when the DB is still starting |

---

## Following one request end to end

A patient reserves 2 boxes of paracetamol. `POST /api/reservations`:

1. **`JwtAuthenticationFilter`** reads the `Bearer` token, validates the signature, loads the user
   via `UserDetailsServiceImpl`, and stores them in the `SecurityContext`.
2. **`SecurityConfig`** confirms `/api/reservations` requires authentication — satisfied.
3. **Spring MVC** deserialises the JSON body into `CreateReservationRequest`.
4. **`@Valid`** runs the annotations on that DTO. A missing `quantity` stops here with a 400 —
   the controller body never runs.
5. **`@PreAuthorize("hasRole('CUSTOMER')")`** on `ReservationController.create` checks the role. A
   pharmacy account gets 403 here.
6. **`ReservationController.create`** calls `reservationService.create(request)`. Its work is done.
7. **`ReservationServiceImpl.create`** opens a transaction and:
   - asks **`CurrentUserProvider`** who is calling — no user ID needed from the client;
   - loads the item through **`InventoryRepository`**, or throws `ResourceNotFoundException`;
   - compares stock, throwing `InsufficientStockException` if short;
   - decrements stock and saves a new `Reservation` **entity**;
   - publishes a `ReservationCreatedEvent`.
8. **`NotificationEventListener`** reacts to the event and writes notification rows.
9. The transaction commits — stock decrement and reservation insert land together, or not at all.
10. The service maps the entity to a **`ReservationResponse`** DTO (no password, no lazy proxies,
    no cycles).
11. The controller wraps it: `ApiResponse.success("Reservation confirmed", response)` → **201**.
12. If *any* step threw, **`GlobalExceptionHandler`** converts it to the matching status code and
    an `ApiErrorResponse` — the client always gets the same JSON shape.

Then on the frontend: `apiService.js` unwraps the envelope, throws an `ApiError` when
`success` is `false`, and auto-redirects to the login page on a 401.

---

## Frontend structure

No framework — plain ES modules, but organised on the same "one job per file" principle.

```
frontend/
├── *.html                    One file per page (login, search, dashboards, …)
└── assets/
    ├── js/
    │   ├── config/env.js     API base URL — the single place to change it
    │   ├── api/apiService.js The only file that calls fetch(). Attaches the JWT,
    │   │                     unwraps ApiResponse, throws ApiError, handles 401
    │   ├── auth/             tokenStorage.js (read/write/clear the JWT),
    │   │                     auth.js (page guards, role checks)
    │   ├── pages/            One module per HTML page — that page's behaviour only
    │   ├── components/       Reusable widgets (bookmarkButton, reserveControl)
    │   └── utils/            validators.js — client-side form checks
    └── css/
        ├── themes/tokens.css Material Design 3 colours/spacing as CSS variables
        ├── base/             reset + typography
        ├── components/       buttons, cards, tabs, text-fields, …
        ├── layout/           page shell
        └── pages/            per-page overrides
```

The rule that keeps it maintainable: **only `apiService.js` calls `fetch`**. Page modules call
`apiService`. So auth headers, the response envelope and 401 handling are implemented once
instead of in every page.

---

## Why bother with all these layers?

For a project this size you could put everything in the controllers. The layering pays for itself
in four ways:

- **Parallel work.** Seven people committed to this repo. Because a feature is
  controller + service + repository + DTO, two people can work on different modules without
  touching the same files.
- **Testability.** The 66 tests run against in-memory H2 with no MySQL. That only works because
  services depend on repository *interfaces*.
- **Findability.** A bug in *what the API returns* is in a controller or DTO. A bug in *the rules*
  is in a service. A bug in *what's stored* is in an entity or migration. You know where to look
  before you start looking.
- **Security by construction.** The password field can't leak because `UserResponse` doesn't have
  one. A user can't act as someone else because the identity comes from `CurrentUserProvider`, not
  the request body. These aren't rules people have to remember — the structure enforces them.
