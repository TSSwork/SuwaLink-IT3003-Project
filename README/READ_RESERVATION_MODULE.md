# Reservation Module — What's Built, How to Use It

A customer reserves (holds) stock at one pharmacy and collects it with a pickup code. There is no
payment gateway: a reservation is the only checkout, from search results or from a pharmacy's
prescription quote. Code: `ReservationController` → `ReservationService` / `ReservationServiceImpl`,
entities `Reservation` and `ReservationItem`, scheduled expiry in `ExpiryJobs`.

## Entities

**`reservations`**: `patient_id` (the customer), `pharmacy_id`, optional `prescription_request_id`
(set when any line came from a quote), `pickup_code` (unique), `expires_at`, `status`,
`cancel_reason`, `cancelled_by` (`PATIENT` / `PHARMACY`), `is_demo` (copied from the pharmacy),
plus the `BaseAuditEntity` columns (`version`, `created_at`, …).

**`reservation_items`**: one row per line: `inventory_id`, optional `prescription_response_item_id`,
`quantity`, and snapshots of `unit_price`, `medicine_name` and `requires_prescription` taken at
reservation time, so later edits to inventory don't rewrite history.

## Statuses

| Status | Meaning | Reached by |
|---|---|---|
| `CONFIRMED` | Stock is held for the customer | creation (auto-confirmed) |
| `COMPLETED` | Collected at the counter | owning pharmacy, `PATCH /{id}/complete` |
| `CANCELLED` | Called off, stock returned | customer owner or owning pharmacy, `PATCH /{id}/cancel` |
| `EXPIRED` | Not collected in time, stock returned | scheduled job |

Only a `CONFIRMED` reservation can be cancelled or completed; anything else returns `409`.

## Hold and expiry

`expires_at = created + app.reservation.hold-hours` (default `24`). `ExpiryJobs.expireReservations()`
runs on `app.jobs.expiry-cron` (default every 15 minutes, scheduling is off in tests) and calls
`ReservationService.expireOverdue(now)`: every `CONFIRMED` reservation with `expires_at < now`
becomes `EXPIRED`, its stock is restored, and both the customer and the pharmacy are notified.
A pharmacy cannot complete a reservation whose hold has passed, even before the job has run:
`409 "This reservation has expired"`.

## Pickup code and QR

10 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `I`, `L`, `O`, `0`, `1`), generated with
`SecureRandom` and checked for uniqueness. The QR code shown to the customer encodes
`https://<host>/r/<pickupCode>`, so a normal phone camera opens the order page, which calls
`GET /api/reservations/by-code/{code}`. The pharmacy can also type the code. Lookup is
case-insensitive.

## Endpoints

All require a JWT.

| Method | Path | Who | Notes |
|---|---|---|---|
| `POST` | `/api/reservations` | CUSTOMER | `{ "lines": [ { "inventoryItemId", "quantity", "prescriptionResponseItemId"? } ] }` → `201` |
| `GET` | `/api/reservations/me` | CUSTOMER | own reservations, newest first |
| `GET` | `/api/reservations` | PHARMACY_OWNER | the pharmacy's incoming reservations, newest first |
| `GET` | `/api/reservations/{id}` | any authenticated | customer owner, owning pharmacy or admin; everyone else `404` |
| `GET` | `/api/reservations/by-code/{code}` | any authenticated | same rule; never `403`, so codes can't be probed |
| `PATCH` | `/api/reservations/{id}/cancel` | CUSTOMER, PHARMACY_OWNER | optional `{ "reason": "…" }` (max 255) |
| `PATCH` | `/api/reservations/{id}/complete` | PHARMACY_OWNER | owning pharmacy only (`403` otherwise) |

The response (`ReservationResponse`) carries `id`, `pickupCode`, `status`, `expiresAt`, `createdAt`,
`cancelReason`, `cancelledBy`, `prescriptionRequestId`, `total`, a `pharmacy` summary (name, phone,
address, city, district, coordinates), a `customer` summary (id, name) and `items` (each with
`medicineName`, `quantity`, `unitPrice`, `lineTotal`, `requiresPrescription`).

**Prescription notice flag:** each line's `requiresPrescription` is `legalCategory != OTC` (same rule
as search), and the top-level `requiresPrescription` is true when any line needs one, so the UI can
tell the customer to bring the prescription to pickup.

## Creation rules

- At least one line; a `null` line is rejected (`400`). Each inventory item at most once (`400`).
- All lines from one pharmacy (`400`); the pharmacy must be publicly visible (`404` otherwise).
- Unknown inventory item → `404`; unavailable, expired or out-of-stock item → `409`.
- All or nothing: the inventory rows are locked before any check, and stock is decremented only
  once every line has passed.
- **Quoted lines** (`prescriptionResponseItemId` set) are reserved at the quoted price and must be:
  - a known response item (`404`) on the caller's own request (`403`);
  - on a request that is still open; an `EXPIRED` or `CLOSED` request → `409`;
  - for the same inventory item as the line (`400`);
  - within the remaining quoted quantity: the quoted quantity minus what `CONFIRMED` or `COMPLETED`
    reservations already hold on that same response item (`400`). Cancelled and expired
    reservations give their share back. Example: quote of 3, reserve 2 → ok; 2 again → `400`;
    1 → ok.
  - from one prescription request only: quoted lines from two different requests in one
    reservation → `400`.

## Concurrency

- **Create** locks the inventory rows with `InventoryRepository.lockAllById` (`PESSIMISTIC_WRITE`,
  in id order, 10 s lock timeout), so two customers racing for the last unit are serialised and the
  loser gets `409`. It runs at `READ_COMMITTED` so the remaining-quote check, made after the lock is
  taken, sees reservations committed by whoever held the lock before.
- **Cancel and expiry** give stock back through the same `lockAllById` call on the locked rows,
  never through the reservation's lazy associations, so they can't collide with a concurrent create.
- A cancel racing with the expiry job (or a second cancel) on the same reservation loses on the
  entity `version` check.
- `GlobalExceptionHandler` maps lock failures (`PessimisticLockingFailureException`,
  `ObjectOptimisticLockingFailureException`, and an unwrapped `jakarta.persistence.LockTimeoutException`
  / `PessimisticLockException`) to `409 "This item was just updated by someone else. Please try again."`.
- The list endpoints fetch items, pharmacy and customer with an entity graph, so mapping a list
  doesn't lazy-load per reservation.

## Notifications

| Event | Customer | Pharmacy |
|---|---|---|
| `ReservationCreatedEvent` | "Reservation Confirmed" | "New Reservation" |
| `ReservationCancelledEvent` | if the pharmacy cancelled | if the customer cancelled |
| `ReservationCompletedEvent` | "Reservation Completed" | — |
| `ReservationExpiredEvent` | "Reservation Expired" | "Reservation Expired" |

All handled in `NotificationEventListener`.
