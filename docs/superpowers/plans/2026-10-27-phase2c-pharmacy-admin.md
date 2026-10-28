# Phase 2C — Pharmacy and Admin Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything a pharmacy owner and the admin do in the showcase: the pharmacy keeps its profile, location and stock up to date, answers prescription requests from its inventory, sees and scans reservations and marks them collected, and suggests missing medicines; the admin sees the numbers, approves pharmacies (with their map location), manages users and the catalog, reviews suggestions and runs the demo switch and reset.

**Architecture:** Same as Phase 2B: feature folders under `frontend/src/features/{pharmacy-owner,admin}/*`, route files that only wire `Route`, server data through TanStack Query hooks in `frontend/src/api/*.ts` (one module per backend area), shared building blocks from `components/*` (`LocationPicker`, `MapView`, `DistrictSelect`, `PrescriptionImage`, `ConfirmButton`, `ReservationStatusBadge`, `PrescriptionStatusBadge`, `StockIndicator`, `RxBadge`, feedback states). Each role gets a section layout with its own sub-navigation inside `AppShell`. No new backend endpoints are planned; any DTO gap is reported, not silently worked around.

**Tech Stack:** as Phase 2B + `qr-scanner` (camera QR decoding for `/pharmacy/scan`; uses the native `BarcodeDetector` when available, worker fallback otherwise).

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` — §2, §6 (decisions 1, 3, 5), §8, §9.3–§9.8, §10 (pharmacy and admin routes, UX notes), §14 steps 4, 6, 7, 8.

## Global Constraints

- Everything from Phases 2A/2B still binds (`CONTEXT/DESIGN.md` "Implementation (shadcn)" and "Customer building blocks", `README/I18N.md` Frontend): brand tokens only; route files export only `Route`, pages in `src/features/**`; every visible string through `t()` in `en`, `si`, `ta` (parity test) and new si/ta keys noted as pending review in `README/I18N.md`; API errors via `translateError`; every interactive control 44 px on touch (`pointer-coarse:`, "SuwaLink edit" comment on edited `components/ui` files); mobile-first at 360 px; skeleton / empty (what to do next) / error (retry) on every list; tests first with a recorded RED run; reuse the customer building blocks instead of re-creating them.
- Backend shapes are the contract: read the DTOs under `backend/src/main/java/com/suwalink/dto/**` and controllers under `controller/**`. Add TS types to `src/api/types.ts`; list any mismatch in the report.
- Pharmacy pages use `requireRole("PHARMACY_OWNER")`, admin pages `requireRole("ADMIN")`. A pharmacy that is not `VERIFIED` cannot sign in (`PHARMACY_NOT_VERIFIED`, already shown on the login page) — the "pending approval" screen is that login notice plus the registration success screen; verify both read clearly, no extra route.
- Notification links the backend writes must resolve to real routes: `/pharmacy`, `/pharmacy/inventory`, `/pharmacy/requests/<id>`, `/pharmacy/reservations`, `/admin/pharmacies`.
- Validation mirrors the backend exactly:
  - **Inventory:** `unitPrice > 0`, `stockQuantity ≥ 0` integer, `expireDate` strictly after today, medicine from the APPROVED catalog (`GET /api/medicines`).
  - **Pharmacy profile:** name ≤ 120, phone required, address required, city ≤ 80, latitude 5.85–9.90, longitude 79.50–81.95, opening hours ≤ 255.
  - **Response message:** ≤ 1000, item quantity ≥ 1.
  - **Suggestion / medicine:** `MedicineMasterRequest` required fields; `unitOfMeasure` ∈ `TABLET CAPSULE ML MG G BOTTLE STRIP VIAL TUBE`; `legalCategory` ∈ `OTC PRESCRIPTION CONTROLLED`.
  - **Rejection reason:** 1–500.
- Prices via `formatPrice`, dates via `formatDateTime`/`formatRelative`; districts via `districts.<ENUM>`.
- Pickup codes are 10 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`; the scanner and manual entry accept only that (case-insensitive input, upper-cased) and navigate internally to `/r/<code>` — never to a scanned URL.
- Destructive or irreversible actions use `ConfirmButton`: delete inventory item, reject pharmacy, suspend / delete user, delete catalog entry, reject suggestion (with reason field), demo reset, demo switch off.
- Frontend commands from `frontend/`: `npm run typecheck && npm run lint && npm run check && npm test && npm run build`. Backend only if a task must touch it: `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock ./mvnw -Dmaven.compiler.release= -Dmaven.compiler.source=25 -Dmaven.compiler.target=25 -q clean test` from `backend/`.
- Screenshots: protected pages cannot be checked with `vite preview` (its SSR redirects to /login). Build, then serve `frontend/dist/client` statically with `_shell.html` fallback and `/api` proxied to `:8080` (a ~20-line node server in your scratch dir), set `suwalink.session` and `suwalink.lang` in localStorage, then navigate to the page. Each UI task captures its main screens at 360 px (en + one of si/ta) and 1280 px (en), and views them. Demo logins: `pharmacy1@demo.suwalink.lk` / `DemoPass123!`; admin from `.env` `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Branch `feature/phase2c-pharmacy-admin` off `main`; one commit per task.

## Review Focus

1. **Request closes or expires while the pharmacy is writing its reply.** Expected: `REQUEST_CLOSED` is shown translated, the typed reply stays on screen, and the action is disabled once the refetch reports it closed. Test in Task 3.
2. **A scanned QR that is not a SuwaLink pickup code** (another site's URL, `javascript:`, a code with the wrong characters), or the camera is denied or missing. Expected: nothing navigates off-site; a translated "not a SuwaLink pickup code" message appears; manual code entry always works without a camera. Test in Task 4.
3. **Stock edits that the backend will reject.** For example: an expiry date of today or in the past, price 0, a negative stock, or an already-stocked medicine added again. Expected: client validation catches the first three with the same rules as the backend, and a backend error (e.g. `DUPLICATE`) shows translated without clearing the form. Test in Task 2.
4. **Admin tries to suspend or delete an admin (including themselves).** Expected: no such action is offered on ADMIN rows; if it is attempted anyway, `ACCOUNT_ACTION_NOT_ALLOWED` shows translated. Test in Task 6.
5. **Demo mode turned off, or demo data reset, while pages are open.** Expected: a confirmation explains that demo pharmacies disappear from search and demo logins stop. Afterwards the settings, dashboard and pharmacies queries are invalidated, so the admin sees fresh numbers without reloading. Test in Task 5.

---

### Task 1: Pharmacy section shell, overview and settings

**Files:**
- Create: `frontend/src/api/pharmacyOwner.ts`:
  - `useMyPharmacy()`: `GET /pharmacies/me`, returns `PharmacyProfile`.
  - `useUpdateMyPharmacy()`: `PUT /pharmacies/me` with `UpdatePharmacyProfileRequest`.
  - `usePharmacyRequests()`: `GET /prescriptions`, returns `PrescriptionRequest[]`.
  - `usePharmacyReservations()`: `GET /reservations`, returns `Reservation[]`.
  - `useMyInventory()`: `GET /inventory`, returns `InventoryItem[]`.
  - Each has a key under `pharmacyOwnerKey = ["pharmacy-owner"]`.
- Create: `frontend/src/features/pharmacy-owner/PharmacyLayout.tsx`:
  - Section header with the pharmacy name and a sub-nav: Overview, Requests, Reservations, Scan, Inventory, Suggest medicine, Settings.
  - Horizontal scroll on phones.
  - `aria-current` on the active link.
  - Wired as the layout of the `/pharmacy` route tree (`routes/pharmacy/route.tsx` with `requireRole("PHARMACY_OWNER")`; children inherit the guard).
- Replace: `routes/pharmacy/index.tsx` with `features/pharmacy-owner/OverviewPage.tsx`:
  - Stat cards (open requests without a reply, confirmed reservations, items low on stock ≤ 5, items expiring within 30 days), each linking to its page.
  - Lists: "Requests waiting for you" (top 5) and "Today's pickups" (confirmed reservations, top 5).
  - The counts are computed client-side from the three list hooks.
- Create: `routes/pharmacy/settings.tsx` + `features/pharmacy-owner/SettingsPage.tsx`:
  - Profile form (name, phone, address, city, `DistrictSelect`, opening hours) using react-hook-form + zod with the constraints above.
  - Location with `LocationPicker`: device location, then click the map to correct the pin.
  - Read-only licence number, status and owner email.
  - On save, invalidate `useMyPharmacy` and show a toast.
  - Phone is edited here (registration has no phone field, 2A Ruling 8).
- Modify: `components/layout/MainNav.tsx` only if the owner link label needs to change. The sub-nav lives in `PharmacyLayout`.
- Tests:
  - `OverviewPage.test.tsx`: counts from fixtures, links, empty states.
  - `SettingsPage.test.tsx` (pharmacy):
    - prefilled form;
    - out-of-range latitude is blocked;
    - the PUT body equals the DTO fields exactly;
    - a server `VALIDATION_FAILED` field error shows on its field.
  - `PharmacyLayout.test.tsx`: active link; a customer is redirected by the guard.

- [ ] **Step 1:** Write the failing tests and run them. Expected: FAIL (modules missing).
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** All frontend checks pass. Take screenshots of overview and settings: 360 px en + si, 1280 px en.
- [ ] **Step 4:** Commit `feat(frontend): pharmacy section with overview and settings`.

### Task 2: Inventory and medicine suggestions

**Files:**
- Modify: `frontend/src/api/pharmacyOwner.ts`:
  - `useApprovedMedicines()`: `GET /medicines`, returns `CatalogMedicine[]`.
  - `useAddInventory()`, `useUpdateInventory(id)`, `useSetAvailability(id)` (`PATCH /inventory/{id}/availability {available}`), `useDeleteInventory(id)`.
  - `useSuggestMedicine()`: `POST /medicines/suggestions`.
  - `useMySuggestions()`: `GET /medicines/suggestions/mine`.
- Create: `routes/pharmacy/inventory.tsx` + `features/pharmacy-owner/InventoryPage.tsx`:
  - Search box (brand or generic) and filter chips: All, Low stock, Expiring soon, Hidden.
  - Rows show brand, generic, strength, `RxBadge`, price, `StockIndicator`, expiry (flagged within 30 days, "Expired" when past), and an availability switch.
  - Row actions: edit (dialog with price, stock, expiry) and delete (confirm).
  - "Add item" dialog: searchable medicine combobox over the approved catalog, then price, stock and expiry. Already-stocked medicines are marked "In your stock" and point to edit instead.
  - Empty state links to "Suggest a medicine".
- Create: `routes/pharmacy/suggest-medicine.tsx` + `features/pharmacy-owner/SuggestMedicinePage.tsx`:
  - Form for `MedicineMasterRequest`, with category and manufacturer selects.
  - **Data source gap:** the admin lists are ADMIN-only. The public `GET /api/categories` covers categories. No public manufacturers list exists, so check the backend and report this. If it is missing, add the smallest public read endpoint `GET /api/manufacturers` (active, `{id,name}`) with a backend test, mirroring `PublicCatalogController`, and permit it in `SecurityConfig`.
  - Below the form, "My suggestions" with status chips (PENDING / APPROVED / REJECTED + reason).
- Tests:
  - `InventoryPage.test.tsx`:
    - filter chips;
    - availability toggle sends PATCH;
    - delete confirms then sends DELETE;
    - edit validation (today's expiry rejected, price 0 rejected, stock −1 rejected) with no request sent;
    - add flow sends `{medicineMasterId, unitPrice, stockQuantity, expireDate}`;
    - `DUPLICATE` is shown translated and the dialog stays open.
  - `SuggestMedicinePage.test.tsx`: required fields; the body matches the DTO; the suggestions list shows the rejection reason.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (inventory at 360 px ta, 1280 px en; add dialog at 360 px) → commit `feat(frontend): pharmacy inventory and medicine suggestions`.

### Task 3: Incoming prescription requests and replies

**Files:**
- Modify: `frontend/src/api/pharmacyOwner.ts`:
  - `usePharmacyRequest(id)`: `GET /prescriptions/{id}`.
  - `useMyReply(requestId)`: from `GET /prescriptions/{requestId}/responses`, the one whose `pharmacyId` is mine.
  - `useSendReply(requestId)`: `POST /prescriptions/{requestId}/responses`.
  - `useUpdateReply(requestId)`: `PUT /prescriptions/{requestId}/responses/mine`.
  - Invalidate the requests list and overview after either.
- Create: `routes/pharmacy/requests/index.tsx` + `features/pharmacy-owner/RequestsPage.tsx`:
  - Open requests sent to this pharmacy, each showing created time, patient age, note excerpt, scope/district and "Replied" / "Waiting" (from `GET /prescriptions/responses/me`).
  - Filter: Waiting / Replied / All.
- Create: `routes/pharmacy/requests/$id.tsx` + `features/pharmacy-owner/RequestDetailPage.tsx`:
  - `PrescriptionImage` (reuse; zoomable, never cropped), plus patient age, note and expiry.
  - Reply builder:
    - Pick items from my inventory: search over `useMyInventory`, available and in-stock only.
    - Quantity per item, 1 to stock, with an inline hint when capped.
    - Shows unit price and line total from inventory, plus a reply total.
    - Optional message (≤ 1000, with a counter).
  - "Send reply", or "Update reply" when one exists (prefilled from it).
  - Closed or expired requests are read-only with a notice. `REQUEST_CLOSED` from the server shows translated and keeps the draft.
- Tests:
  - `RequestsPage.test.tsx`: Waiting/Replied from fixtures; empty state.
  - `RequestDetailPage.test.tsx`:
    - the image loads via the authenticated blob path;
    - picking two items, setting quantities and sending gives the exact `{message, items:[{inventoryItemId, quantity}]}` body;
    - quantity is capped at stock;
    - an existing reply prefills and is sent with PUT;
    - `REQUEST_CLOSED` keeps the draft and shows the message (Review Focus 1);
    - a closed status renders read-only.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (detail at 360 px en + si, 1280 px en with the real demo request) → commit `feat(frontend): pharmacy prescription requests and replies`.

### Task 4: Pharmacy reservations and QR scanner

**Files:**
- Create: `routes/pharmacy/reservations.tsx` + `features/pharmacy-owner/ReservationsPage.tsx`:
  - Incoming reservations with status filter chips (Confirmed default, Completed, Cancelled, Expired, All).
  - Each row shows customer name, pickup code (mono), items count, total, hold countdown (reuse `HoldCountdown`) and Rx notice when any line needs a prescription.
  - Opening a row goes to `/reservations/$id`; the shared `ReservationView` already offers Mark as collected / Cancel to the owner.
- Create: `lib/pickupCode.ts` — `parsePickupCode(input: string): string | null`:
  - Accepts a bare code, or any URL whose pathname is exactly `/r/<code>`.
  - Trims, upper-cases, validates against the alphabet and length 10.
  - Returns null otherwise.
- Create: `routes/pharmacy/scan.tsx` + `features/pharmacy-owner/ScanPage.tsx`:
  - Camera preview using `qr-scanner` (loaded lazily), started on a button tap, with the rear camera preferred.
  - On a decode, `parsePickupCode` then `navigate({to:"/r/$code"})`. An invalid decode shows a translated notice and keeps scanning.
  - Camera denied, no camera, or an insecure context each show a translated reason.
  - A manual code field (mono, autocapitalised) is always visible and uses the same parser.
  - The camera stops on unmount.
- Tests:
  - `pickupCode.test.ts`: bare code, lowercase, full URL, other origin with the right path, wrong path, `javascript:` URL, ambiguous characters (`0`, `O`, `1`, `I`, `L`), wrong length.
  - `ScanPage.test.tsx` (mock `qr-scanner`):
    - a valid decode navigates internally;
    - a foreign URL does not navigate and shows the notice;
    - permission denied shows the reason while manual entry still works;
    - the scanner stops on unmount.
  - `ReservationsPage.test.tsx`: filters, empty state, row link.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (reservations at 360 px ta, scan page at 360 px en with camera denied in headless) → commit `feat(frontend): pharmacy reservations and QR pickup scanner`.

### Task 5: Admin section shell, dashboard, pharmacy approvals, settings

**Files:**
- Create: `frontend/src/api/admin.ts`:
  - `useDashboard()`: `GET /admin/dashboard`.
  - `useAdminPharmacies()`: `GET /admin/pharmacies`.
  - `useApprovePharmacy()` / `useRejectPharmacy()`: `PUT .../approve|reject`.
  - `useAdminSettings()`: `GET /admin/settings`.
  - `useUpdateSettings()`: `PUT /admin/settings {demoModePublic}`.
  - `useResetDemo()`: `POST /admin/demo/reset`.
  - Keys under `adminKey = ["admin"]`. Settings changes and reset also invalidate the public settings query used by the login page.
- Create: `features/admin/AdminLayout.tsx`:
  - Sub-nav: Dashboard, Pharmacies, Users, Catalog, Suggestions, Settings.
  - Wired via `routes/admin/route.tsx` with `requireRole("ADMIN")`.
- Replace: `routes/admin/index.tsx` with `features/admin/DashboardPage.tsx`:
  - Stat cards from `DashboardResponse` (customers, pharmacies, verified, pending, rejected).
  - The pending card links to `/admin/pharmacies?status=PENDING`.
  - A pending-suggestions count from `GET /admin/medicines/suggestions?status=PENDING`.
- Create: `routes/admin/pharmacies.tsx` + `features/admin/PharmaciesPage.tsx`:
  - The `status` search param (PENDING default, VERIFIED, REJECTED, All) is validated with zod.
  - Each row shows name, district/city, licence, email, demo badge and status.
  - A row opens a detail sheet with address, phone, opening hours and a read-only `MapView` of the pin.
  - Approve and Reject (confirm); approve is also offered on REJECTED if the backend allows it (check `AdminServiceImpl`).
- Create: `routes/admin/settings.tsx` + `features/admin/SettingsPage.tsx`:
  - "Show demo data publicly" switch with an explanation and warning: demo accounts and passwords appear on the login page.
  - Turning it off asks for confirmation: demo pharmacies leave search and demo logins stop.
  - "Reset demo data" (confirm) with a success toast. After either action, invalidate the dashboard, pharmacies and public settings.
- Tests:
  - `DashboardPage.test.tsx`.
  - `PharmaciesPage.test.tsx`: status filter ↔ URL; approve PUT; reject confirms; the map renders with the pin; the demo badge.
  - `admin/SettingsPage.test.tsx`: switching on sends `{demoModePublic:true}` with no confirm; switching off confirms; reset confirms then POSTs; queries are invalidated (Review Focus 5).

- [ ] **Step 1–4:** RED → implement → checks + screenshots (dashboard and pharmacies with the sheet open at 360 px en + ta, 1280 px en) → commit `feat(frontend): admin dashboard, pharmacy approvals and demo settings`.

### Task 6: Admin users

**Files:**
- Modify: `frontend/src/api/admin.ts`:
  - `useAdminUsers({q, status})`: `GET /admin/users?q&status`, debounced search.
  - `useSuspendUser()`, `useReactivateUser()`, `useDeleteUser()`.
- Create: `routes/admin/users.tsx` + `features/admin/UsersPage.tsx`:
  - Search by name or email, and status chips (All, Active, Suspended) using the backend `AccountStatus` values; read them from the enum and report them.
  - Each row shows name, email, phone, role badge and status.
  - Actions:
    - Suspend (confirm) or Reactivate.
    - Delete (confirm, explaining that the account is anonymised and can't be restored).
    - None of these is offered on ADMIN rows.
  - `ACCOUNT_ACTION_NOT_ALLOWED` and `OPEN_RESERVATIONS` show translated.
- Tests: `UsersPage.test.tsx`:
  - the search param is sent;
  - suspend confirms then PUTs, and the row updates after the refetch;
  - reactivate;
  - delete confirms;
  - ADMIN rows have no actions;
  - a server `ACCOUNT_ACTION_NOT_ALLOWED` is shown (Review Focus 4).

- [ ] **Step 1–4:** RED → implement → checks + screenshots (users at 360 px si, 1280 px en) → commit `feat(frontend): admin user management`.

### Task 7: Admin catalog and suggestion review, final wiring

**Files:**
- Modify: `frontend/src/api/admin.ts`:
  - CRUD hooks for `/admin/medicines`, `/admin/categories`, `/admin/manufacturers`.
  - `useSuggestions(status)`: `GET /admin/medicines/suggestions?status`.
  - `useApproveSuggestion()`.
  - `useRejectSuggestion()`: `{reason}`.
- Create: `routes/admin/catalog.tsx` + `features/admin/CatalogPage.tsx`:
  - Tabs (Medicines, Categories, Manufacturers) held in the `tab` search param.
  - Each tab is a searchable list with Add and Edit dialogs (forms mirror `MedicineMasterRequest`, `CategoryRequest`, `ManufacturerRequest`) and Delete (confirm).
  - `DATA_CONFLICT` (still referenced) shows translated.
  - Medicines show their status chip and legal category.
- Create: `routes/admin/suggestions.tsx` + `features/admin/SuggestionsPage.tsx`:
  - PENDING by default (filter chips for the others).
  - Each suggestion card shows its full details and "Suggested by <pharmacy>".
  - Actions: Approve, or Reject with a required reason (1–500, in a dialog). `ALREADY_REVIEWED` shows translated and the list refetches.
- Test: `test/notificationLinks.test.ts` asserts that every backend notification link target (`/pharmacy`, `/pharmacy/inventory`, `/pharmacy/requests/<id>`, `/pharmacy/reservations`, `/admin/pharmacies`, plus the customer ones from 2B) matches a route in `routeTree.gen.ts`.
- Modify: `CONTEXT/DESIGN.md`, adding a short "Pharmacy and admin building blocks" section covering the section layouts, `parsePickupCode`, the scanner, and the stat card pattern.
- Tests:
  - `CatalogPage.test.tsx`: tab ↔ URL; add medicine body; edit; delete confirm; `DATA_CONFLICT` message.
  - `SuggestionsPage.test.tsx`: approve; reject needs a reason and sends `{reason}`; `ALREADY_REVIEWED`.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (catalog and suggestions at 360 px en + ta, 1280 px en) → commit `feat(frontend): admin catalog and suggestion review`.
