# Demo data and demo accounts

SuwaLink ships with a resettable demo dataset for showcases. It is flagged `is_demo` and stays hidden
from the public (search, pharmacy pages, prescription targeting) until an admin turns demo mode on.
Demo accounts can only log in while demo mode is on.

## Accounts

All demo accounts use the password **`DemoPass123!`**.

| Role | Email | Notes |
|------|-------|-------|
| Admin | `admin@suwalink.local` | The real bootstrap admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`; dev values in `application-dev.properties`). Not a demo account. |
| Customer | `customer1@demo.suwalink.lk` | Kasun Jayasinghe, Colombo. Has a prescription request, a quote and three reservations (see below). |
| Customer | `customer2@demo.suwalink.lk` | Dilini Rathnayake, Kandy, Sinhala UI. Has a Kandy request with one quote, not reserved yet. |
| Customer | `customer3@demo.suwalink.lk` | Priya Shanmugam, Galle, Tamil UI. Has an unanswered request to all pharmacies. |
| Pharmacy owner | `pharmacy1@demo.suwalink.lk` | Kollupitiya City Pharmacy, Colombo 03. It quoted customer 1's request. |
| Pharmacy owner | `pharmacy2@demo.suwalink.lk` | Nugegoda Family Pharmacy, Colombo. |
| Pharmacy owner | `pharmacy3@demo.suwalink.lk` | Negombo Sea Street Pharmacy, Gampaha. |
| Pharmacy owner | `pharmacy4@demo.suwalink.lk` | Gampaha Town Pharmacy, Gampaha. |
| Pharmacy owner | `pharmacy5@demo.suwalink.lk` | Dalada Veediya Pharmacy, Kandy. It quoted customer 2's request. |
| Pharmacy owner | `pharmacy6@demo.suwalink.lk` | Peradeniya Health Pharmacy, Kandy. |
| Pharmacy owner | `pharmacy7@demo.suwalink.lk` | Galle Wakwella Pharmacy, Galle. |

While demo mode is on and the demo dataset exists, `GET /api/settings/public` returns `demoAccounts`
(customer 1 and pharmacy 1) for the login page's one-click demo buttons. Otherwise the list is empty.

## What is seeded

- **Reference catalog** (Liquibase `013-reference-medicines.sql`): about 50 medicines commonly sold in Sri
  Lanka (OTC and prescription), with categories and manufacturers. This is real reference data, not demo
  data. It stays in production and reset does not touch it.
- **7 demo pharmacies**: Colombo 2, Gampaha 2, Kandy 2, Galle 1. All are VERIFIED, with real-looking
  addresses and coordinates. Each stocks 15–30 catalog medicines at LKR prices within ±15 % of a base price,
  with expiry dates in the future. Panadol, Amoxicillin/Amoxil, Piriton and Alerid are always stocked.
- **3 demo customers**.
- **Customer 1's journey**:
  - a prescription request to the Colombo district, with the sample image
    `backend/src/main/resources/demo/sample-prescription.webp` copied into the upload directory
  - a quote from Kollupitiya City Pharmacy
  - a CONFIRMED reservation from that quote, held for 24 hours
  - a COMPLETED search reservation and a CANCELLED search reservation
- **Customer 2**: a prescription request to the Kandy district (both Kandy demo pharmacies), quoted by
  Dalada Veediya Pharmacy, with no reservation yet.
- **Customer 3**: a prescription request with scope ALL and no responses yet. Its targets are the 7 demo
  pharmacies only; seeded demo requests never reach real pharmacies.

The seeder (`DemoDataSeeder`) runs on startup and creates the dataset only if no demo pharmacy exists.
Set `DEMO_SEED_ENABLED=false` (`app.demo.seed-enabled`) to skip it. It is off in the `test` profile.
Seeding writes straight to the database, so it creates no notifications and sends no emails. If seeding
fails, the error is logged and the application starts without demo data.

The sample image is a committed 600×800 WebP placeholder ("SAMPLE PRESCRIPTION — Demo data, not a real
prescription"). It was generated once with Java2D and the project's `webp4j` encoder.

## Turning demo mode on and off

Admin → Settings → "Show demo data publicly", or:

```
PUT /api/admin/settings      {"demoModePublic": true}
```

Turning demo mode off hides demo pharmacies and their stock and blocks demo logins. Existing tokens of
demo users stop working. No records are changed.

## Resetting the demo data

Admin → "Reset demo data", or `POST /api/admin/demo/reset` (admin only). Reset deletes every demo-owned
row, then seeds a fresh dataset. Demo-owned rows are:

- reservations of demo customers, and anyone's reservations at demo pharmacies
- responses by demo pharmacies, and responses to demo customers' requests
- demo customers' requests, with their image files
- bookmarks and notifications of demo users
- demo inventory, demo pharmacies and demo users

Real data is not touched, with these exceptions:

- A demo customer's CONFIRMED reservation at a real pharmacy gives its stock back.
- A real customer's request that was sent to demo pharmacies keeps its other target pharmacies. If it was
  RESPONDED and only demo pharmacies had answered, it goes back to PENDING.
- Real users' notifications that link to a deleted reservation (`/reservations/<id>`) are deleted.
- A medicine that a demo pharmacy suggested and an admin approved stays in the catalog, with no
  suggesting pharmacy.

## Mail

In dev, all mail goes to Mailpit (`docker compose -f docker-compose.dev.yml up -d`). The inbox is at http://localhost:8025.
Mail addressed to demo users is redirected to `DEMO_MAIL_REDIRECT` (`app.mail.demo-redirect`) when that is
set. Otherwise it is skipped. Demo accounts never receive real mail.
