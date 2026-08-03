# Admin Module — What's Built, How to Use It

Lets an `ADMIN` user see platform-wide counts, review pharmacy applications, and manage users.
Everything under `/api/admin/**` requires `Authorization: Bearer <token>` for a user with role
`ADMIN` (enforced by `SecurityConfig`'s `.requestMatchers("/api/admin/**").hasRole("ADMIN")`, not
per-endpoint `@PreAuthorize`).

A bootstrap admin account is seeded by `db/changelog/sql/004-admin-role.sql`:

```
email: admin@suwalink.local
password: AdminPass123!
```

## Pharmacy status model

`Pharmacy.status` is a `PharmacyStatus` enum — `PENDING` (default at registration) / `VERIFIED` /
`REJECTED`. This replaced an earlier plain `is_verified` boolean (migration
`010-pharmacy-status.sql`), specifically so a rejected application is a distinct, visible state
rather than indistinguishable from "never reviewed." Login for a `PHARMACY_ADMIN` checks
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

- `frontend/admin-dashboard.html` + `assets/js/admin.js` — reads the five dashboard counts above.
- `frontend/manage-pharmacies.html` + `assets/js/pages/managePharmaciesPage.js` — lists pharmacies,
  Approve/Reject buttons call the endpoints above and re-render.
- `frontend/manage-users.html` + `assets/js/pages/manageUsersPage.js` — lists users, Delete button
  calls the delete endpoint; a `409` shows an inline error instead of failing silently.
- These three pages use jQuery for DOM/event handling (per `CONTEXT/SPECS.md`'s tech stack; loaded
  via CDN in each page) alongside the shared `assets/js/api/apiService.js` for the actual HTTP
  calls, same as the rest of the frontend.
- All three read the session via `assets/js/auth/tokenStorage.js` (`suwalink.auth` in
  `localStorage`) through `requireAuth()` — don't read `localStorage.getItem("token")` directly,
  that key doesn't exist and silently produces `Authorization: Bearer null`.
