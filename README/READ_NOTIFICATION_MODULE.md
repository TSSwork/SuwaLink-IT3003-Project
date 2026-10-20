# Notification Module — What's Built, How to Use It

In-app notifications for customers, pharmacies and admins. Notifications are never created directly by a
controller — they're triggered by publishing an event, caught by `NotificationEventListener`, which calls
`NotificationService.notify(recipient, type, messageKey, params, link)`. If you add a new event source,
follow that pattern.

## Keyed, translated text

A notification stores a **message key** and **params**, not fixed text. On read it is rendered in the
request language (`Accept-Language`: `en`/`si`/`ta`, default `en`):

- title = bundle `messageKey + ".title"`, body = bundle `messageKey + ".body"`
- `{name}` placeholders are filled from `params` by `com.suwalink.util.MessageRenderer.render(key, params, locale)`
  (also meant for email text). Unknown placeholders are left as written.
- All keys are constants in `com.suwalink.event.NotificationKeys`; a test checks every one has `.title` and
  `.body` in `i18n/messages.properties`, `messages_si.properties` and `messages_ta.properties`.

## Entity

**`notifications` table** (`com.suwalink.entity.Notification`)

| Column        | Type             | Notes                                          |
|---------------|------------------|------------------------------------------------|
| id            | VARCHAR(36) (PK) | generated                                      |
| recipient_id  | FK -> users.id   | who sees it                                    |
| message_key   | VARCHAR(100)     | e.g. `notify.reservation.confirmed`            |
| params        | TEXT (JSON)      | placeholder values, `{}` when none             |
| link          | VARCHAR(255)     | frontend route to open, nullable               |
| emailed_at    | DATETIME         | when the email went out, nullable              |
| type          | ENUM             | `PRESCRIPTION` / `RESERVATION` / `SYSTEM_ALERT` |
| is_read       | BOOLEAN          | default `false`                                |

## Events and recipients (spec §9.6)

| Event (publisher) | Recipient | messageKey | params | link |
|---|---|---|---|---|
| `PharmacyRegisteredEvent` (`AuthServiceImpl.registerPharmacy`) | every admin | `notify.pharmacy.registered` | pharmacy | `/admin/pharmacies` |
| `PharmacyVerifiedEvent` / `PharmacyRejectedEvent` (`AdminServiceImpl`) | owner | `notify.pharmacy.approved` / `.rejected` | pharmacy | `/pharmacy` / `/` |
| `PrescriptionAddedEvent` (`PrescriptionRequestServiceImpl.create`) | customer | `notify.prescription.sent` | count | `/prescriptions/{id}` |
| `PrescriptionAddedEvent` | each targeted pharmacy owner | `notify.prescription.new` | — | `/pharmacy/requests/{id}` |
| `PharmacyRespondedEvent` (`PrescriptionResponseServiceImpl`) | customer | `notify.prescription.responded` / `.response-updated` | pharmacy | `/prescriptions/{id}` |
| `PrescriptionRequestExpiredEvent` (`PrescriptionRequestServiceImpl.expireOverdue`) | customer | `notify.prescription.expired` | — | `/prescriptions/{id}` |
| `ReservationCreatedEvent` | customer / pharmacy owner | `notify.reservation.confirmed` / `.new` | items, pharmacy, code / items, customer | `/reservations/{id}` / `/pharmacy/reservations` |
| `ReservationCancelledEvent` | the other party | `notify.reservation.cancelled-by-customer` / `-by-pharmacy` | items + customer / pharmacy | `/pharmacy/reservations` / `/reservations/{id}` |
| `ReservationCompletedEvent` | customer | `notify.reservation.completed` | items, pharmacy | `/reservations/{id}` |
| `ReservationExpiredEvent` (`ExpiryJobs`) | customer + pharmacy owner | `notify.reservation.expired` | items, pharmacy, customer | `/reservations/{id}` / `/pharmacy/reservations` |
| medicine suggestion approved / rejected (Phase 1C Task 6) | suggesting owner | `notify.medicine.approved` / `.rejected` | medicine (+ reason when rejected) | `/pharmacy/inventory` |

`items` is a language-neutral list such as `Panadol 500mg × 2, Amoxil 250mg × 1`.

## Endpoints

All require `Authorization: Bearer <token>` and are scoped to the caller.
Standard envelope: `{ "success": true, "message": "...", "data": ... }`.

### `GET /api/notifications`

Newest first, rendered in the `Accept-Language` locale.

```json
{ "id": "uuid", "type": "RESERVATION", "title": "...", "message": "...", "link": "/reservations/uuid", "read": false, "createdAt": "..." }
```

### `GET /api/notifications/unread-count`

```json
{ "count": 3 }
```

### `PUT /api/notifications/{id}/read`

Marks one notification read. `404` if it doesn't exist *or* belongs to someone else (deliberately
indistinguishable).

### `PUT /api/notifications/read-all`

Marks all of the caller's unread notifications read.

## Adding a notification

1. Add a key constant to `NotificationKeys` and `<key>.title` / `<key>.body` to all three bundles.
2. Publish an event from the service that owns the business action.
3. Handle it in `NotificationEventListener` with `notificationService.notify(...)`.
