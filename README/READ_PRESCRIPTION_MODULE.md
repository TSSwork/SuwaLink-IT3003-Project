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
storage (`app.upload.dir`), re-encoded to WebP, metadata-only row in `images`. Prescription images
are private: they are served at `GET /api/images/{id}/content` (authenticated, `Cache-Control:
private, no-store`) and only to the uploader, the owning customer, a pharmacy targeted by the request,
or an `ADMIN` (otherwise `403`). Non-prescription images
(profile, inventory) are served publicly at `GET /api/images/public/{filename}`, which refuses
prescription images (`404`). `POST /api/images` rejects `imageType=PRESCRIPTION` (`400`); prescription
images are only created through `POST /api/prescriptions`.

## Targeting and responses

A request is sent to a set of target pharmacies (radius / district / all, see the targeting section
of the request endpoints). Only a targeted pharmacy may respond (`403` otherwise). A request is open
while `PENDING` or `RESPONDED`; responding to a `CLOSED` or `EXPIRED` request is rejected (`400`).
Each pharmacy gets exactly one response per request: a second `POST /api/prescriptions/{id}/responses`
returns `409` ("You have already responded; update your response instead"). To change it, the pharmacy
calls `PUT /api/prescriptions/{id}/responses/mine` (replaces message and items, prices refreshed from
inventory; `404` if no response yet) and the customer is notified "Pharmacy updated its response".
`GET /api/prescriptions/{id}/responses`: the owning customer and admins see all responses; a targeted
pharmacy sees only its own; anyone else gets `403`.

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

### `GET /api/prescriptions` — `PHARMACY_OWNER` only

All requests with `status = PENDING`, newest first — this is the "pharmacies can see submitted
requests" browsing view. No filtering by distance/area yet (no location data is collected).

### `GET /api/prescriptions/{id}` — `CUSTOMER` (owner only) or `PHARMACY_OWNER` (any)

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
  "imageUrl": "/api/images/<image-id>/content",
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

## Data retention

Prescription photos are sensitive, so they are not kept forever. A daily job
(`ExpiryJobs.purgeOldPrescriptionImages`, cron `app.jobs.retention-cron`, default `0 30 3 * * *`)
deletes the stored file of every request that is `CLOSED` or `EXPIRED` and was last updated more than
`app.prescription.image-retention-days` days ago (default **30**, pending lecturer confirmation).
Each image is purged in its own transaction; the `images` row stays with `purged_at` set, and
`GET /api/images/{id}/content` then answers `410 Gone` with code `IMAGE_PURGED`.
The deletion logic is `ImageService.purgeFile(Image)`, reused by account deletion.
Migration: `db/changelog/sql/010-consent-retention.sql` (also adds `users.terms_accepted_at`, set at
registration when the user accepts the terms and privacy policy via `acceptTerms: true`).
