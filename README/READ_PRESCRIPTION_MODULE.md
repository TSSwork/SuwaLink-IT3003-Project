# Prescription Request Module — What's Built, How to Use It

Lets a patient upload a photo of their prescription (plus their age and an optional note) so
pharmacies can later respond with matching stock. Builds on the auth module
(`READ_AUTHENTICATION_ENDPOINT.md`) for who's calling, and the inventory module's `ImageService`
(`READ_INVENTORY_MODULE.md`) for storing the photo on disk.

**Now built in separate modules** (this doc only covers the request itself — see the module for
details):

- Tagging a pharmacy's inventory against a request (`status` moving to `RESPONDED`) — see the
  `PrescriptionResponse`/`PrescriptionResponseController` module.
- Reserving matched inventory — see the `Reservation`/`ReservationController` module.
- Notifications (new prescription request, pharmacy responded, reservation created/cancelled) —
  fire via `PrescriptionAddedEvent`/`PharmacyRespondedEvent`/`ReservationCreatedEvent`/
  `ReservationCancelledEvent`, handled in `NotificationEventListener`.

This module itself is CRUD + close: a patient can create, view, edit, delete, and close their own
requests; a pharmacy can browse pending ones and view one in detail.

## Entity

**`prescription_requests` table** (`com.suwalink.entity.PrescriptionRequest`, extends
`BaseAuditEntity` like `Inventory`/`MedicineMaster` — so it also carries `version`, `createdBy`,
`updatedBy`, `createdAt`, `updatedAt`)

| Column        | Type              | Notes                                             |
|---------------|-------------------|-----------------------------------------------------|
| id            | BINARY(16) (PK)   | generated                                            |
| patient_id    | FK -> users.id    | who submitted it                                     |
| image_id      | FK -> images.id   | the uploaded photo; see "Image storage" below        |
| patient_age   | INT               | required, 0–120                                      |
| note          | TEXT              | optional, max 1000 chars                             |
| status        | ENUM              | `PENDING` (default) / `RESPONDED` / `CLOSED`         |

`PrescriptionRequestStatus` is a different enum from `PrescriptionStatus` — the latter already
existed and classifies a *medicine's* legal category (OTC/prescription/controlled) on
`MedicineMaster`. Don't confuse the two. `RESPONDED` is set by the `PrescriptionResponse` module
when a pharmacy responds; `CLOSED` is set by the patient via `PATCH /api/prescriptions/{id}/close`
(see below) once they're done with the request.

## Image storage

Reuses the inventory module's `ImageService.upload(file, ImageType.PRESCRIPTION)` — same local-disk
storage (`app.upload.dir`), re-encoded to WebP, metadata-only row in `images`, served back at
`/uploads/<generated-filename>` (already `permitAll` in `SecurityConfig`). `ImageType` gained a
third value, `PRESCRIPTION`, alongside the existing `PROFILE`/`INVENTORY`.

Deleting a request (or replacing its image via update) also deletes the old `images` row and its
file on disk — a prescription image isn't shared the way an inventory photo might be, so nothing
else points at it.

## Standard response envelope

Same as every other module: `{ "success": true, "message": "...", "data": {} }`, errors via
`ApiErrorResponse`.

## Endpoints

All endpoints require a valid `Authorization: Bearer <token>` — there's no public prescription
endpoint.

### `POST /api/prescriptions` — `CUSTOMER` only

`multipart/form-data`, not JSON (there's a file part):

| Part          | Type          | Notes                          |
|---------------|---------------|----------------------------------|
| `image`       | file          | required                         |
| `patientAge`  | text          | required, 0–120                  |
| `note`        | text          | optional, max 1000 chars         |

Response (`201`): a `PrescriptionRequestResponse` (see shape below), `status: "PENDING"`.

### `GET /api/prescriptions/me` — `CUSTOMER` only

The current patient's own requests, newest first. Response (`200`): `data` is an array.

### `GET /api/prescriptions` — `PHARMACY_ADMIN` only

All requests with `status = PENDING`, newest first — this is the "pharmacies can see submitted
requests" browsing view. No filtering by distance/area yet (no location data is collected).

### `GET /api/prescriptions/{id}` — `CUSTOMER` (owner only) or `PHARMACY_ADMIN` (any)

`403` if a customer requests someone else's prescription. `404` if the id doesn't exist.

### `PUT /api/prescriptions/{id}` — `CUSTOMER`, must be the owner

Same multipart shape as create, except `image` is optional — omit it to keep the existing photo.
`patientAge` is still required on every update (resend the current value if unchanged).

### `DELETE /api/prescriptions/{id}` — `CUSTOMER`, must be the owner

Hard delete — removes the row and the underlying image file. `200` with no data on success.

### `PATCH /api/prescriptions/{id}/close` — `CUSTOMER`, must be the owner

Sets `status` to `CLOSED`. `403` if the caller doesn't own the request.

## Response shape (`PrescriptionRequestResponse`)

```json
{
  "id": "uuid",
  "patientId": "uuid",
  "patientName": "...",
  "patientAge": 34,
  "note": "...",
  "status": "PENDING",
  "imageUrl": "/uploads/<generated-filename>.webp",
  "createdAt": "2026-...",
  "updatedAt": "2026-..."
}
```

There's deliberately no `taggedDrugs`/response list on this DTO — pharmacy responses live in their
own `PrescriptionResponseResponse` DTO (a separate `GET` on the `PrescriptionResponseController`),
rather than being nested here.

## For other developers

- Ownership check pattern mirrors `InventoryServiceImpl.ownedInventoryItem`: look up by id via
  `ResourceNotFoundException` if missing, then compare `patient.getId()` against
  `CurrentUserProvider.getCurrentUser().getId()`, throwing `PrescriptionAccessDeniedException`
  (403) on mismatch.
- Role gating uses `@PreAuthorize` like the rest of the codebase (`@EnableMethodSecurity` is
  already on `SecurityConfig`) — no manual `if (role == ...)` checks in the controller.
- Migration: `db/changelog/sql/006-prescription-requests.sql` (new table + widens the
  `images.image_type` enum). Tests run against H2 with Hibernate's own schema generation
  (`spring.liquibase.enabled=false` in the test profile), so this migration only matters for the
  real MySQL database — see `commands.md`.
