# Notification Module — What's Built, How to Use It

In-app notifications for patients and pharmacies. Notifications are never created directly by a
controller — they're always triggered by publishing an `ApplicationEvent`, caught by
`NotificationEventListener`, which calls `NotificationService.createNotification(...)`. If you add
a new event source, follow that pattern rather than calling `NotificationService` directly from a
controller/service that isn't the listener.

## Entity

**`notifications` table** (`com.suwalink.IT3003.entity.Notification`)

| Column        | Type            | Notes                                      |
|---------------|-----------------|----------------------------------------------|
| id            | BINARY(16) (PK) | generated                                     |
| recipient_id  | FK -> users.id  | who sees it                                   |
| title         | VARCHAR         | short heading                                 |
| message       | TEXT            | body                                          |
| type          | ENUM            | `PRESCRIPTION` / `RESERVATION` / `SYSTEM_ALERT` |
| is_read       | BOOLEAN         | default `false`                               |

## Events that actually fire notifications

| Event | Published from | Recipient(s) | Type |
|-------|-----------------|--------------|------|
| `PharmacyVerifiedEvent` | `AdminServiceImpl.approvePharmacy` | the pharmacy applicant | `SYSTEM_ALERT` |
| `PharmacyRejectedEvent` | `AdminServiceImpl.rejectPharmacy` | the pharmacy applicant | `SYSTEM_ALERT` |
| `PrescriptionAddedEvent` | `PrescriptionRequestServiceImpl.create` | every currently-`VERIFIED` pharmacy (no geolocation/matching module exists yet, so it's broadcast to all) | `PRESCRIPTION` |
| `PharmacyRespondedEvent` | `PrescriptionResponseServiceImpl` | the patient who owns the request | `PRESCRIPTION` |
| `ReservationCreatedEvent` | `ReservationServiceImpl` | both the patient and the pharmacy | `RESERVATION` |
| `ReservationCancelledEvent` | `ReservationServiceImpl` | whichever side didn't cancel it | `RESERVATION` |

`PrescriptionAddedEvent` and `PharmacyRespondedEvent` were defined early on but had no publisher
for a while — if you're looking at old code/notes that say "notifications aren't wired up yet,"
that's now fixed; check the actual event source above rather than trusting stale comments.

## Standard response envelope

Same as every other module: `{ "success": true, "message": "...", "data": {} }`.

## Endpoints

All require `Authorization: Bearer <token>` — notifications are always scoped to the caller.

### `GET /api/notifications` — any authenticated user

The current user's notifications, newest first.

```json
{ "id": "uuid", "title": "...", "message": "...", "type": "PRESCRIPTION", "read": false, "createdAt": "..." }
```

Note the JSON field is **`read`**, not `isRead` — Jackson strips the `is` prefix off boolean
getters (`Notification.isRead()` -> `"read"`). The old `frontend/assets/js/notification.js` read
`notif.isRead` (always `undefined`) before this was fixed; if you see that pattern anywhere else,
it's the same bug.

### `GET /api/notifications/unread-count` — any authenticated user

```json
{ "count": 3 }
```

### `PUT /api/notifications/{id}/read` — any authenticated user, must be the recipient

Marks one notification read. Returns `404` if the notification doesn't exist *or* belongs to
someone else — deliberately indistinguishable, same reasoning as other ownership checks in this
codebase (don't leak whether a resource exists to non-owners).

## For other developers

- To add a new notification trigger: define an `ApplicationEvent` subclass in the `event` package,
  publish it via `ApplicationEventPublisher.publishEvent(...)` from the service that owns the
  business action, and add an `@EventListener` method in `NotificationEventListener` that resolves
  the recipient `User` and calls `notificationService.createNotification(...)`.
- Don't call `NotificationService` directly from a controller — go through an event so the
  business action and the notification side-effect stay decoupled (and so a test of the business
  action doesn't need a `NotificationService` mock just to pass).
