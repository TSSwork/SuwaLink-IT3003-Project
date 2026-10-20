# Phase 1C — Notifications & Email, Languages, Accounts, Catalog Suggestions, Rate Limits, Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every event reaches the right people in-app and by email in their language (en/si/ta); users have a language preference, can delete their account, and admins can suspend; pharmacies can suggest medicines; auth endpoints are rate-limited; and a realistic, resettable demo dataset backs the lecturer showcase.

**Architecture:** Notifications store a message key + JSON params and are rendered with Spring `MessageSource` at read time (request locale) and at send time (recipient's preferred language). In-app rows are written inside the business transaction; email goes out `@Async` after commit. API errors gain a stable `code` the frontend translates. Accounts are anonymised instead of hard-deleted. A Java `DemoDataSeeder` creates demo data idempotently and can be reset from the admin panel. A small in-memory fixed-window limiter guards auth endpoints.

**Tech Stack:** Spring Boot 4.1, Java 25, Spring `MessageSource`, `JavaMailSender` (MIME/HTML), `@Async` + `@TransactionalEventListener`, Liquibase (MySQL), H2 + MockMvc, Testcontainers `SchemaMigrationTest`.

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` — §6.6, §6.9, §6.15 + "Languages" calls, §7 (account deletion, admin user actions, email in dev/showcase), §8 (User, Medicine catalog, Notifications), §9.6, §9.7, §9.8, §9.9 (rate limiting), §13.

## Global Constraints

- Layering per `CONTEXT/SPECS.md`; services are interfaces + `service/impl` (this includes converting the existing concrete `NotificationService`).
- Languages: `en` (default), `si`, `ta`. Bundles `backend/src/main/resources/i18n/messages.properties` (en), `messages_si.properties`, `messages_ta.properties`, UTF‑8. Every new user‑facing backend string is a key in all three. Sinhala/Tamil text is written by the implementer and marked in `README/I18N.md` as "pending native-speaker review".
- Notification types/keys per the event table in Task 2; recipients exactly as spec §9.6.
- Demo users never receive real email: redirect to `app.mail.demo-redirect` (env `DEMO_MAIL_REDIRECT`) when set, otherwise skip.
- Email links use `app.frontend.base-url` (dev `http://localhost:3000`, prod env `FRONTEND_BASE_URL`).
- Every schema change is a new Liquibase changeset from `008-…`; bump `SchemaMigrationTest`'s count.
- Build/test from `backend/`: `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock ./mvnw -Dmaven.compiler.release= -Dmaven.compiler.source=25 -Dmaven.compiler.target=25 -q clean test`.
- Branch `feature/phase1c-notifications-accounts` off `feature/phase1b-targeting-reservations`; one commit per task.

## Review Focus

1. **Email server down or slow when an event fires** — expected: the user's action still succeeds and the in-app notification exists; the email failure is logged (no stack trace with the address) and `emailed_at` stays null. Test in Task 3.
2. **User whose `preferred_language` is `si` receives a notification; an English browser reads it** — expected: email in Sinhala; in-app list rendered in the request's `Accept-Language` (English). Test in Tasks 2/3.
3. **Deleted or suspended user still holding a valid JWT** — expected: `401` on the next request. Test in Task 5.
4. **Login brute force from one IP across many emails, and against one email from many IPs** — expected: `429` with `Retry-After` once the per-IP or per-email limit is reached; successful logins still count. Test in Task 7.
5. **Admin runs "reset demo data" twice, or while demo customers have open reservations** — expected: idempotent, stock consistent, no FK errors, real data untouched. Test in Task 8.

---

### Task 1: Language preference, locale resolution, message bundles, error codes

**Files:**
- Create: `entity/Language.java` (`en, si, ta` — lowercase constants with `@JsonValue`/converter, or enum `EN,SI,TA` with `code()`; pick one and use it everywhere).
- Modify: `entity/User.java` — `preferredLanguage` (column `preferred_language` varchar(2) not null default `'en'`), `district` (`District`, nullable).
- Create: `db/changelog/sql/008-user-preferences.sql` (+ changeset).
- Create: `config/I18nConfig.java` — `MessageSource` (basename `classpath:i18n/messages`, UTF‑8, fallback to system locale off), `LocaleResolver` = `AcceptHeaderLocaleResolver` with supported `en, si, ta`, default `en`.
- Create: `i18n/messages*.properties` with the error‑code keys below (notification keys come in Task 2).
- Create: `dto/request/UpdatePreferencesRequest.java` (`preferredLanguage` not null, `district` nullable); Modify `dto/response/UserProfileResponse` (+ `preferredLanguage`, `district`).
- Modify: `controller/UserController.java` — `PUT /api/users/me/preferences`.
- Modify: `dto/response/ApiErrorResponse.java` — add `code` (String) at top level and on `FieldErrorDetail` (`code` = constraint annotation simple name, e.g. `NotBlank`, `Size`, `AssertTrue`).
- Modify: `exception/GlobalExceptionHandler.java` — every handler sets a stable `code` (UPPER_SNAKE): `VALIDATION_FAILED, MALFORMED_REQUEST, INVALID_PARAMETER, NOT_FOUND, ACCESS_DENIED, UNAUTHENTICATED, DUPLICATE, EMAIL_TAKEN, PHARMACY_NOT_VERIFIED, DEMO_DISABLED, ACCOUNT_SUSPENDED (Task 5), INSUFFICIENT_STOCK, ITEM_UNAVAILABLE, REQUEST_CLOSED, NO_PHARMACIES_IN_SCOPE, RESERVATION_STATE, CONCURRENT_UPDATE, RATE_LIMITED (Task 7), INTERNAL_ERROR`. The English `message` stays as today. Also map `DataIntegrityViolationException` from a duplicate prescription response to `409 DUPLICATE` with "You have already responded; update your response instead" (carry‑over).
- Modify: `README/I18N.md` (new) — how languages work, the error‑code list, translation review status.
- Test: `controller/UserPreferencesTest.java`, extend `GlobalExceptionHandlerTest`.

**Interfaces:**
- Produces: `Language`, `User.getPreferredLanguage()`, `MessageSource` bean, `ApiErrorResponse.code` — later tasks use them.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void userSetsPreferredLanguageAndDistrict()   // PUT /api/users/me/preferences {"preferredLanguage":"si","district":"KANDY"} → 200; GET /api/users/me → preferredLanguage "si", district "KANDY"
@Test void unknownLanguageIs400()                   // "fr" → 400, $.code "MALFORMED_REQUEST" or "VALIDATION_FAILED"
@Test void validationErrorsCarryCodes()             // register with blank email → $.code "VALIDATION_FAILED", $.errors[?(@.field=='email')].code contains "NotBlank"
@Test void notFoundCarriesCode()                    // GET /api/medicines/<random uuid> → $.code "NOT_FOUND"
@Test void messageSourceResolvesAllThreeLanguages() // a sample key resolves differently for en/si/ta and every key in messages.properties exists in _si and _ta (load all three Properties files, compare key sets)
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green (SchemaMigrationTest count 8).
- [ ] **Step 5:** Commit `feat: language preference, message bundles and stable API error codes`.

### Task 2: Notification model with message keys, every spec event

**Files:**
- Modify: `entity/Notification.java` — replace `title`/`message` with `messageKey` (varchar(100) not null), `params` (TEXT JSON, not null default `{}`), `link` (varchar(255) nullable), `emailedAt` (nullable).
- Create: `db/changelog/sql/009-notification-keys.sql` — delete existing dev notifications, drop `title`/`message`, add the new columns.
- Replace: `service/NotificationService.java` as an **interface** + `service/impl/NotificationServiceImpl.java`:
  - `Notification notify(User recipient, NotificationType type, String messageKey, Map<String,String> params, String link)`
  - `List<NotificationResponse> listMine(Locale locale)`, `long unreadCount()`, `void markRead(UUID id)`, `void markAllRead()`
  - Rendering: title key = `messageKey + ".title"`, body key = `messageKey + ".body"`, params substituted by name (`{pharmacy}`, `{items}`, …) — implement a tiny named‑placeholder formatter in `util/MessageRenderer.java` used by both in‑app and email.
- Modify: `dto/NotificationResponse.java` → move to `dto/response/NotificationResponse.java` (`id, type, title, message, link, read, createdAt`).
- Modify: `controller/NotificationController.java` — list uses request `Locale`; add `PUT /api/notifications/read-all`.
- Modify: `event/NotificationEventListener.java` — all handlers call `notify(...)` with keys/params/links below; add the missing events. Admin recipients = all users with role `ADMIN`.

| Event (publisher) | Recipient | messageKey | link |
|---|---|---|---|
| Pharmacy registered (`AuthServiceImpl.registerPharmacy`, new `PharmacyRegisteredEvent`) | every admin | `notify.pharmacy.registered` | `/admin/pharmacies` |
| Pharmacy approved / rejected | owner | `notify.pharmacy.approved` / `.rejected` | `/pharmacy` / `/` |
| Prescription request sent | customer | `notify.prescription.sent` | `/prescriptions/{id}` |
| Prescription request sent | each target owner | `notify.prescription.new` | `/pharmacy/requests/{id}` |
| Pharmacy responded / updated | customer | `notify.prescription.responded` / `.response-updated` | `/prescriptions/{id}` |
| Prescription request expired (new `PrescriptionRequestExpiredEvent` from `expireOverdue`) | customer | `notify.prescription.expired` | `/prescriptions/{id}` |
| Reservation created | customer / pharmacy owner | `notify.reservation.confirmed` / `.new` | `/reservations/{id}` / `/pharmacy/reservations` |
| Reservation cancelled | the other party | `notify.reservation.cancelled-by-customer` / `-by-pharmacy` | as above |
| Reservation completed | customer | `notify.reservation.completed` | `/reservations/{id}` |
| Reservation expired | customer + pharmacy owner | `notify.reservation.expired` | as above |
| Medicine suggestion approved / rejected (Task 6 publishes) | suggesting owner | `notify.medicine.approved` / `.rejected` | `/pharmacy/inventory` |

- Add all `*.title` / `*.body` keys (and `email.*.subject` where it differs) to the three bundles.
- Test: rewrite `NotificationControllerTest`, `NotificationEventListenerTest`; add an expiry‑notification assertion to `ExpiryJobsIntegrationTest` (carry‑over).

**Interfaces:**
- Produces: `NotificationService.notify(...)`, `MessageRenderer.render(String key, Map<String,String> params, Locale)`, `Notification.getMessageKey()/getParams()/getLink()/getEmailedAt()`; publishes nothing new for email yet (Task 3 hooks in).

- [ ] **Step 1: Write the failing tests.**

```java
@Test void listRendersInRequestLanguage()        // notification created; GET /api/notifications with Accept-Language: si → title equals messages_si value with params substituted
@Test void listDefaultsToEnglish()
@Test void markAllRead()                          // unread-count → 0
@Test void pharmacyRegistrationNotifiesAdmins()
@Test void prescriptionSentNotifiesCustomerAndTargetsOnly()
@Test void expiredRequestNotifiesCustomer()
@Test void reservationExpiryNotifiesBothSides()   // in ExpiryJobsIntegrationTest
@Test void everyNotifyKeyExistsInAllBundles()     // reflectively or by listing: each key used in NotificationEventListener has .title and .body in en/si/ta
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green (count 9).
- [ ] **Step 5:** Commit `feat: keyed notifications for every event, rendered per language`.

### Task 3: Email delivery after commit

**Files:**
- Create: `event/NotificationCreatedEvent.java` (notification id); `NotificationServiceImpl.notify` publishes it.
- Create: `service/NotificationMailer.java` + `impl/NotificationMailerImpl.java` — `@Async @TransactionalEventListener(phase = AFTER_COMMIT)` on `NotificationCreatedEvent`; loads the notification in a new read/write transaction, renders subject/body with `MessageRenderer` in the recipient's `preferredLanguage`, sends a MIME HTML email (simple branded template in `resources/templates/email/notification.html`, plain string replacement — no template engine dependency), button URL = `app.frontend.base-url + link`, then sets `emailedAt`. Demo recipient: send to `app.mail.demo-redirect` if non‑blank, otherwise skip (leave `emailedAt` null). Any exception: log WARN with notification id and exception class only.
- Create: `config/AsyncConfig.java` — `@EnableAsync`, bounded `ThreadPoolTaskExecutor` (core 2, max 4, queue 100, thread prefix `mail-`).
- Modify: `service/impl/MailServiceImpl.java` — password‑reset OTP email also localized (`email.password-reset.subject/.body`) in the user's language.
- Modify: `application.properties` — `app.frontend.base-url=${FRONTEND_BASE_URL:http://localhost:3000}`, `app.mail.demo-redirect=${DEMO_MAIL_REDIRECT:}`; `.env.example` gains both.
- Test: `service/NotificationMailerTest.java` — Spring test with a mocked `JavaMailSender` (`@MockitoBean`), non‑transactional so after‑commit fires; use Awaitility or a synchronous executor override in the test profile (`app.async.synchronous=true` → `SyncTaskExecutor`).

- [ ] **Step 1: Write the failing tests.**

```java
@Test void emailSentAfterCommitInRecipientLanguage() // recipient preferredLanguage si → MimeMessage subject equals messages_si email subject; emailedAt set
@Test void noEmailWhenTransactionRollsBack()          // notify inside a tx that throws → mailSender never called
@Test void mailFailureDoesNotBreakAction()            // mailSender throws → reservation still 201, notification row exists, emailedAt null
@Test void demoRecipientRedirected()                  // demo user + redirect "demo@test.lk" → sent To demo@test.lk
@Test void demoRecipientSkippedWithoutRedirect()      // no send
@Test void emailContainsFrontendLink()                // body contains "http://localhost:3000/reservations/<id>"
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green.
- [ ] **Step 5:** Commit `feat: localized notification emails sent after commit`.

### Task 4: Consent at registration and prescription image retention

**Files:**
- Modify: `CustomerRegisterRequest`, `PharmacyRegisterRequest` — `@NotNull @AssertTrue(message = "You must accept the terms and privacy policy") Boolean acceptTerms`; `User.termsAcceptedAt` (not null) set at registration. Update `TestPayloads` and `AdminBootstrap` (admin gets `termsAcceptedAt = now`).
- Create: `db/changelog/sql/010-consent-retention.sql` — `users.terms_accepted_at` (backfill `created_at`), `images.purged_at` nullable.
- Modify: `entity/Image.java` — `purgedAt`.
- Modify: `PrescriptionRequestServiceImpl` / `ImageServiceImpl` — `int purgeOldPrescriptionImages(LocalDateTime now)`: requests `CLOSED` or `EXPIRED` whose `updatedAt` is older than `app.prescription.image-retention-days` (default `30`) and whose image is not yet purged → delete file, set `purgedAt` (one REQUIRES_NEW transaction per image, catch+log). Image content endpoint returns `410 Gone` (code `IMAGE_PURGED`) for purged images.
- Modify: `ExpiryJobs` — daily `@Scheduled(cron = "${app.jobs.retention-cron:0 30 3 * * *}")`.
- Modify: `README/I18N.md` is unrelated — instead add a "Data retention" section to `README/READ_PRESCRIPTION_MODULE.md` (value pending lecturer confirmation).
- Test: extend `AuthControllerRegistrationTest`, `ExpiryJobsIntegrationTest`.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void registrationRequiresAcceptTerms()          // acceptTerms false/missing → 400; true → 201, termsAcceptedAt set
@Test void purgeDeletesOldClosedRequestImages()       // closed 31 days ago → file gone, purgedAt set; GET content → 410
@Test void purgeKeepsOpenAndRecentRequests()
```

- [ ] **Step 2–5:** Run (FAIL) → implement → full suite green → commit `feat: consent at registration and prescription image retention`.

### Task 5: Suspension and account deletion

**Files:**
- Modify: `entity/User.java` — `suspended` (boolean, default false), `deletedAt` (nullable). `entity/PharmacyStatus.java` — add `DEACTIVATED`.
- Create: `db/changelog/sql/011-account-status.sql`.
- Modify: `security/UserDetailsServiceImpl.java` — deleted users → `UsernameNotFoundException`; suspended → `accountNonLocked = false`. `JwtAuthenticationFilter` — also rejects `!isAccountNonLocked()`. `GlobalExceptionHandler` — `LockedException` → 403 `ACCOUNT_SUSPENDED` "Your account has been suspended"; `DisabledException` stays `DEMO_DISABLED` (carry‑over: the two are now distinct).
- Create: `service/AccountService.java` + impl:
  - `void deleteMyAccount(DeleteAccountRequest)` (`password` must match → else 400). Admins cannot self‑delete → 409.
  - `void deleteUser(UUID id)` (admin): same rules; cannot target an admin → 409.
  - Customer: cancel `CONFIRMED` reservations (reuse `ReservationService.cancel` logic with `cancelledBy = PATIENT`, reason "Account deleted"), close open prescription requests, delete their prescription image files (set `purgedAt`), delete their notifications and bookmarks, anonymise: name `"Deleted user"`, email `"deleted-<id>@deleted.suwalink.invalid"`, phone `"0000000000"`, password random unguessable hash, `deletedAt = now`.
  - Pharmacy owner: refuse with 409 `"Complete or cancel open reservations first"` if any `CONFIRMED` reservation; otherwise pharmacy `status = DEACTIVATED`, all inventory `available = false`, owner anonymised as above. Existing responses remain; response DTOs show the pharmacy name with `pharmacyActive = false`.
  - `void suspend(UUID id)`, `void reactivate(UUID id)` (admin; not on admins or self).
- Modify: `AdminServiceImpl.deleteUser` / `deletePharmacyData` — replaced by `AccountService.deleteUser` (hard delete removed).
- Modify: `AdminController` — `GET /api/admin/users?q=&status=ACTIVE|SUSPENDED|DELETED` (default excludes DELETED), `PUT /api/admin/users/{id}/suspend`, `PUT /api/admin/users/{id}/reactivate`, `DELETE /api/admin/users/{id}`. `UserResponse` + `status`.
- Modify: `UserController` — `DELETE /api/users/me` with body `{ "password": "..." }`.
- Modify: `PrescriptionRequestServiceImpl.delete` — if any reservation references the request → 409 `"This request has reservations and can't be deleted; close it instead"` (carry‑over).
- Test: `controller/AccountLifecycleTest.java`; update `AdminControllerTest`.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void customerDeletesOwnAccount()             // wrong password → 400; right → 200; login fails; old JWT → 401; open reservation CANCELLED with stock restored; request CLOSED; image file gone
@Test void ownerWithOpenReservationCannotDelete()  // 409
@Test void ownerDeletionDeactivatesPharmacy()      // 200; pharmacy DEACTIVATED; not in search; public page 404
@Test void adminCannotDeleteSelfOrAnotherAdmin()   // 409
@Test void adminSuspendsAndReactivates()           // suspended login → 403 ACCOUNT_SUSPENDED; existing JWT → 401; reactivate → login 200
@Test void adminUserListFiltersByStatusAndQuery()
@Test void demoAndSuspendedMessagesDiffer()        // DEMO_DISABLED vs ACCOUNT_SUSPENDED
@Test void deletingRequestWithReservationsIs409()
```

- [ ] **Step 2–5:** Run (FAIL) → implement → full suite green → commit `feat: account deletion by anonymisation and admin suspension`.

### Task 6: Medicine suggestions and approved-only catalog

**Files:**
- Create: `entity/MedicineStatus.java` (`APPROVED, PENDING, REJECTED`); Modify `MedicineMaster` — `status` (default APPROVED), `suggestedByPharmacy` (nullable), `rejectionReason` (nullable).
- Create: `db/changelog/sql/012-medicine-status.sql` (+ `_aud` columns, since `MedicineMaster` is `@Audited`).
- Modify: offer queries (`findOffers`, `findOffersByPharmacy`), the owner catalog list `GET /api/medicines`, and inventory add/update — only `APPROVED` medicines (add `m.status = APPROVED` alongside the visibility fragment).
- Create: endpoints — owner: `POST /api/medicines/suggestions` (`MedicineMasterRequest` fields; duplicate brand+strength+form of an existing APPROVED/PENDING medicine → 409), `GET /api/medicines/suggestions/mine`; admin: `GET /api/admin/medicines/suggestions?status=PENDING`, `PUT /api/admin/medicines/suggestions/{id}/approve`, `PUT .../{id}/reject` (`{ "reason": "..." }`). Publish events consumed by Task 2's listener keys `notify.medicine.approved/rejected`.
- Test: `controller/MedicineSuggestionTest.java`.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void ownerSuggestsMedicine()                 // 201, status PENDING; not in GET /api/medicines; can't add inventory for it (400/404)
@Test void duplicateSuggestionIs409()
@Test void adminApprovesSuggestion()               // status APPROVED; owner notified; owner can now add inventory; appears in search once stocked
@Test void adminRejectsWithReason()                // REJECTED, reason stored; owner notified
@Test void customerCannotSuggest()                 // 403
```

- [ ] **Step 2–5:** Run (FAIL) → implement → full suite green → commit `feat: pharmacy medicine suggestions with admin approval`.

### Task 7: Rate limiting on auth endpoints

**Files:**
- Create: `security/RateLimiter.java` — in‑memory fixed window: `boolean tryAcquire(String bucket, String key, int limit, Duration window)` + `long retryAfterSeconds(...)`; `ConcurrentHashMap` with periodic cleanup of expired windows; clock injectable for tests.
- Create: `security/RateLimitFilter.java` (`OncePerRequestFilter`, before the JWT filter) — limits (config `app.rate-limit.*`, these defaults):
  - `POST /api/auth/login`: 10 / 5 min per IP **and** 5 / 5 min per email (email read from the cached body — use `ContentCachingRequestWrapper` or parse in the controller via an interceptor; pick the simplest that works with MockMvc).
  - `POST /api/auth/register/**`: 5 / hour per IP.
  - `POST /api/auth/forgot-password`: 3 / hour per email, 10 / hour per IP.
  - `POST /api/auth/reset-password`: 10 / 15 min per email.
  - Exceeded → `429`, header `Retry-After`, body `ApiErrorResponse` with code `RATE_LIMITED`.
  - Client IP = `request.getRemoteAddr()`; `server.forward-headers-strategy=framework` in `application-prod.properties` so Caddy's `X-Forwarded-For` is honoured only in prod.
- Modify: `application-test.properties` — raise limits high by default (`app.rate-limit.enabled=true`, generous numbers) so existing tests don't trip; the rate‑limit test sets low limits via `@TestPropertySource`.
- Test: `security/RateLimitTest.java`.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void sixthLoginForSameEmailIs429()          // 5 attempts ok (wrong password → 401), 6th → 429 with Retry-After and $.code RATE_LIMITED
@Test void manyEmailsFromOneIpHitIpLimit()         // 11th from same IP → 429
@Test void forgotPasswordLimitedPerEmail()
@Test void windowResets()                          // advance injected clock past window → allowed again
```

- [ ] **Step 2–5:** Run (FAIL) → implement → full suite green → commit `feat: rate limiting on authentication endpoints`.

### Task 8: Reference catalog and resettable demo data

**Files:**
- Create: `db/changelog/sql/013-reference-medicines.sql` — ~40 commonly sold medicines in Sri Lanka (real reference data, `APPROVED`, kept in production) across the existing categories/manufacturers, adding manufacturers/categories as needed (e.g. SPC/SPMC, Hemas, George Steuart Health, Cipla, Sun Pharma, Glaxo; categories as seeded). Include brand, generic, form, strength, unit, legal category (mix of OTC/PRESCRIPTION). Use `INSERT ... SELECT ... WHERE NOT EXISTS` on brand+strength so it is idempotent with the three existing rows.
- Create: `bootstrap/DemoDataSeeder.java` (`ApplicationRunner`, enabled by `app.demo.seed-enabled` default `true`, `false` in `test` profile) delegating to `service/DemoDataService` (+ impl):
  - `void seedIfMissing()` — if no `is_demo` pharmacy exists, create: 7 demo pharmacies (Colombo 2, Gampaha 2, Kandy 2, Galle 1) with real‑looking names, phones, addresses and coordinates inside each town, status VERIFIED, `demo = true`, owners `demo = true` (emails `pharmacy1@demo.suwalink.lk` … ); 15–30 inventory rows each from the reference catalog with LKR prices (±15 % around a base price per medicine) and future expiry; 3 demo customers (`customer1@demo.suwalink.lk` …); for customer 1: one prescription request (scope DISTRICT COLOMBO) with the bundled sample image `resources/demo/sample-prescription.webp` copied into the upload dir, one response from a Colombo demo pharmacy, one CONFIRMED reservation from that response (expires in 24 h), one COMPLETED and one CANCELLED reservation from search. Demo password for all demo accounts: `DemoPass123!`.
  - `void reset()` — delete all demo‑owned data (reservations/items of demo users or demo pharmacies, responses, requests + targets + image files, bookmarks, notifications, inventory of demo pharmacies, demo pharmacies, demo users) in FK‑safe order, restoring stock where a demo customer held stock at a **real** pharmacy, then `seedIfMissing()`.
  - Real data is never touched (every delete is filtered by `demo = true` ownership).
- Modify: `AdminController` — `POST /api/admin/demo/reset`.
- Modify: `dto/response/AppSettingsResponse.java` / `GET /api/settings/public` — when demo mode is on, include `demoAccounts: [{role, email, password}]` (one customer, one pharmacy owner); empty list when off.
- Create: `resources/demo/sample-prescription.webp` (a small generated placeholder image — e.g. render text "Sample prescription" with Java2D at build time in a test helper, or commit a tiny file; document which).
- Modify: `README/DEMO_USERS.md` — replace with the demo accounts, how to enable demo mode, reset, and the Mailpit inbox.
- Test: `bootstrap/DemoDataServiceTest.java` (non‑`@Transactional`, cleanup), extend `DemoModeTest`; `SchemaMigrationTest` asserts reference medicines ≥ 40.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void seedCreatesDemoDataset()                // 7 demo pharmacies, 3 demo customers, every demo pharmacy has ≥15 offers, customer1 has a request with a response and 3 reservations
@Test void seedIsIdempotent()                      // second call creates nothing
@Test void demoHiddenUntilDemoModeOn()             // search "panadol" counts change only when demo mode on
@Test void resetRecreatesAndKeepsRealDataIntact()  // real pharmacy + real customer reservation untouched; demo ids change; real stock unchanged except restored demo holds
@Test void resetTwiceIsSafe()
@Test void publicSettingsListDemoAccountsOnlyWhenOn()
@Test void demoAccountsCanLogInWhenOn()            // customer1@demo.suwalink.lk / DemoPass123! → 200
```

- [ ] **Step 2–5:** Run (FAIL) → implement → full suite green (SchemaMigrationTest count 13) → commit `feat: reference medicine catalog and resettable demo dataset`.

---

## Done when

- Full suite green.
- Dev stack manual check: with demo mode on, log in as `pharmacy1@demo.suwalink.lk`, see the demo request; respond; the customer's notification arrives in-app and in Mailpit (redirected address or skipped as configured); switch a user's language to Sinhala and see Sinhala email text; admin "reset demo data" restores the dataset.
- `README/I18N.md`, `README/DEMO_USERS.md`, `README/READ_NOTIFICATION_MODULE.md` describe the new behaviour.
