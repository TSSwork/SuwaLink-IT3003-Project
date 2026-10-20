# Phase 1B — Prescription Targeting, Private Images, Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A prescription request goes only to the pharmacies the customer chose (10 km / district / all), and only those pharmacies, the customer and admins can see its image; each pharmacy answers once (editable); customers reserve several items from one pharmacy at a time, stock is decremented atomically and released when a 24 h hold expires, and every reservation has an unguessable pickup code that opens the order.

**Architecture:** The target list is computed once at request creation and stored in a join table, which then drives visibility, notification and image access. Images are no longer served as static files: public images through `/api/images/public/{file}`, prescription images through an authenticated `/api/images/{id}/content` that checks access. Reservations are reshaped into a header (`reservations`) plus lines (`reservation_items`); stock changes take a pessimistic row lock on each inventory row, in id order. Two `@Scheduled` jobs expire overdue requests and reservations.

**Tech Stack:** Spring Boot 4.1, Java 25, Spring Data JPA (pessimistic locks), Spring scheduling, Liquibase (MySQL), H2 + MockMvc tests, Testcontainers `SchemaMigrationTest`.

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` — §6.2, §6.4, §6.5, §7 (hold 24 h, request expiry 7 days, distance, reserving from a response, demo-off behaviour), §8 (Prescription request, Prescription response, Reservation), §9.3, §9.4, §9.5.

## Global Constraints

- Layering per `CONTEXT/SPECS.md` (controller → service interface → `service/impl` → repository; DTOs only; `ApiResponse` envelope; errors via `GlobalExceptionHandler`).
- Pharmacy visibility is decided only by `PharmacyVisibilityService` (`includeDemo()`, `isPubliclyVisible(Pharmacy)`); JPQL uses one shared fragment (Task 1).
- Target scopes exactly: `RADIUS_10KM`, `DISTRICT`, `ALL`. Radius is `10.0` km by Haversine (`GeoUtils.haversineKm`).
- Open prescription request = status `PENDING` or `RESPONDED`. New status `EXPIRED`. Request expiry `app.prescription.expiry-days=7`.
- Reservation statuses: `CONFIRMED`, `COMPLETED`, `CANCELLED`, `EXPIRED`. Hold `app.reservation.hold-hours=24`.
- Pickup code: 10 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` generated with `SecureRandom`, unique.
- `requiresPrescription` = `legalCategory != OTC` (same rule as search).
- Every schema change is a new Liquibase changeset `005-…` onward; bump the changeset count in `SchemaMigrationTest`. Dev data in `reservations` may be deleted by a migration (no production DB exists — spec §7).
- Build/test from `backend/`: `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock ./mvnw -Dmaven.compiler.release= -Dmaven.compiler.source=25 -Dmaven.compiler.target=25 -q clean test`.
- Branch `feature/phase1b-targeting-reservations` (stacked on `chore/remove-old-frontend`); one commit per task.

## Review Focus

1. **Customer picks "Within 10 km" with no pharmacy in range** — expected: `422` with a message suggesting "My district" or "All pharmacies", no image file written, nothing saved. Test in Task 2.
2. **Two customers reserve the last unit at the same moment** — expected: exactly one `201`, the other `409`, stock ends at 0, never negative. Test in Task 4.
3. **Pharmacy not in a request's target list tries to view it, its image, or respond** — expected: `403` (request/respond) and `403` (image), even though it is a verified pharmacy. Tests in Tasks 2 and 3.
4. **Reserving from a prescription response with a higher quantity than quoted, or for a request the caller doesn't own** — expected: `400` / `403`. Test in Task 4.
5. **Stranger opens `/r/<code>` (by-code endpoint) while logged in as a different customer or another pharmacy** — expected: `404`, same as a wrong code. Test in Task 5.

---

### Task 1: Shared visibility fragment and visible-pharmacy queries

**Files:**
- Create: `backend/src/main/java/com/suwalink/repository/VisibilityJpql.java` — `final class` with `public static final String VISIBLE_PHARMACY_P = "p.status = com.suwalink.entity.PharmacyStatus.VERIFIED AND (p.demo = false OR :includeDemo = true)"` (alias `p` = pharmacy).
- Modify: `repository/InventoryRepository.java` — `findOffers` and `findOffersByPharmacy` use the constant.
- Modify: `repository/PharmacyRepository.java` — add (all with `@Param("includeDemo") boolean includeDemo`, alias `p`):
  - `List<Pharmacy> findVisible(boolean includeDemo)`
  - `List<Pharmacy> findVisibleByDistrict(District district, boolean includeDemo)`
  - `List<Pharmacy> findVisibleInBox(BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng, boolean includeDemo)`
- Test: `repository/PharmacyRepositoryVisibilityTest.java` (`@DataJpaTest`‑style or `@SpringBootTest` with `test` profile, matching existing style)

**Interfaces:**
- Produces: `VisibilityJpql.VISIBLE_PHARMACY_P`; the three `PharmacyRepository` methods (Task 2 consumes).

- [ ] **Step 1: Write the failing tests** — seed: verified Colombo (6.927100/79.861200), verified Kandy (7.290600/80.633700), pending Colombo, demo verified Colombo.

```java
@Test void findVisibleExcludesPendingAndDemoWhenDemoOff()   // includeDemo=false → 2 (Colombo, Kandy)
@Test void findVisibleIncludesDemoWhenDemoOn()              // includeDemo=true → 3
@Test void findVisibleByDistrictFilters()                   // COLOMBO, false → 1
@Test void findVisibleInBoxFilters()                        // box 6.8..7.0 / 79.7..80.0, false → Colombo only
```

- [ ] **Step 2:** Run. Expected: compile failure.
- [ ] **Step 3:** Implement; refactor the two inventory queries onto the constant.
- [ ] **Step 4:** Full suite green (search tests prove the refactor kept behaviour).
- [ ] **Step 5:** Commit `refactor: shared pharmacy visibility JPQL and visible-pharmacy queries`.

### Task 2: Prescription request targeting, visibility and expiry

**Files:**
- Create: `entity/TargetScope.java` (`RADIUS_10KM, DISTRICT, ALL`).
- Modify: `entity/PrescriptionRequestStatus.java` — add `EXPIRED`.
- Modify: `entity/PrescriptionRequest.java` — add `targetScope` (not null), `latitude`, `longitude` (`BigDecimal` 9,6, nullable), `district` (`District`, nullable), `consentAt` (not null), `expiresAt` (not null), and `@ManyToMany(fetch = LAZY) @JoinTable(name = "prescription_request_targets", joinColumns = request_id, inverseJoinColumns = pharmacy_id) Set<Pharmacy> targetPharmacies`.
- Create: `db/changelog/sql/005-prescription-targeting.sql` (+ changeset). Existing dev rows: delete prescription responses/items and requests first (dev only), then add columns `NOT NULL`, create `prescription_request_targets` (PK (request_id, pharmacy_id), FKs), widen status enum with `EXPIRED`.
- Modify: `dto/request/CreatePrescriptionRequest.java` — add `@NotNull TargetScope targetScope`, `BigDecimal latitude`, `BigDecimal longitude`, `District district`, `@NotNull @AssertTrue(message = "You must agree to share the prescription with the selected pharmacies") Boolean consent`, and an `@AssertTrue(message = "Location is required for 'Within 10 km'; district is required for 'My district'") boolean isScopeLocationValid()` (RADIUS_10KM ⇒ lat+lng present and within the Sri Lanka range from Phase 1A; DISTRICT ⇒ district present).
- Create: `service/PrescriptionTargetingService.java` + `impl/PrescriptionTargetingServiceImpl.java` — `List<Pharmacy> findTargets(TargetScope scope, BigDecimal lat, BigDecimal lng, District district)`. RADIUS: bounding box `±10/111.0` degrees latitude, `±10/(111.0·cos(lat))` longitude via `findVisibleInBox`, then keep `haversineKm ≤ 10.0`. DISTRICT: `findVisibleByDistrict`. ALL: `findVisible`. Always passes `includeDemo()`.
- Create: `exception/NoPharmaciesInScopeException.java` → `422` in `GlobalExceptionHandler`. Messages: RADIUS `"No pharmacies within 10 km. Try 'My district' or 'All pharmacies'."`, DISTRICT `"No pharmacies in your district. Try 'All pharmacies'."`, ALL `"No pharmacies are available right now."`
- Modify: `service/impl/PrescriptionRequestServiceImpl.java`:
  - `create`: compute targets **before** uploading the image; empty ⇒ throw (nothing written). Save `targetScope`, location, district, `consentAt = now`, `expiresAt = now + expiry-days`, targets. Publish `PrescriptionAddedEvent` with the target pharmacies' user ids only.
  - `listPending` → rename to `listForMyPharmacy()`: requests where the current pharmacy is a target and status is open, newest first (repository JPQL `join r.targetPharmacies p where p.id = :pharmacyId and r.status in :open`).
  - `getById`: allowed for the owning customer, a targeted pharmacy, or `ADMIN`; otherwise `PrescriptionAccessDeniedException` (403).
  - `int expireOverdue(LocalDateTime now)`: open requests with `expiresAt < now` → `EXPIRED`; returns count.
- Create: `config/SchedulingConfig.java` (`@EnableScheduling`, disabled in `test` profile via `app.scheduling.enabled=false` property guard) and `service/impl/ExpiryJobs.java` with `@Scheduled(cron = "${app.jobs.expiry-cron:0 */15 * * * *}") void expirePrescriptionRequests()` calling `expireOverdue(LocalDateTime.now())`. (Task 5 adds the reservation job here.)
- Modify: `application.properties` — `app.prescription.expiry-days=7`, `app.scheduling.enabled=true`; `application-test.properties` — `app.scheduling.enabled=false`.
- Modify: `PrescriptionRequestController` — `GET /api/prescriptions` calls `listForMyPharmacy()`; `GET /{id}` allows `ADMIN` too.
- Modify: `dto/response/PrescriptionRequestResponse.java` — add `targetScope, district, targetCount, expiresAt`; `imageUrl` becomes `"/api/images/" + imageId + "/content"` (Task 3 serves it); add `imageId`.
- Test: rewrite affected cases in `PrescriptionRequestControllerTest` (multipart now needs `targetScope`, `consent`, and location/district) — add a `TestPayloads`‑style helper for the multipart params; new tests below.

**Interfaces:**
- Consumes: Task 1 repository methods; `PharmacyVisibilityService.includeDemo()`; `GeoUtils.haversineKm`.
- Produces: `PrescriptionRequest.getTargetPharmacies()`; `PrescriptionRequestRepository.existsByIdAndTargetPharmacies_Id(UUID requestId, UUID pharmacyId)` (or equivalent JPQL `isTargeted(requestId, pharmacyId)`) — Tasks 3 and 4 use it; `PrescriptionRequestStatus.EXPIRED`; `ExpiryJobs`.

- [ ] **Step 1: Write the failing tests.** Seed verified Colombo, Kandy, Galle (6.053500/80.221000) pharmacies.

```java
@Test void radiusScopeTargetsOnlyPharmaciesWithin10Km()     // customer at 6.93/79.86, RADIUS_10KM → 201, targetCount 1; only Colombo owner sees it in GET /api/prescriptions
@Test void districtScopeTargetsDistrict()                   // DISTRICT KANDY → targetCount 1
@Test void allScopeTargetsAllVisible()                      // ALL → targetCount 3 (pending/demo excluded)
@Test void radiusWithNoPharmacyReturns422AndSavesNothing()  // 9.66/80.02 (Jaffna) → 422, message contains "My district"; request count unchanged; no new file in upload dir
@Test void radiusWithoutLocationIs400()
@Test void districtWithoutDistrictIs400()
@Test void consentIsRequired()                              // consent=false → 400
@Test void nonTargetedPharmacyCannotSeeRequest()            // Kandy owner GET /{id} of a RADIUS-Colombo request → 403; not in its list
@Test void adminCanReadAnyRequest()
@Test void onlyTargetedPharmaciesAreNotified()              // notifications exist for Colombo owner only
@Test void expireOverdueMarksOpenRequestsExpired()          // expiresAt in the past → expireOverdue(now) returns 1, status EXPIRED, disappears from pharmacy list
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green incl. `SchemaMigrationTest` (count 5).
- [ ] **Step 5:** Commit `feat: prescription targeting by radius, district or all, with request expiry`.

### Task 3: Private prescription images; one editable response per pharmacy

**Files:**
- Modify: `service/impl/ImageServiceImpl.java` — `url` = `"/api/images/public/" + generatedFilename` for non‑`PRESCRIPTION` types, `"/api/images/" + id + "/content"` for `PRESCRIPTION` (set after save).
- Modify: `service/ImageService.java` + impl — add `ImageContent loadPublic(String generatedFilename)` and `ImageContent loadForCurrentUser(UUID imageId)`; `ImageContent` = record `(Resource resource, String mimeType, boolean isPrivate)` in `dto/response`. `loadPublic` looks the row up by `generatedFilename` and refuses `PRESCRIPTION` (404); never builds a path from the raw request string. `loadForCurrentUser`: non‑prescription → allowed to any authenticated user; prescription → allowed to the uploader, the owning customer of the request that references it, a targeted pharmacy of that request, or `ADMIN`; otherwise `403`. Missing row/file → 404.
- Modify: `controller/ImageController.java` — `GET /api/images/public/{filename}` (public, `Cache-Control: public, max-age=86400`), `GET /api/images/{id}/content` (authenticated, `Cache-Control: private, no-store`). Restrict `POST /api/images` so `imageType=PRESCRIPTION` is rejected with 400 (prescription images are only created through the prescription endpoint).
- Modify: `config/WebConfig.java` — remove the `/uploads/**` resource handler. `config/SecurityConfig.java` — remove `/uploads/**` permitAll; permit `GET /api/images/public/**`.
- Modify: `repository/PrescriptionRequestRepository.java` — `Optional<PrescriptionRequest> findByImageId(UUID imageId)`.
- Modify: `entity/PrescriptionResponse.java` + `005`‑follow‑up SQL `006-one-response-per-pharmacy.sql` — unique `(prescription_request_id, pharmacy_id)`.
- Modify: `service/impl/PrescriptionResponseServiceImpl.java`:
  - `create`: pharmacy must be targeted (else 403), request must be open (CLOSED/EXPIRED → existing `PrescriptionRequestClosedException`), pharmacy must not already have a response (→ `409` `DuplicateResourceException`, message `"You have already responded; update your response instead"`).
  - new `PrescriptionResponseResponse updateMine(UUID requestId, CreatePrescriptionResponseRequest request)`: replaces message and items of the caller's existing response (404 if none), same open/target checks, quoted `unitPrice` refreshed from inventory, publishes `PharmacyRespondedEvent` with `updated = true`.
  - `listForRequest`: owner customer sees all; a targeted pharmacy sees only its own; admin sees all; others 403.
- Modify: `event/PharmacyRespondedEvent.java` — add `boolean updated`; listener title "Pharmacy updated its response" when true.
- Modify: `controller/PrescriptionResponseController.java` — `PUT /api/prescriptions/{requestId}/responses/mine` (PHARMACY_OWNER).
- Modify: `README/READ_PRESCRIPTION_MODULE.md` — targeting, image access, one response per pharmacy.
- Test: `controller/PrescriptionImageAccessTest.java`; extend `PrescriptionResponseControllerTest`.

- [ ] **Step 1: Write the failing tests.**

```java
// PrescriptionImageAccessTest
@Test void ownerCanFetchPrescriptionImage()           // 200, Content-Type image/webp, Cache-Control contains "no-store"
@Test void targetedPharmacyCanFetchImage()            // 200
@Test void nonTargetedPharmacyGets403()
@Test void otherCustomerGets403()
@Test void anonymousGets401()
@Test void staticUploadsPathIsGone()                  // GET /uploads/<generatedFilename> → 401 or 404, never 200
@Test void publicEndpointRefusesPrescriptionImages()  // GET /api/images/public/<prescription file> → 404
@Test void publicInventoryImageIsServed()             // upload INVENTORY image as owner → GET its url anonymously → 200
@Test void genericUploadRejectsPrescriptionType()     // POST /api/images imageType=PRESCRIPTION → 400

// PrescriptionResponseControllerTest
@Test void nonTargetedPharmacyCannotRespond()         // 403
@Test void secondResponseFromSamePharmacyIs409()
@Test void pharmacyUpdatesItsResponse()               // PUT .../responses/mine → 200, items replaced; customer gets "updated" notification
@Test void cannotRespondToExpiredRequest()            // 409 (existing closed handling)
@Test void targetedPharmacySeesOnlyItsOwnResponse()   // two pharmacies respond; pharmacy A lists → 1
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green (count 6 in `SchemaMigrationTest`).
- [ ] **Step 5:** Commit `feat: private prescription images and one editable response per pharmacy`.

### Task 4: Multi‑line reservations with atomic stock

**Files:**
- Create: `entity/ReservationItem.java` (`reservation_items`: `id`, `reservation` (not null), `inventoryItem` (not null), `prescriptionResponseItem` (nullable), `quantity`, `unitPrice` DECIMAL(12,2), `medicineName` varchar(255), `requiresPrescription` boolean; extends `BaseAuditEntity`).
- Modify: `entity/ReservationStatus.java` — add `EXPIRED`.
- Modify: `entity/Reservation.java` — remove `inventoryItem`, `prescriptionResponseItem`, `quantity`, `unitPrice`; add `@OneToMany(mappedBy, cascade ALL, orphanRemoval) List<ReservationItem> items`, `pickupCode` (unique, length 10, not null), `expiresAt` (not null), `cancelledBy` (`CancelledBy`, nullable), `prescriptionRequest` (nullable `ManyToOne`), `demo` (`is_demo`, copied from pharmacy).
- Create: `db/changelog/sql/007-reservation-items.sql` (+ changeset) — delete existing dev reservations, drop old columns/FKs, add new columns, create `reservation_items` with FKs and audit table `reservation_items_aud` **only if** the entity is `@Audited` (it is not — keep it non‑audited like `Reservation`).
- Create: `util/PickupCodeGenerator.java` — `String next()` per Global Constraints; component with `SecureRandom`.
- Modify: `repository/InventoryRepository.java` — `@Lock(PESSIMISTIC_WRITE) @Query("select i from Inventory i join fetch i.pharmacy join fetch i.medicineMaster where i.id in :ids order by i.id") List<Inventory> lockAllById(Collection<UUID> ids)`.
- Replace: `dto/request/CreateReservationRequest.java` — `@NotEmpty @Valid List<Line> lines`; `Line { @NotNull UUID inventoryItemId; @NotNull @Positive Integer quantity; UUID prescriptionResponseItemId; }`.
- Replace: `dto/response/ReservationResponse.java` — `id, pickupCode, status, expiresAt, createdAt, cancelReason, cancelledBy, prescriptionRequestId, requiresPrescription (any line), total` + nested `pharmacy {id, name, phone, address, city, district, latitude, longitude}`, `customer {id, name}`, `items [{id, inventoryItemId, medicineName, quantity, unitPrice, lineTotal, requiresPrescription}]`.
- Modify: `service/impl/ReservationServiceImpl.java` `create`:
  1. Reject duplicate `inventoryItemId` across lines (400).
  2. `lockAllById` — any id missing → 404; lines from more than one pharmacy → 400 `"All items in one reservation must come from the same pharmacy"`.
  3. Pharmacy must pass `PharmacyVisibilityService.isPubliclyVisible` → else 404 (carry‑forward from 1A).
  4. Each line: inventory `available`, `expireDate > today`, `stockQuantity >= quantity` → else `409` (`InsufficientStockException` / new `ItemUnavailableException`).
  5. Response‑item lines: item exists; its response's request belongs to the caller (else 403) and is not `EXPIRED`/`CLOSED` (409); item's inventory == line inventory (400); `quantity <= quoted quantity` (400); `unitPrice` = quoted price; set `reservation.prescriptionRequest`. Plain lines use the inventory price.
  6. Decrement stock on the locked entities, build items with snapshots (`brandName + " " + strength`, `requiresPrescription`), `pickupCode`, `expiresAt = now + hold-hours`, `demo = pharmacy.isDemo()`, status `CONFIRMED`; save; publish `ReservationCreatedEvent`.
- Modify: `event/NotificationEventListener.java` — reservation messages use item count / first medicine name (`"Your reservation of 3 items at X is confirmed."`).
- Modify: `application.properties` — `app.reservation.hold-hours=24`.
- Test: rewrite `controller/ReservationControllerTest.java` create cases; add `controller/ReservationConcurrencyTest.java` (no class‑level `@Transactional`; cleans up in `@AfterEach`).

**Interfaces:**
- Consumes: `PharmacyVisibilityService`; `PrescriptionResponseItem` (`getPrescriptionResponse().getPrescriptionRequest()`, `getQuantity()`, `getUnitPrice()`, `getInventoryItem()`).
- Produces: `Reservation.getItems()`, `getPickupCode()`, `getExpiresAt()`; `ReservationItem`; `InventoryRepository.lockAllById`; `PickupCodeGenerator.next()` — Task 5 uses them.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void reservesSeveralItemsFromOnePharmacy()     // 2 lines → 201; items size 2; total = sum; stock decremented both; pickupCode matches ^[A-HJ-NP-Z2-9]{10}$; expiresAt ≈ now+24h
@Test void rejectsItemsFromTwoPharmacies()           // 400
@Test void rejectsDuplicateLines()                   // 400
@Test void rejectsInsufficientStockAndChangesNothing() // line 2 too large → 409; line 1 stock unchanged
@Test void rejectsExpiredOrUnavailableItem()          // 409
@Test void rejectsHiddenPharmacy()                    // pending pharmacy's inventory id → 404
@Test void requiresPrescriptionFlagFollowsLegalCategory() // PRESCRIPTION medicine → requiresPrescription true
@Test void reservesFromPrescriptionResponseAtQuotedPrice() // quote 9.50 vs inventory 12.00 → unitPrice 9.50; prescriptionRequestId set
@Test void cannotExceedQuotedQuantity()               // 400
@Test void cannotUseSomeoneElsesResponse()            // other customer → 403
// ReservationConcurrencyTest
@Test void lastUnitCanOnlyBeReservedOnce()            // stock 1; two threads POST qty 1 → one 201, one 409; final stock 0
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green (count 7).
- [ ] **Step 5:** Commit `feat: multi-line reservations with atomic stock and pickup codes`.

### Task 5: Reservation lifecycle — cancel, complete, expiry, pickup‑code lookup

**Files:**
- Modify: `service/ReservationService.java` + impl:
  - `cancel(UUID id, CancelReservationRequest)`: customer owner or owning pharmacy; only `CONFIRMED`; restore stock for every line under `lockAllById`; store `cancelledBy`, reason; publish `ReservationCancelledEvent`.
  - `complete(UUID id)`: owning pharmacy only; only `CONFIRMED` and not past `expiresAt` (else 409 `"This reservation has expired"`); publish `ReservationCompletedEvent` (new; listener notifies the customer).
  - `ReservationResponse getById(UUID id)`: customer owner, owning pharmacy, or admin; else 404.
  - `ReservationResponse getByPickupCode(String code)`: same access rule, else **404** (never 403, so codes can't be probed).
  - `int expireOverdue(LocalDateTime now)`: `CONFIRMED` with `expiresAt < now` → `EXPIRED`, restore stock, publish `ReservationExpiredEvent` (new; listener notifies both sides); returns count.
- Modify: `service/impl/ExpiryJobs.java` — add `expireReservations()` on the same cron.
- Modify: `controller/ReservationController.java` — `GET /api/reservations/{id}`, `GET /api/reservations/by-code/{code}` (any authenticated), existing `/me`, list (pharmacy), `PATCH /{id}/cancel`, `PATCH /{id}/complete`.
- Modify: `repository/ReservationRepository.java` — `Optional<Reservation> findByPickupCode(String code)`, `List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, LocalDateTime t)`; list queries `join fetch` items + pharmacy so mapping doesn't lazy‑load.
- Modify: `README/` — new `READ_RESERVATION_MODULE.md` (endpoints, statuses, hold, pickup code, QR target `/r/<code>`, prescription notice flag); add it to the `README.md` doc table.
- Test: extend `ReservationControllerTest`.

- [ ] **Step 1: Write the failing tests.**

```java
@Test void customerCancelsAndStockReturns()          // 200, CANCELLED, cancelledBy PATIENT, stock restored for all lines; pharmacy notified
@Test void pharmacyCancelsWithReason()               // cancelledBy PHARMACY, reason stored; customer notified
@Test void cannotCancelTwice()                       // 409
@Test void pharmacyCompletes()                       // 200, COMPLETED; customer notified
@Test void otherPharmacyCannotComplete()             // 403
@Test void cannotCompleteExpiredHold()               // expiresAt in past → 409
@Test void expireOverdueReleasesStock()              // expireOverdue(now) → 1; status EXPIRED; stock restored; both sides notified
@Test void ownerAndPharmacyCanOpenByPickupCode()     // 200 each
@Test void strangerGets404ByPickupCode()             // other customer and other pharmacy → 404
@Test void unknownPickupCodeIs404()
@Test void adminCanOpenAnyReservation()
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Full suite green.
- [ ] **Step 5:** Commit `feat: reservation cancel, complete, expiry and pickup-code lookup`.

---

## Done when

- Full suite green, including `ReservationConcurrencyTest` and `SchemaMigrationTest` (changesets `001`–`007`).
- `grep -rn "/uploads/" backend/src/main` returns nothing.
- Manual check on the dev stack: customer uploads a prescription with "My district"; only that district's pharmacy lists it and can open the image; it responds; customer reserves from the response; `GET /api/reservations/by-code/<code>` works for both and 404s for a second customer.
