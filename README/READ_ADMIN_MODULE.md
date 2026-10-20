# Admin Module — What's Built, How to Use It

Lets an `ADMIN` user see platform-wide counts, review pharmacy applications, and manage users.
Everything under `/api/admin/**` requires `Authorization: Bearer <token>` for a user with role
`ADMIN` (enforced by `SecurityConfig`'s `.requestMatchers("/api/admin/**").hasRole("ADMIN")`, not
per-endpoint `@PreAuthorize`).

A bootstrap admin account is created at startup by `AdminBootstrap` when no `ADMIN` exists, from
`app.admin.email` / `app.admin.password`. In the `dev` profile that is `admin@suwalink.local` with the
dev-only password in `application-dev.properties`; in production set `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Pharmacy status model

`Pharmacy.status` is a `PharmacyStatus` enum — `PENDING` (default at registration) / `VERIFIED` /
`REJECTED`. This replaced an earlier plain `is_verified` boolean (migration
`010-pharmacy-status.sql`), specifically so a rejected application is a distinct, visible state
rather than indistinguishable from "never reviewed." Login for a `PHARMACY_OWNER` checks
`status == VERIFIED`; `PENDING` and `REJECTED` both fail with `403`, but with different messages
so the frontend/support can tell them apart.

## Standard response envelope

Same as every other module: `{ "success": true, "message": "...", "data": {} }` — except the
endpoints on `AdminController` currently return their DTOs/plain strings directly (not wrapped in
`ApiResponse`), which is inconsistent with the rest of the codebase but is how it's implemented
today. Don't assume `data`/`success` wrappers on these specific endpoints.

## Endpoints

### `GET /api/admin/dashboard`

```json
{
  "totalCustomers": 12,
  "totalPharmacies": 5,
  "verifiedPharmacies": 3,
  "pendingPharmacies": 1,
  "rejectedPharmacies": 1
}
```

All five counts are real repository queries (`countByRole`, `count`, `countByStatus` x3) — this
used to be hardcoded to all-zeros.

### `GET /api/admin/pharmacies`

Every pharmacy, each with `id`, `pharmacyName`, `email`, `licenceNo`, `address`, `status`
(`"PENDING" | "VERIFIED" | "REJECTED"`).

### `PUT /api/admin/pharmacies/{id}/approve`

Sets `status = VERIFIED`, publishes `PharmacyVerifiedEvent` (notifies the applicant). `404` if the
pharmacy doesn't exist.

### `PUT /api/admin/pharmacies/{id}/reject`

Sets `status = REJECTED`, publishes `PharmacyRejectedEvent` (notifies the applicant). A rejected
pharmacy's user account still exists — this doesn't delete anything, it's purely a status change.
There's no "un-reject" endpoint; re-approve via the same `approve` endpoint if needed.

### `GET /api/admin/users`

Every user, each with `id`, `name`, `email`, `phone`, `role`.

### `DELETE /api/admin/users/{id}`

Deletes a user. Returns `409` (not `500`) if the user has dependent rows — a linked `Pharmacy`, any
`PrescriptionRequest`, `Bookmark`, or `Notification` — since none of those foreign keys cascade.
There's no cascade-delete implemented; if you need to actually remove a pharmacy-admin account,
you'd need to delete their dependent rows first (out of scope for this module today).

## Frontend

The admin pages are being rebuilt in the TanStack Start app (`frontend/`).
