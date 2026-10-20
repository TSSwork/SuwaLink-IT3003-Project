# Phase 1A — Pharmacy Location, Demo Visibility, Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pharmacies have a real profile and map location; one visibility rule (verified, and demo only when the admin switch is on) governs everything public; customers get an e‑commerce search grouped by medicine with offers sorted by distance or price, and public pharmacy pages.

**Architecture:** New columns on `pharmacies`/`users` and a new `app_settings` table via Liquibase `003-…`. A `PharmacyVisibilityService` owns the visibility rule and the demo switch; every public query takes its `includeDemo()` flag. Search loads matching offers with one JPQL query, then groups/sorts/pages in Java (catalog is small for the MVP). Distance is Haversine in a `GeoUtils` helper.

**Tech Stack:** Spring Boot 4.1, Java 25, Spring Data JPA, Liquibase (MySQL), H2 for tests, MockMvc.

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` — §6.1, §8 (Pharmacy, User, App settings), §9.1, §9.2, §9.8 (switch only), §7 (distance call).

## Global Constraints

- Layering per `CONTEXT/SPECS.md`: controller → service interface → `service/impl` → repository; DTOs only (request DTOs in `dto/request`, responses in `dto/response`); responses wrapped in `ApiResponse`; errors through `GlobalExceptionHandler`.
- Districts — exactly these 25, enum constants in this order: `AMPARA, ANURADHAPURA, BADULLA, BATTICALOA, COLOMBO, GALLE, GAMPAHA, HAMBANTOTA, JAFFNA, KALUTARA, KANDY, KEGALLE, KILINOCHCHI, KURUNEGALA, MANNAR, MATALE, MATARA, MONARAGALA, MULLAITIVU, NUWARA_ELIYA, POLONNARUWA, PUTTALAM, RATNAPURA, TRINCOMALEE, VAVUNIYA`.
- Coordinates are `BigDecimal`, column `DECIMAL(9,6)`; valid range latitude `5.85`–`9.90`, longitude `79.50`–`81.95` (Sri Lanka).
- **Publicly visible pharmacy** = `status = VERIFIED` AND (`demo = false` OR demo mode on). **Offer** = inventory `available = true` AND `stockQuantity > 0` AND `expireDate > today` AND pharmacy publicly visible.
- Demo mode setting key `demo_mode_public`, default `false`.
- Every schema change is a new Liquibase changeset + SQL file (`003-…`, `004-…`); `SchemaMigrationTest` must stay green.
- Build/test: `./mvnw -Dmaven.compiler.release= -Dmaven.compiler.source=25 -Dmaven.compiler.target=25 -q clean test` from `backend/` with `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock` exported (until the owner installs `java-25-openjdk-devel`, then plain `./mvnw -q clean test`).
- Branch `feature/phase1a-location-search` off `main`; one commit per task.

## Review Focus

1. **Search with location but no matching offers nearby / no offers at all** — expected: `200` with empty page, not an error. Test in Task 4.
2. **Same medicine stocked twice by one pharmacy (two batches)** — expected: `pharmacyCount` counts the pharmacy once; offers list shows both rows. Test in Task 4.
3. **Demo user holding a valid JWT when admin switches demo off** — expected: next request is `401`. Test in Task 3.
4. **`sort=distance` without `lat`/`lng`** — expected: falls back to price ordering, `distanceKm` null, no 400. Test in Task 4.
5. **Pharmacy page for a PENDING, REJECTED or hidden‑demo pharmacy** — expected: `404`, indistinguishable from "does not exist". Test in Task 5.

---

### Task 1: Pharmacy profile fields, district, registration

**Files:**
- Create: `backend/src/main/java/com/suwalink/entity/District.java`
- Modify: `entity/Pharmacy.java` — add `name` (not null), `phone` (not null), `district` (`@Enumerated(STRING)`, not null, length 20), `city` (not null), `latitude`, `longitude` (`BigDecimal`, `precision=9, scale=6`, not null), `openingHours` (nullable, length 255), `demo` (`boolean`, column `is_demo`, default false)
- Modify: `entity/User.java` — add `demo` (`boolean`, column `is_demo`, default false)
- Create: `db/changelog/sql/003-pharmacy-profile.sql`; Modify: `db.changelog-master.xml` (changeset `003-pharmacy-profile`). Add columns nullable, backfill existing rows (`name` ← owner `users.name`, `phone` ← owner `users.phone`, `district` ← `'COLOMBO'`, `city` ← `''`, `latitude/longitude` ← `6.927100/79.861200`), then make them `NOT NULL`; `is_demo` on both tables `BOOLEAN NOT NULL DEFAULT FALSE`.
- Modify: `dto/request/PharmacyRegisterRequest.java` — add required `pharmacyName` (`@NotBlank @Size(max=120)`), `district` (`@NotNull District`), `city` (`@NotBlank @Size(max=80)`), `latitude`, `longitude` (`@NotNull` + `@DecimalMin/@DecimalMax` with the constraint values), optional `openingHours` (`@Size(max=255)`). Existing `name` stays the owner's name.
- Modify: `service/impl/AuthServiceImpl.java` `registerPharmacy` — map new fields; `Pharmacy.phone` = request `phone`.
- Modify: every `pharmacy.getUser().getName()` used as a *pharmacy* name → `pharmacy.getName()` (`BookmarkServiceImpl:101`, `AdminServiceImpl:60`, `InventoryServiceImpl:159`, `ReservationServiceImpl:184`, `PrescriptionResponseServiceImpl:85,152`).
- Create: `backend/src/test/java/com/suwalink/support/TestPayloads.java` — `static String pharmacyRegistration(String email, String licenceNo)` returning the full valid JSON (owner name "Test Owner", pharmacyName "Test Pharmacy", phone "0112345678", password "SecurePass123", address "123 Test Rd", district "COLOMBO", city "Colombo", latitude 6.927100, longitude 79.861200) and `static String customerRegistration(String email)`. Replace the inline pharmacy‑registration JSON in every existing test with it (≈36 sites).
- Test: `controller/AuthControllerRegistrationTest.java`

**Interfaces:**
- Produces: `District` enum; `Pharmacy.getName()/getPhone()/getDistrict()/getCity()/getLatitude()/getLongitude()/getOpeningHours()/isDemo()`; `User.isDemo()`; `TestPayloads.pharmacyRegistration(email, licenceNo)`, `TestPayloads.customerRegistration(email)`.

- [ ] **Step 1: Write the failing tests** in `AuthControllerRegistrationTest`:

```java
@Test void pharmacyRegistrationStoresProfileAndLocation()
// POST TestPayloads.pharmacyRegistration("loc@example.com","LIC-LOC-1") → 201;
// saved pharmacy: name "Test Pharmacy", district COLOMBO, city "Colombo",
// latitude 6.927100, longitude 79.861200, phone "0112345678", demo false, status PENDING

@Test void pharmacyRegistrationRejectsCoordinatesOutsideSriLanka()   // latitude 51.5 → 400
@Test void pharmacyRegistrationRejectsUnknownDistrict()              // "district":"LONDON" → 400
@Test void pharmacyRegistrationRequiresPharmacyName()                // pharmacyName omitted → 400
```

- [ ] **Step 2:** Run `-Dtest=AuthControllerRegistrationTest`. Expected: compile failure / FAIL.
- [ ] **Step 3:** Implement entity, migration, DTO, service and name‑usage changes; add `TestPayloads` and switch all existing tests to it. Unknown enum values in JSON must produce `400` through `GlobalExceptionHandler` (add a handler for `HttpMessageNotReadableException` → 400 `ApiErrorResponse` if one does not exist).
- [ ] **Step 4:** Run the full suite (with `DOCKER_HOST`). Expected: all green including `SchemaMigrationTest`.
- [ ] **Step 5:** Commit `feat: pharmacy profile, district and map location at registration`.

### Task 2: Pharmacy self‑service profile and admin view

**Files:**
- Create: `dto/request/UpdatePharmacyProfileRequest.java` — `name, phone, address, district, city, latitude, longitude, openingHours` with the same validation as registration (`name` = pharmacy name).
- Create: `dto/response/PharmacyProfileResponse.java` — `id, name, phone, address, district, city, latitude, longitude, openingHours, licenceNo, status, ownerName, ownerEmail`.
- Create: `service/PharmacyProfileService.java` + `service/impl/PharmacyProfileServiceImpl.java` — `PharmacyProfileResponse getMyProfile()`, `PharmacyProfileResponse updateMyProfile(UpdatePharmacyProfileRequest)`; current pharmacy via `CurrentUserProvider` + `PharmacyRepository.findByUserId`.
- Create: `controller/PharmacyController.java` — `@RequestMapping("/api/pharmacies")`; `GET /me`, `PUT /me`, both `@PreAuthorize("hasRole('PHARMACY_OWNER')")`. (Task 5 adds the public `GET /{id}` here.)
- Modify: `dto/response/PharmacyResponse.java` + `AdminServiceImpl` mapping — add `phone, district, city, latitude, longitude, openingHours, demo`; `pharmacyName` from `pharmacy.getName()`.
- Test: `controller/PharmacyProfileControllerTest.java`; extend `AdminControllerTest`.

**Interfaces:**
- Consumes: Task 1 entity fields, `TestPayloads`.
- Produces: `PharmacyController` class (Task 5 adds a method), `PharmacyProfileService`.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void ownerReadsOwnProfile()            // GET /api/pharmacies/me → 200, $.data.name "Test Pharmacy", $.data.district "COLOMBO"
@Test void ownerUpdatesLocationAndHours()    // PUT /me {..., district "KANDY", city "Kandy", latitude 7.290600, longitude 80.633700, openingHours "8am-9pm"} → 200; GET again reflects it
@Test void updateRejectsInvalidCoordinates() // longitude 100 → 400
@Test void customerCannotReadPharmacyProfile() // customer token → 403
// AdminControllerTest:
@Test void adminPharmacyListIncludesLocation() // $.data[0].district, .latitude, .longitude present
```

- [ ] **Step 2:** Run the new tests. Expected: FAIL (404 / missing fields).
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green.
- [ ] **Step 5:** Commit `feat: pharmacy profile self-service and admin location view`.

### Task 3: Demo switch and the visibility rule

**Files:**
- Create: `entity/AppSetting.java` (`app_settings`: `setting_key` varchar(64) PK, `setting_value` varchar(255) not null, `updated_at`), `repository/AppSettingRepository.java`
- Create: `db/changelog/sql/004-app-settings.sql` (+ changeset `004-app-settings`) — table and row `('demo_mode_public','false')`.
- Create: `service/PharmacyVisibilityService.java` + `impl/PharmacyVisibilityServiceImpl.java`:
  - `boolean isDemoModePublic()` (missing row ⇒ `false`)
  - `void setDemoModePublic(boolean value)` (upsert)
  - `boolean includeDemo()` (alias of `isDemoModePublic()`, used by queries)
  - `boolean isPubliclyVisible(Pharmacy pharmacy)`
- Create: `dto/response/AppSettingsResponse.java` (`boolean demoModePublic`), `dto/request/UpdateAppSettingsRequest.java` (`@NotNull Boolean demoModePublic`).
- Modify: `controller/AdminController.java` — `GET /api/admin/settings`, `PUT /api/admin/settings`.
- Create: `controller/PublicSettingsController.java` — `GET /api/settings/public` → `AppSettingsResponse` (no auth; the login page uses it to show demo buttons).
- Modify: `security/UserDetailsServiceImpl.java` — build the Spring `User` with `enabled = !(user.isDemo() && !visibility.isDemoModePublic())`.
- Modify: `security/JwtAuthenticationFilter.java` — if `!userDetails.isEnabled()`, clear context (request ends as 401).
- Modify: `exception/GlobalExceptionHandler.java` — `DisabledException` → `403` with message `"Demo accounts are currently disabled"`.
- Modify: `config/SecurityConfig.java` — permit `GET /api/settings/public`.
- Test: `controller/DemoModeTest.java`, `service/PharmacyVisibilityServiceImplTest.java`

**Interfaces:**
- Produces: `PharmacyVisibilityService` (exact methods above) — Tasks 4 and 5 and Phase 1B targeting call `includeDemo()` / `isPubliclyVisible(..)`.

- [ ] **Step 1: Write the failing tests.**

```java
// PharmacyVisibilityServiceImplTest (unit, mocked repo)
@Test void verifiedRealPharmacyIsVisible()
@Test void pendingPharmacyIsNotVisible()
@Test void demoPharmacyVisibleOnlyWhenDemoModeOn()
@Test void missingSettingMeansDemoModeOff()

// DemoModeTest (MockMvc, test profile)
@Test void adminTogglesDemoMode()            // PUT /api/admin/settings {"demoModePublic":true} → 200; GET /api/settings/public → $.data.demoModePublic true
@Test void nonAdminCannotChangeSettings()    // customer → 403
@Test void demoUserCannotLoginWhenDemoModeOff() // user with demo=true → POST /api/auth/login → 403, message "Demo accounts are currently disabled"
@Test void demoUserCanLoginWhenDemoModeOn()  // → 200
@Test void demoUserTokenStopsWorkingWhenSwitchedOff() // login with mode on, switch off, GET /api/users/me with that token → 401
```

- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green (incl. `SchemaMigrationTest`).
- [ ] **Step 5:** Commit `feat: admin demo-mode switch and pharmacy visibility rule`.

### Task 4: Medicine search, medicine detail, offers

**Files:**
- Create: `util/GeoUtils.java` — `static double haversineKm(double lat1, double lng1, double lat2, double lng2)` (earth radius `6371.0`).
- Modify: `repository/InventoryRepository.java` — add `List<Inventory> findOffers(String query, UUID categoryId, UUID medicineId, District district, boolean includeDemo, LocalDate today)` (JPQL; offer rule from Global Constraints; `query` matches brand or generic name case‑insensitively; every filter optional when null; `join fetch` medicine, category, manufacturer and pharmacy so mapping does not lazy‑load).
- Create: `dto/response/PageResponse.java` — generic `content, page, size, totalElements, totalPages`.
- Create: `dto/response/MedicineSearchResult.java` — `medicineId, brandName, genericName, dosageForm, strength, category, manufacturer, legalCategory, requiresPrescription, imageUrl, pharmacyCount, lowestPrice, currency, nearestDistanceKm (Double, nullable)`.
- Create: `dto/response/MedicineDetailResponse.java` — medicine fields + `requiresPrescription`, `description`.
- Create: `dto/response/OfferResponse.java` — `inventoryId, unitPrice, currency, stockQuantity, expireDate, distanceKm (nullable)` + nested `pharmacy {id, name, phone, address, district, city, latitude, longitude, openingHours}`.
- Create: `service/MedicineSearchService.java` + `impl/MedicineSearchServiceImpl.java`:
  - `PageResponse<MedicineSearchResult> search(String q, UUID categoryId, District district, BigDecimal lat, BigDecimal lng, int page, int size)`
  - `MedicineDetailResponse getMedicine(UUID id)` (404 via `ResourceNotFoundException` if absent)
  - `List<OfferResponse> getOffers(UUID medicineId, District district, BigDecimal lat, BigDecimal lng, String sort)`
- Modify: `controller/MedicineCatalogController.java` — add `GET /api/medicines/search` (`page` default 0, `size` default 20, max 50), `GET /api/medicines/{id}`, `GET /api/medicines/{id}/offers`. Existing `GET /api/medicines` stays owner‑only.
- Modify: `config/SecurityConfig.java` — permit `GET /api/medicines/search`, `GET /api/medicines/*`, `GET /api/medicines/*/offers`; keep exact `/api/medicines` owner‑only.
- Modify: `InventoryServiceImpl.search` / `InventoryRepository.search` — apply the same offer + visibility rule (old endpoint kept for the old frontend until Phase 2).
- Test: `controller/MedicineSearchControllerTest.java`, `util/GeoUtilsTest.java`

Rules: `requiresPrescription` = `legalCategory != OTC`. `pharmacyCount` = distinct pharmacies. `lowestPrice` = min `unitPrice` across offers. Sort results: with `lat`+`lng` → `nearestDistanceKm` ascending; otherwise `pharmacyCount` descending, then `brandName`. Offers `sort`: `distance` (needs `lat`+`lng`, else falls back to `price`) or `price` (default when no location); ties by price then pharmacy name. Distances rounded to 0.1 km.

- [ ] **Step 1: Write the failing tests.** Seed data directly through repositories (two verified pharmacies — Colombo 6.927100/79.861200 and Kandy 7.290600/80.633700 — one pending, one demo; Panadol stocked by both verified pharmacies at 12.00 and 10.00, plus an expired batch, a zero‑stock row and an unavailable row that must never appear).

```java
// GeoUtilsTest
@Test void colomboToKandyIsAbout94Km()   // haversineKm(6.9271,79.8612,7.2906,80.6337) between 93.0 and 96.0

// MedicineSearchControllerTest
@Test void searchGroupsOffersByMedicine()        // q=panadol → one result, pharmacyCount 2, lowestPrice 10.00, requiresPrescription false
@Test void searchHidesPendingDemoExpiredZeroStockAndUnavailable() // counts unaffected by those rows
@Test void searchCountsAPharmacyOnceForTwoBatches() // second batch at same pharmacy → pharmacyCount still 2
@Test void searchWithLocationReportsNearestDistance() // lat/lng near Kandy → nearestDistanceKm < 5
@Test void searchFiltersByDistrict()              // district=KANDY → pharmacyCount 1
@Test void searchWithNoMatchesReturnsEmptyPage()  // q=zzz → 200, content empty, totalElements 0
@Test void searchIsPublic()                       // no token → 200
@Test void demoPharmacyAppearsWhenDemoModeOn()    // setDemoModePublic(true) → pharmacyCount 3
@Test void offersSortedByDistance()               // lat/lng near Kandy, sort=distance → first offer's pharmacy.city "Kandy", distanceKm set
@Test void offersSortedByPriceWithoutLocation()   // sort=distance, no lat/lng → first unitPrice 10.00, distanceKm null
@Test void medicineDetailReturns404ForUnknownId()
@Test void oldInventorySearchAppliesOfferRule()   // GET /api/inventory/search?query=panadol excludes pending/expired rows
```

- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green.
- [ ] **Step 5:** Commit `feat: grouped medicine search, medicine detail and offers by distance or price`.

### Task 5: Public pharmacy page

**Files:**
- Create: `dto/response/PharmacyPublicResponse.java` — `id, name, phone, address, district, city, latitude, longitude, openingHours, items` where each item = `inventoryId, medicineId, brandName, genericName, strength, dosageForm, requiresPrescription, unitPrice, currency, stockQuantity`.
- Modify: `service/PharmacyProfileService.java` + impl — `PharmacyPublicResponse getPublicPharmacy(UUID id)`; throws `ResourceNotFoundException` unless `PharmacyVisibilityService.isPubliclyVisible`; items are that pharmacy's offers (same offer rule; reuse `findOffers` or add `findOffersByPharmacy`), sorted by `brandName`.
- Modify: `controller/PharmacyController.java` — `GET /api/pharmacies/{id}` (public).
- Modify: `config/SecurityConfig.java` — permit `GET /api/pharmacies/*` but **not** `/api/pharmacies/me` (order the matcher for `/me` first).
- Modify docs: `README/READ_INVENTORY_MODULE.md` gets a "Search & offers" section listing the new endpoints and the offer/visibility rule; `README.md` doc table unchanged.
- Test: `controller/PharmacyPublicControllerTest.java`

- [ ] **Step 1: Write the failing tests.**

```java
@Test void publicPageShowsProfileAndOffers()   // verified pharmacy → 200, name, district, items size 1 (expired/zero-stock excluded)
@Test void pendingPharmacyIs404()
@Test void rejectedPharmacyIs404()
@Test void demoPharmacyIs404WhenDemoModeOff()
@Test void unknownIdIs404()
@Test void meStillRequiresOwnerRole()          // GET /api/pharmacies/me without token → 401
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green.
- [ ] **Step 5:** Commit `feat: public pharmacy page`.

---

## Done when

- Full suite green, including `SchemaMigrationTest` with changesets `001`–`004`.
- Manual check on the dev stack: register a pharmacy with location, approve it as admin, add inventory, then `GET /api/medicines/search?q=<name>&lat=..&lng=..` returns it with a distance; toggling demo mode via `/api/admin/settings` is reflected in `/api/settings/public`.
