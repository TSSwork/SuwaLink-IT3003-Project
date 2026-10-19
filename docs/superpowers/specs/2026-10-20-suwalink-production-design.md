# SuwaLink — Production Readiness Design

Date: 2026-10-20
Status: Draft, awaiting owner approval

## 1. Intent

SuwaLink started as a university Java project. A professor wants to deploy it and hand it to
real users, so it has to go from "a frontend that demos the API" to a complete, deployable
product.

The product: customers in Sri Lanka find medicines at nearby pharmacies quickly, either by
**searching a medicine name** (normal e‑commerce search: availability, price, pharmacy) or —
the novelty — by **uploading a photo of a doctor's prescription** they cannot read. Pharmacies
see the request, view the image, and reply with matching items from their own inventory.
One request can get replies from many pharmacies. The customer compares and **reserves**
(there is no payment gateway; reservation is the only checkout, both from search and from
prescription replies). Pharmacies register themselves, get approved by an admin, and manage
their inventory.

Near-term success: a full start‑to‑finish showcase to the lecturer that walks through every
role (customer, pharmacy owner, admin) on realistic demo data. Then production on the
university VPS with the demo data switched off.

## 2. Roles

| Role | Code name | Notes |
|---|---|---|
| Customer | `CUSTOMER` | Searches, uploads prescriptions, reserves |
| Pharmacy owner | `PHARMACY_OWNER` | Renamed from `PHARMACY_ADMIN` (DB migration). Must be `VERIFIED` by admin to log in |
| Admin | `ADMIN` | Approves pharmacies, manages users and catalog, demo switch |

## 3. Goals

1. Pharmacy location and profile (district, coordinates on a map) — "nearby" becomes real.
2. Customer chooses who receives a prescription request: 10 km radius, whole district, or all pharmacies.
3. E‑commerce style search grouped by medicine, filtered and sorted by location.
4. Cart + multi‑item reservations, one per pharmacy, with a hold period and a QR code.
5. Prescription images private to the people allowed to see them.
6. Notifications both in‑app and by email, to customers and pharmacies.
7. Admin catalog management and pharmacy‑suggested medicines.
8. Demo data with an admin on/off switch for public visibility.
9. Complete new frontend (TanStack Start + shadcn), replacing the HTML/jQuery one.
10. Docker Compose deployment on a small university VPS.
11. Security cleanup: no secrets in the repo, sensible production configuration.

## 4. Non‑goals

Payments, delivery, SMS, push notifications, native mobile apps, OCR/AI prescription reading,
pharmacy staff accounts, pharmacy chains/branches, ratings/reviews, doctor portal. The
architecture should not block these, but none are built now.

## 5. Anti‑goals (failure even if it "works")

- A prescription image reachable by anyone who is not its owner, a pharmacy it was sent to, or an admin.
- Stock oversold (two reservations succeeding for the last unit).
- Demo pharmacies or demo stock appearing to the public while the demo switch is off.
- Real secrets (passwords, JWT secret, admin password) in the repository.
- Any step of the showcase flow breaking or needing a workaround in front of the lecturer.

## 6. Decisions made by the owner

1. **Pharmacy location**: collected at registration and editable on the pharmacy Settings page.
   Fields: pharmacy name, phone, address, district (select of 25), city, coordinates.
   Coordinates: request browser location, show it on an OpenStreetMap map; if wrong, the owner
   clicks the map to move the pin.
   Districts: Ampara, Anuradhapura, Badulla, Batticaloa, Colombo, Galle, Gampaha, Hambantota,
   Jaffna, Kalutara, Kandy, Kegalle, Kilinochchi, Kurunegala, Mannar, Matale, Matara, Monaragala,
   Mullaitivu, Nuwara Eliya, Polonnaruwa, Puttalam, Ratnapura, Trincomalee, Vavuniya.
2. **Prescription targeting**: radio buttons on upload — *Within 10 km* / *My district* / *All pharmacies*.
3. **Role rename** to `PHARMACY_OWNER`.
4. **Reservations**: one reservation per pharmacy with multiple lines; stock held for a time and
   released automatically; each reservation has a **QR code** that customer or pharmacy can scan
   to open the order.
5. **Prescription‑only medicines** can be reserved from search; the UI tells the customer to bring
   the prescription at pickup.
6. **Demo data**: medicines are owned by pharmacies through inventory, so demo pharmacies are
   seeded with their stock. Admin panel has a switch to show/hide demo data publicly. On for the
   lecturer showcase, off in production.
7. **Frontend**: remove the HTML/JS/jQuery frontend entirely. New app:
   `npx shadcn@latest init --preset b236ehlD6e --base radix --template start --pointer`
   — TanStack Start, shadcn components, TanStack Query for fetching, Zustand for client state,
   axios for requests, other web libraries as needed.
8. **Hosting**: university VPS, Docker Compose.
9. **Notifications**: in‑app + email for now, to both customers and pharmacies.
10. **Package rename** `com.suwalink.IT3003` → `com.suwalink`.
11. **Legal**: privacy policy and terms are open — the owner will consult the lecturer. Build the
    groundwork (see §13).
12. **UI/UX**: delegated to the builder — shadcn components plus available design skills.
13. **Branches**: no other active work. Build on `main`; old remote branches can be ignored.
14. **Showcase runs on `localhost`** (the owner's laptop, full Docker Compose stack), so
    geolocation and camera work without HTTPS.
15. **Languages**: English, Sinhala (සිංහල) and Tamil (தமிழ்).

### Languages (builder's calls on top of decision 15)
- Every UI string goes through an i18n layer from the first screen (no hard‑coded text).
  Library: Paraglide JS (TanStack's recommended i18n for Start) or react‑i18next — builder's choice.
- Language switcher in the top bar; choice saved in the browser and, for logged‑in users, on the
  user (`preferred_language`: `en`, `si`, `ta`). Default English.
- In‑app notifications and emails are rendered in the recipient's preferred language
  (backend message bundles `messages_en/si/ta.properties`). Notifications store a message key +
  parameters, not finished text, so they display in the current language.
- Backend validation/error messages localized via `Accept-Language`.
- Medicine, pharmacy and category names are data and are not translated.
- Fonts: Manrope has no Sinhala/Tamil glyphs — add Noto Sans Sinhala and Noto Sans Tamil as
  fallbacks.
- Sinhala and Tamil text is produced by the builder and marked for native‑speaker review before
  production (open item).

## 7. Builder's calls (made in this design; owner may override)

- **Java 25 (LTS)** instead of Java 26 (non‑LTS; also the dev machine has 25).
- **Squash Liquibase migrations** into a single clean baseline. No production database exists
  yet, so this is safe; dev databases are reset (`docker compose down -v`). Removes the duplicate
  `002-*`/`006-*` numbering.
- **Frontend runs in SPA mode** (TanStack Start with SSR off / static prerendered shell). Auth is a
  JWT in the browser, which server rendering can't see, and SEO is not a goal for the MVP. The
  built static files are served by the reverse proxy.
- **Same origin**: reverse proxy serves the frontend at `/` and proxies `/api` to Spring Boot,
  so CORS is not needed in production.
- **Caddy** as the reverse proxy (automatic HTTPS once a domain points at the VPS; plain HTTP on
  an IP otherwise).
- **Notifications in the browser**: TanStack Query polls unread count every 30 s. No WebSockets.
- **Email** sent asynchronously after the transaction commits; email failure never fails the
  user's action. SMTP settings from environment (Gmail SMTP works).
- **Reservation hold**: 24 hours, configurable (`app.reservation.hold-hours`).
- **Prescription request expiry**: auto‑close after 7 days, configurable.
- **Map**: Leaflet (`react-leaflet`) with OpenStreetMap tiles.
- **Distance**: Haversine. Pre‑filter by a lat/lng bounding box in SQL, exact distance in Java.
  Must work on both MySQL and H2 (tests).
- **Cart** lives in the browser (Zustand, persisted to localStorage), grouped by pharmacy.
- Design system: keep the brand palette (Olive Garden Feast) and fonts (Manrope, Space Mono for
  codes/IDs) from `CONTEXT/DESIGN.md`, applied as shadcn theme tokens on top of the given preset.
  Light and dark themes. Material Design 3 rules in DESIGN.md are superseded by shadcn
  conventions; `CONTEXT/DESIGN.md` and `CONTEXT/SPECS.md` are updated to say so.
- Mobile‑first layouts: customers mostly use phones; QR flows assume a phone.
- **Location and camera always have manual fallbacks**: browsers only allow geolocation and camera
  on HTTPS or localhost. Map pin can always be placed by clicking/searching; customers can pick a
  district instead of sharing location; QR order can be opened by typing the pickup code.
- **Email in dev/showcase**: dev compose includes Mailpit (web inbox) and all mail goes there.
  In other environments, emails to demo users are redirected to `DEMO_MAIL_REDIRECT` if set,
  otherwise dropped.
- **Demo switch off does not touch records**: reservations/requests that involve demo pharmacies
  are left as they are (open demo reservations simply expire on schedule); they stay in the
  history of real users who made them.
- **Reserving from a prescription response**: the price the pharmacy quoted is snapshotted; the
  customer may lower (not raise) the quoted quantity; stock is drawn from inventory at reservation
  time. Responses do not hold stock.
- **Bookmarks kept** as "Saved" (customer saves an offer); route `/saved`; table carried into the
  squashed baseline.
- **Account deletion and admin user actions**: customers delete themselves as in §13.
  Pharmacy owners can delete their account only with no `CONFIRMED` reservations; the pharmacy is
  then deactivated (hidden everywhere, inventory unavailable, existing responses shown as
  "pharmacy no longer available"). Admins cannot self‑delete. `/admin/users`: search, suspend /
  reactivate (suspended users cannot log in), delete (same rules).
- **Images are built off the VPS** (GitHub Actions → GitHub Container Registry) and pulled on the
  VPS, so a small VM only runs containers. JVM and MySQL memory limits set for a ~2 GB VM.

## 8. Data model changes

### Pharmacy
Add: `name`, `phone`, `district` (enum of 25), `city`, `latitude`, `longitude`
(DECIMAL(9,6)), `opening_hours` (free text, optional), `is_demo`.
Existing `address`, `licence_no`, `status` stay. Pharmacy name no longer comes from the user.

### User
Add: `is_demo`, `district` (optional, customer's default), `deleted_at` (account deletion, see §13).

### App settings
New `app_settings` (key/value). Key `demo_mode_public` (boolean, default false).

### Prescription request
Add: `target_scope` (`RADIUS_10KM`, `DISTRICT`, `ALL`), `latitude`, `longitude` (required for
radius), `district` (required for district), `consent_at`, `expires_at`.
New `prescription_request_targets` (request_id, pharmacy_id): the pharmacies the request was
sent to, computed once at creation. This single list drives who sees the request, who is
notified, and who may view the image. Status gains `EXPIRED`.

### Prescription response
One response per pharmacy per request (unique constraint). Pharmacy can edit its response
while the request is open.

### Reservation (reshaped)
- `reservations`: id, customer, pharmacy, status (`CONFIRMED`, `COMPLETED`, `CANCELLED`,
  `EXPIRED`), `pickup_code` (random, unguessable, unique), `expires_at`, `cancel_reason`,
  `cancelled_by`, optional `prescription_request_id`, `is_demo`, audit timestamps.
- `reservation_items`: reservation, inventory item, optional prescription response item,
  quantity, unit price (snapshot), medicine name (snapshot), `requires_prescription` (snapshot).

### Medicine catalog
`medicine_master` gains `status` (`APPROVED`, `PENDING`, `REJECTED`) and `suggested_by_pharmacy_id`.
Only `APPROVED` medicines can be stocked or searched.

### Notifications
Existing table; add `link` (frontend route to open) and `emailed_at`.

## 9. Backend behaviour

### 9.1 Visibility rule (applies everywhere)
A pharmacy is **publicly visible** when `status = VERIFIED` and (`is_demo = false` or demo mode
is on). Every public query (search, pharmacy page, prescription targeting) applies this rule
through one shared method/spec. When demo mode is off, demo accounts cannot log in.

### 9.2 Search
- `GET /api/medicines/search?q&district&lat&lng&category&page&size` — public. Returns medicines
  (grouped) with: number of pharmacies offering it, lowest price, nearest distance if location
  given, requires‑prescription flag. Paged.
- `GET /api/medicines/{id}` and `GET /api/medicines/{id}/offers?lat&lng&district&sort=distance|price`
  — public. One row per pharmacy offer.
- An offer counts only if: medicine `APPROVED`, inventory `available`, `stock_quantity > 0`,
  `expire_date` in the future, pharmacy publicly visible.
- `GET /api/pharmacies/{id}` — public profile and its in‑stock items.

### 9.3 Prescription requests
- Create (multipart): image, note, patient age, target scope, location/district, consent.
  Server computes the target pharmacy list (publicly visible pharmacies within 10 km / in
  district / all) and stores it. If the list is empty, return a clear error suggesting a
  wider scope; nothing is saved.
- Pharmacies list only requests they are targeted by and that are open.
- Scheduled job expires requests past `expires_at`.

### 9.4 Prescription images
`/uploads/**` stops being public. Images split by type:
- Medicine/inventory/profile images: public, served at `/api/images/public/{file}`.
- Prescription images: `GET /api/images/{id}/content` with JWT; allowed for the owner, targeted
  pharmacies, admins. Frontend loads with axios as a blob.
Upload directory is a configured path mounted as a Docker volume.

### 9.5 Reservations
- `POST /api/reservations` with lines (inventory id, quantity, optional response item id) — all
  lines must belong to one pharmacy; the frontend sends one call per pharmacy at checkout.
- Stock decrement is atomic: conditional update (`stock = stock - q WHERE id = ? AND stock >= q`)
  or pessimistic lock. All lines succeed or none do.
- `expires_at = now + hold`. Scheduled job marks overdue `CONFIRMED` reservations `EXPIRED`,
  restores stock, notifies both sides.
- `GET /api/reservations/by-code/{pickupCode}` — requires login; returns the order only to the
  customer who owns it, the owning pharmacy, or admin; everyone else gets 404.
- Pharmacy marks `COMPLETED` (from the order page reached via QR). Customer or pharmacy can cancel
  while `CONFIRMED`; stock is restored.
- Response includes per‑line `requiresPrescription` so the UI can show the pickup notice.

### 9.6 Notifications (in‑app + email, both sides)
| Event | Customer | Pharmacy |
|---|---|---|
| Pharmacy registered | — | (admin gets in‑app) |
| Pharmacy approved / rejected | — | ✓ |
| Prescription request sent | ✓ confirmation | ✓ each targeted pharmacy |
| Pharmacy responded / updated response | ✓ | — |
| Reservation created | ✓ (with QR link) | ✓ |
| Reservation cancelled | ✓ the other party | ✓ the other party |
| Reservation completed | ✓ | — |
| Reservation / request expired | ✓ | ✓ (reservation only) |
| Medicine suggestion approved / rejected | — | ✓ |

Email: simple branded HTML template with a button linking to the relevant page. Demo users never
receive email (their addresses are fake).

### 9.7 Catalog
Admin CRUD for medicines, categories, manufacturers (APIs exist; need UI). Pharmacy can suggest a
medicine → `PENDING`; admin approves/rejects. A pharmacy can only add inventory for `APPROVED`
medicines.

### 9.8 Demo data
Seeded by a Liquibase changeset (always present, flagged `is_demo`):
- ~40 common Sri Lankan medicines across existing categories/manufacturers (non‑demo catalog
  data — real reference data, kept in production).
- 6–8 demo pharmacies across Colombo, Gampaha, Kandy, Galle with realistic coordinates, each
  stocking 15–30 items at realistic LKR prices.
- 2–3 demo customers with a prescription request (with sample image), responses, and
  reservations in different states.
- Demo login accounts: one customer, one pharmacy owner. The admin account for the showcase is
  the real admin.
Admin settings page has a switch "Show demo data publicly". When on, the login page shows
one‑click demo account buttons.

### 9.9 Security and configuration
- All secrets from environment variables; `.env.example` committed, `.env` ignored.
  Remove the committed Gmail password and default JWT secret. App refuses to start in the `prod`
  profile without `JWT_SECRET`, DB credentials, and admin bootstrap credentials.
- Admin bootstrap: created at startup from `ADMIN_EMAIL`/`ADMIN_PASSWORD` if no admin exists
  (replaces the SQL‑seeded admin with a known password).
- Rate limiting on login, register, forgot‑password, reset‑password (simple in‑memory per IP/email).
- Swagger UI disabled in `prod` profile.
- Profiles: `dev` (local MySQL via compose, Swagger on), `test` (H2), `prod`.

## 10. Frontend

Location: replace `frontend/` with the new TanStack Start app (scaffolded with the owner's exact
command). Stack: TanStack Router (file routes), TanStack Query, Zustand (auth session, cart,
theme), axios (one API client with JWT interceptor and 401 → logout), react-hook-form + zod for
forms, react-leaflet, a QR generator (`qrcode.react`) and an in‑app QR scanner for the pharmacy.
Typed API layer mirroring backend DTOs.

### Routes
Public: `/` (landing with search box and "upload prescription" call to action), `/search`,
`/medicines/$id`, `/pharmacies/$id`, `/login`, `/register`, `/register/pharmacy` (multi‑step with
map), `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/r/$code` (QR target).

Customer: `/cart`, `/prescriptions`, `/prescriptions/new`, `/prescriptions/$id` (compare
responses, add lines to cart or reserve), `/reservations`, `/reservations/$id` (QR, status,
prescription notice), `/settings`, notifications menu.

Pharmacy: `/pharmacy` (overview), `/pharmacy/inventory`, `/pharmacy/requests`,
`/pharmacy/requests/$id` (zoomable image, pick items from inventory, quantities, prices, message),
`/pharmacy/reservations`, `/pharmacy/scan`, `/pharmacy/settings` (profile + map),
`/pharmacy/suggest-medicine`, pending‑approval screen.

Admin: `/admin` (stats), `/admin/pharmacies` (review incl. map), `/admin/users`,
`/admin/catalog` (medicines, categories, manufacturers), `/admin/suggestions`, `/admin/settings`
(demo switch).

### UX notes
- Every list has loading (skeleton), empty (what to do next), and error states.
- Prescription images: never cropped, zoomable.
- QR encodes `https://<host>/r/<pickupCode>`, so a normal phone camera also works.
- Notification bell with unread badge on every authenticated layout.

## 11. Deployment

`docker-compose.yml` (prod) with services: `mysql` (volume), `backend` (multi‑stage Dockerfile,
Java 25 JRE, `prod` profile, uploads volume), `web` (Caddy serving the built frontend and proxying
`/api`). A dev compose keeps only MySQL for local work. Daily `mysqldump` backup script with
retention, plus backup of the uploads volume. README deploy section: first‑time setup, `.env`,
updating, restoring a backup.

## 12. Testing

- Backend: JUnit 5 + MockMvc on H2 for every changed/new endpoint, especially: targeting
  (radius/district/all), visibility rule with demo mode on/off, image access control,
  concurrent stock decrement, reservation expiry job, QR order access.
- Frontend: Vitest for API client, stores (cart grouping), utilities. Manual end‑to‑end run of
  the showcase script (§14) before calling the work done.

## 13. Legal groundwork (content pending the lecturer)

- `/privacy` and `/terms` pages with placeholder text and a visible "Draft — pending review" label;
  content in one editable file each.
- Consent checkbox at registration (terms + privacy) and at prescription upload ("my prescription
  image will be shared with the pharmacies I choose"); timestamps stored.
- Self‑service account deletion in Settings: personal fields anonymised, prescription images
  deleted, reservation records kept anonymised for pharmacy history.
- Prescription images of closed/expired requests deleted after a configurable period (default
  30 days) — value to confirm with the lecturer.

## 14. Showcase script (acceptance)

On `localhost` with the full Compose stack, Mailpit inbox open, demo mode on. Switch language
once during the run to show Sinhala/Tamil.
1. Visitor searches "Panadol" → grouped result → sees offers sorted by distance → opens a pharmacy.
2. Registers as a customer, adds items from two pharmacies to the cart, checks out → two
   reservations with QR codes; prescription‑only notice shown where relevant.
3. Uploads a prescription choosing "My district".
4. Logs in as demo pharmacy (in that district) → notification + email path visible → views image
   → responds with inventory items.
5. Customer sees the response, reserves from it.
6. Pharmacy scans the QR (or opens `/r/<code>`) → marks collected.
7. New pharmacy registers with map location → admin approves → pharmacy logs in, adds inventory,
   suggests a new medicine → admin approves it.
8. Admin turns demo mode off → demo pharmacies disappear from search.

## 15. Suggested build order

Each phase gets its own implementation plan.
0. **Foundation**: secret removal, env config/profiles, Java 25, package rename, role rename,
   migration squash, admin bootstrap.
1. **Backend features**: location/profile, visibility + demo mode, search, targeting, image access,
   reservations (multi‑line, atomic stock, expiry, QR code), notifications + email, catalog
   suggestions, account deletion, demo seed.
2. **Frontend**: scaffold with the owner's command, design tokens, all routes above.
3. **Deployment**: Dockerfiles, Caddy, compose, backups, docs.
4. **Showcase rehearsal** against §14.

## 16. Open items

- Privacy policy and terms wording (owner + lecturer).
- Prescription image retention period (default 30 days).
- Domain name for the VPS (HTTPS works automatically once one exists; needed in production for
  location and camera features).
- Native‑speaker review of Sinhala and Tamil text.
- The committed Gmail app password must be revoked by the owner; it remains in git history.
