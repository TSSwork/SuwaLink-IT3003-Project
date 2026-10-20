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
`REJECTED` / `DEACTIVATED` (owner deleted their account). This replaced an earlier plain `is_verified` boolean (migration
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

### `GET /api/admin/users?q=&status=ACTIVE|SUSPENDED|DELETED`

Users with `id`, `name`, `email`, `phone`, `role`, `status`. `q` matches name or email
(case-insensitive). Without `status`, every account that isn't deleted is listed.

### `PUT /api/admin/users/{id}/suspend` / `PUT /api/admin/users/{id}/reactivate`

A suspended user can't log in (`403 ACCOUNT_SUSPENDED`, distinct from `403 DEMO_DISABLED`) and their
existing tokens get `401`. Not allowed on admin accounts (`409 ACCOUNT_ACTION_NOT_ALLOWED`); `404` for
unknown or deleted users.

### `DELETE /api/admin/users/{id}` (and `DELETE /api/users/me` with `{ "password": "..." }`)

Deletion is by anonymisation (`AccountService`); nothing is hard-deleted. Name becomes
`Deleted user`, email `deleted-<id>@deleted.suwalink.invalid`, phone `0000000000`, password a random
hash, `deleted_at` set; old tokens get `401` and the original email can register again (tokens are
also matched to the account id, so an old token never works for the new account). The user's
notifications are removed.

- Customer: CONFIRMED reservations are cancelled as by the patient (reason `Account deleted`, stock
  returned, pharmacy notified), open prescription requests are closed, their prescription image files
  are deleted (`purged_at` set), the note and location (`note`, `latitude`, `longitude`, `district`) of
  all their requests are cleared, bookmarks removed, and pharmacies' notifications naming them (found by the
  `customerId` param) now say `Deleted user`.
- Pharmacy owner: refused with `409 OPEN_RESERVATIONS` while any reservation is `CONFIRMED`; otherwise
  the pharmacy's inventory rows are locked first (as a reservation create does), then the pharmacy becomes `DEACTIVATED` (hidden everywhere) and all its inventory unavailable. Existing
  prescription responses keep the pharmacy name with `pharmacyActive: false`.
- Admins can't be deleted, by themselves or another admin (`409 ACCOUNT_ACTION_NOT_ALLOWED`).
  Self-deletion with a wrong password is `400 INVALID_PASSWORD`.

## Frontend

The admin pages are being rebuilt in the TanStack Start app (`frontend/`).
