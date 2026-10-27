# Phase 2B — Customer Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything a customer does in the showcase: find a medicine (by name, near them), see who stocks it and at what price, save it, build a cart across pharmacies and reserve, upload a prescription to nearby/district/all pharmacies, compare replies and reserve from them, and show the QR pickup code — plus notifications and settings.

**Architecture:** Feature folders under `frontend/src/features/*` with route files that only wire `Route`. Server data through TanStack Query hooks in `frontend/src/api/*.ts` (one module per backend area). Client state in persisted Zustand stores (customer location, cart). Shared building blocks (location chooser, price, distance, Rx badge, quantity stepper, QR) in `frontend/src/components/*`. Prescription images are fetched with axios as blobs (authenticated endpoint) and shown in a zoomable viewer.

**Tech Stack:** as Phase 2A (TanStack Start SPA, React 19, shadcn on preset `b236ehlD6e`, TanStack Query, Zustand, axios, react-hook-form + zod, react-i18next, Leaflet) + `qrcode.react` (QR) + `react-zoom-pan-pinch` (image zoom). Backend: Spring Boot (one small public endpoint).

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` — §6.2, §6.4, §6.5, §7 (cart in browser, one reservation per pharmacy, quoted prices, QR to `/r/<code>`, notification polling 30 s), §9.2–§9.6, §10 (customer routes and UX notes), §14 steps 1–6.

## Global Constraints

- Everything from Phase 2A still binds (see `CONTEXT/DESIGN.md` "Implementation (shadcn)" and `README/I18N.md` Frontend section): brand tokens only, no new colours; route files export only `Route`, page components live in `src/features/**`; every visible string through `t()` with keys in `en`, `si`, `ta` (parity test); API errors shown via `translateError`; every new shadcn control reaches 44 px on touch via `pointer-coarse:` with a "SuwaLink edit" comment; mobile-first at 360 px; loading (skeleton), empty (what to do next) and error (retry) states on every list; tests first with a recorded RED run.
- Backend shapes are the contract: read the DTOs under `backend/src/main/java/com/suwalink/dto/**` and the endpoint docs `README/READ_INVENTORY_MODULE.md`, `READ_PRESCRIPTION_MODULE.md`, `READ_RESERVATION_MODULE.md`, `READ_NOTIFICATION_MODULE.md`. Add TS types to `src/api/types.ts`; list any mismatch in the report.
- Prices are LKR, shown with `Intl.NumberFormat(<lang>-LK, { style: "currency", currency: "LKR" })` via one helper `formatPrice`. Distances via `formatDistance` (`< 1 km` → metres rounded to 50 m, else 1 decimal km).
- Customer-only pages use `requireRole("CUSTOMER")`; public pages (home, search, medicine, pharmacy, `/r/$code` before login) need no session.
- Cart rules (spec §7, backend §9.5): one reservation per pharmacy; ≤ 20 lines per pharmacy; quantity 1–100 and ≤ stock shown; quoted lines carry `prescriptionResponseItemId` and their quantity is capped at the quoted quantity; prices shown are the offer/quoted price at the time of adding and refreshed from the server response after checkout.
- Prescription upload: image types `image/jpeg`, `image/png`, `image/webp`, max 5 MB (backend limit), consent checkbox required, scope `RADIUS_10KM | DISTRICT | ALL` exactly.
- QR encodes `${window.location.origin}/r/${pickupCode}`; pickup code always shown in Space Mono next to the QR.
- Notifications: unread count polled every 30 s while the tab is visible (`refetchInterval` + `refetchIntervalInBackground: false`); list fetched when the bell opens.
- Frontend commands from `frontend/`: `npm run typecheck && npm run lint && npm test && npm run build`. Backend (Task 1 only) from `backend/`: `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock ./mvnw -Dmaven.compiler.release= -Dmaven.compiler.source=25 -Dmaven.compiler.target=25 -q clean test`.
- Screenshots: `node scripts/screenshot.mjs <url> <en|si|ta> <out.png> [width]` against `npx vite preview --port 4173` (or the dev server for backend-backed flows). Each UI task captures its main screens at 360 px (en + one of si/ta) and 1280 px (en), and views them.
- Branch `feature/phase2b-customer-experience` off `main`; one commit per task.

## Review Focus

1. **Customer refuses location and picks no district** — expected: search still works (no distance, sorted by availability), a calm prompt to set location; prescription "Within 10 km" is disabled with a hint until a point is chosen. Tests in Tasks 1, 3, 6.
2. **Checkout across two pharmacies where one fails (stock gone)** — expected: the successful reservation is created and shown; the failed pharmacy's items stay in the cart with the translated `INSUFFICIENT_STOCK`/`ITEM_UNAVAILABLE` message; nothing is silently dropped. Test in Task 5.
3. **Large phone photo (8 MB) or a PDF chosen for a prescription** — expected: rejected before upload with a translated message; no request sent. Test in Task 6.
4. **Reserving more of a quoted item than remains (already partly reserved)** — expected: the stepper caps at the remaining quantity; a server 400 is shown translated if it still happens. Test in Tasks 5/6.
5. **Opening `/r/<code>` signed out, or as a different customer** — expected: signed out → login then back to the order; other customer → translated "not found" (backend 404), no data leak. Test in Task 7.

---

### Task 1: Public categories, startup session check, customer location, money/distance helpers

**Files:**
- Backend — Create: `controller/PublicCatalogController.java` with `GET /api/categories` (public; active categories `{id, name}` sorted by name) via the existing `CategoryService` (add `listActive()` if needed); permit `GET /api/categories` in `SecurityConfig`. Test: `controller/PublicCategoriesTest.java` (anonymous 200, inactive excluded).
- Create: `frontend/src/api/catalog.ts` — `useCategories()`.
- Create: `frontend/src/stores/locationStore.ts` — persisted `suwalink.location`: `{ mode: 'none' | 'point' | 'district', lat?, lng?, district?, label? }`, `setPoint`, `setDistrict`, `clear`. When signed in and the user has a preference district and the store is `none`, default to it.
- Create: `frontend/src/components/location/LocationChooser.tsx` — compact control (sheet/dialog on mobile): "Use my location" (geolocation, same denial handling as `LocationPicker`), or pick a district (`DistrictSelect`), or "Choose on map" (`LocationPicker`); shows the current choice as a chip ("Near me", "Kandy").
- Create: `frontend/src/lib/format.ts` — `formatPrice(amount: number, lang)`, `formatDistance(km: number | null, lang)`, `formatDateTime(iso, lang)`, `formatRelative(iso, lang)`.
- Modify: `frontend/src/routes/__root.tsx` (or a small `SessionBootstrap` component) — when a token exists at startup, call `getMe()` once; 401 is handled by the client (session cleared); on success refresh the stored user name/role (carry-over from 2A).
- Test: `locationStore.test.ts`, `LocationChooser.test.tsx` (denied → district fallback works), `format.test.ts` (si/ta/en currency, metres vs km), session bootstrap test (expired token → cleared, no redirect loop on public pages).

- [ ] **Step 1:** Write the failing tests (backend + frontend); run both suites. Expected: FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** All frontend checks + backend suite pass.
- [ ] **Step 4:** Commit `feat: public categories, startup session check, customer location chooser and format helpers`.

### Task 2: Notification bell (all signed-in roles)

**Files:**
- Create: `frontend/src/api/notifications.ts` — `useUnreadCount()` (30 s polling, visible tab only), `useNotifications()` (fetched when opened), `useMarkRead()`, `useMarkAllRead()`; invalidate count after marking.
- Create: `frontend/src/components/layout/NotificationBell.tsx` — bell icon with badge (99+ cap, `aria-label` with the count), dropdown/sheet listing title, message, relative time, unread dot; clicking an item marks it read and navigates to its `link`; "Mark all as read"; empty state; placed in `AppShell` for any signed-in user (fits the 360 px header — verify).
- Test: badge shows count; opening fetches list; click marks read + navigates; mark all; polling interval set to 30 000 ms and disabled in background; empty state.

- [ ] **Step 1–4:** RED → implement → checks + 360 px screenshot (en, si) → commit `feat(frontend): notification bell with unread badge`.

### Task 3: Home and search

**Files:**
- Replace: `frontend/src/features/home/IndexPage.tsx` — landing: headline + search box (submits to `/search?q=`), `LocationChooser` chip, primary CTA "Upload a prescription" (`/prescriptions/new`, login redirect if signed out), short "how it works" (3 steps: search or upload → pharmacies reply → reserve and pick up), signed-in customers also see "Your recent reservations" (top 3) — keep it calm and uncluttered.
- Create: `frontend/src/api/medicines.ts` — `useMedicineSearch({q, categoryId, district, lat, lng, page, size})` (keepPreviousData), `useMedicine(id)`, `useOffers(id, {lat, lng, district, sort})`.
- Create: `frontend/src/routes/search.tsx` + `frontend/src/features/search/SearchPage.tsx` — search params in the URL (`q`, `category`, `page`) validated with zod `validateSearch`; location from `locationStore`; category chips from `useCategories`; results list of `MedicineResultCard` (brand, generic, strength/form, category, Rx badge, "N pharmacies", "from <price>", "nearest <distance>" when known); pagination ("Load more" or pages — pick one, keep URL in sync); skeletons; empty state with tips ("check spelling", "try the generic name", "or upload your prescription"); error state with retry.
- Create: `frontend/src/components/medicine/RxBadge.tsx` (prescription-required marker with tooltip/text — not colour alone).
- Test: query params ↔ URL; result card content; empty and error states; no-location shows prompt and no distance; RxBadge accessible text.

- [ ] **Step 1–4:** RED → implement (load `frontend-design`) → checks + screenshots (home & search at 360/1280, si) → commit `feat(frontend): home page and medicine search`.

### Task 4: Medicine page, pharmacy page, saved items

**Files:**
- Create: routes `medicines/$id.tsx`, `pharmacies/$id.tsx`, `saved.tsx` + `features/medicine/MedicinePage.tsx`, `features/pharmacy/PharmacyPage.tsx`, `features/saved/SavedPage.tsx`.
- Medicine page: name, generic, strength/form, manufacturer, category, description, Rx notice ("Bring your prescription when you collect"), offers list sorted by distance (when location known) or price with a toggle; each offer: pharmacy name (link), district/city, distance, price, stock indicator ("In stock"/"Only N left" when ≤ 5), "Add to cart" with quantity stepper (1..min(stock,100)), "Save" (bookmark) for signed-in customers.
- Pharmacy page: name, address, district/city, phone (`tel:` link), opening hours, small read-only map (reuse `MapView`/Leaflet, lazy), "Directions" link to `https://www.openstreetmap.org/directions?to=<lat>,<lng>`; items list (brand, strength, Rx badge, price, stock) with add-to-cart and a filter box.
- Saved page (customer): bookmarks (`GET/POST/DELETE /api/bookmarks`) with remove and add-to-cart; empty state.
- Create: `frontend/src/api/pharmacies.ts` (`usePublicPharmacy`), `frontend/src/api/bookmarks.ts`; `frontend/src/components/cart/AddToCartButton.tsx` + `QuantityStepper.tsx` (uses the cart store from Task 5 — define the store's interface in this task's Interfaces and implement the minimal `add` now, or order Task 5 before Task 4 — **implementer of Task 4 creates `stores/cartStore.ts` with the full interface from Task 5's spec**; Task 5 builds the cart page and checkout on it).
- Cart store interface (used by Tasks 4–6): `lines: CartLine[]` where `CartLine = { inventoryItemId, pharmacyId, pharmacyName, medicineId, medicineName, strength, unitPrice, quantity, maxQuantity, requiresPrescription, prescriptionResponseItemId?, prescriptionRequestId? }`; `add(line)` (merges same inventoryItemId + same quote, caps at maxQuantity), `setQuantity(inventoryItemId, qty)`, `remove(inventoryItemId)`, `clearPharmacy(pharmacyId)`, `groups()` → lines grouped by pharmacy; persisted `suwalink.cart`; cleared on sign-out of a different user.
- Test: offers sort toggle; stock indicator; add-to-cart merges and caps; bookmark toggle; pharmacy 404 → not-found state; cart store unit tests.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (medicine + pharmacy at 360, ta) → commit `feat(frontend): medicine and pharmacy pages, saved items, cart store`.

### Task 5: Cart and checkout

**Files:**
- Create: route `cart.tsx` + `features/cart/CartPage.tsx` — groups per pharmacy (pharmacy name/link, lines with stepper and remove, group subtotal, Rx notice if any line requires a prescription), grand total, "Reserve" button: signed out → `/login?redirect=/cart`; non-customer → explanatory message.
- Create: `frontend/src/api/reservations.ts` — `useCreateReservation()` (`POST /api/reservations` with `{ lines: [{ inventoryItemId, quantity, prescriptionResponseItemId? }] }`), `useMyReservations()`, `useReservation(id)`, `useReservationByCode(code)`, `useCancelReservation()`, `useCompleteReservation()`.
- Checkout: one request per pharmacy group, sequentially; collect results; successful groups are removed from the cart; failed groups stay with their translated error shown on that group; then show a summary dialog/page listing created reservations (pickup codes, links) and any failures; hold time ("held for 24 hours") explained before reserving.
- Cart badge in the AppShell (count of lines) for customers/signed-out visitors.
- Test: grouping and totals; signed-out redirect; two-group checkout where the second fails → first removed from cart, second remains with `INSUFFICIENT_STOCK` text; Rx notice; >20 lines in a group blocked client-side.

- [ ] **Step 1–4:** RED → implement → checks + screenshots → commit `feat(frontend): cart and per-pharmacy checkout`.

### Task 6: Prescriptions — upload, list, detail with replies

**Files:**
- Create: `frontend/src/api/prescriptions.ts` — `useCreatePrescription()` (multipart: `image`, `patientAge`, `note`, `targetScope`, `latitude`, `longitude`, `district`, `consent`), `useMyPrescriptions()`, `usePrescription(id)`, `usePrescriptionResponses(id)`, `useClosePrescription()`, `useDeletePrescription()`, `usePrescriptionImage(imageUrl)` (axios `responseType: 'blob'` → object URL, revoked on unmount).
- Create: routes `prescriptions/index.tsx`, `prescriptions/new.tsx`, `prescriptions/$id.tsx` + `features/prescriptions/*`.
- New (upload): image picker with camera capture on mobile (`accept="image/*"` + `capture="environment"`), preview, client-side type/size check (Global Constraints), patient age, note (≤ 1000), scope radio group with explanations — Within 10 km (uses `locationStore` point or opens `LocationChooser`; disabled with hint until a point exists), My district (`DistrictSelect`, defaults from store/preferences), All pharmacies; consent checkbox (text: shared only with the pharmacies you choose); submit with upload progress; `NO_PHARMACIES_IN_SCOPE` (422) shows the server message translated and offers a one-tap "Send to my district"/"Send to all" retry; success → detail page.
- List: cards with created time, scope, status chip (Pending/Responded/Closed/Expired), number of replies, thumbnail placeholder (no image download in the list).
- Detail: zoomable image (`react-zoom-pan-pinch`, never cropped, neutral background, pinch + buttons + keyboard), status, expiry, note; replies section comparing pharmacies (pharmacy name/link, message, items with quoted price × qty, total, "Add all to cart" and per-item add with quantity ≤ quoted remaining); actions: Close request (confirm), Delete (only when no reservations — server 409 shown translated).
- Test: file checks (8 MB, PDF rejected, no request); scope radio disables 10 km without a point; 422 → retry with wider scope sends the new scope; multipart field names exactly match the backend; image blob fetched with auth and object URL revoked; replies add quoted lines to cart with `prescriptionResponseItemId` and capped quantity.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (new + detail at 360, si) → commit `feat(frontend): prescription upload, list and reply comparison`.

### Task 7: Reservations and QR pickup

**Files:**
- Create: routes `reservations/index.tsx`, `reservations/$id.tsx`, `r/$code.tsx` + `features/reservations/*`.
- Add `qrcode.react`.
- List: status filter chips (Active/Completed/Cancelled/Expired), cards with pharmacy, items count, total, pickup code, expiry countdown for active ones.
- Detail (`ReservationView`, shared with `/r/$code`): large QR (`QRCodeSVG` of `${origin}/r/${code}`, with quiet zone, high contrast in both themes), pickup code in Space Mono, status, "held until <time>" with countdown, pharmacy card (address, phone, opening hours, directions link), items with prices, total, Rx notice when any item requires a prescription, Cancel (customer, CONFIRMED only, optional reason, confirm dialog). For a signed-in **pharmacy owner** viewing their own pharmacy's reservation: "Mark as collected" (`PATCH /complete`) and "Cancel" with reason — so the QR scan works in the showcase before 2C.
- `/r/$code`: requires auth (redirect to login with return); loads by code; 404 → translated "reservation not found"; renders `ReservationView`.
- Test: QR value equals origin + code; countdown; cancel flow; owner sees Mark as collected; `/r/$code` signed-out redirect and 404 state.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (detail at 360 en+ta, dark mode QR) → commit `feat(frontend): reservations with QR pickup codes`.

### Task 8: Customer navigation and settings

**Files:**
- Modify: `AppShell` — customer navigation (Search, Prescriptions, Reservations, Saved; Cart icon with badge; bell from Task 2); signed-out visitors see Search + Cart + Sign in; mobile uses the existing Sheet menu; verify 360 px header in all three languages.
- Create: route `settings.tsx` + `features/settings/SettingsPage.tsx` (customers; pharmacy owners and admins get theirs in 2C): profile (name, email, phone read-only), preferred language (updates `languageStore` and `PUT /api/users/me/preferences`), default district (same endpoint; also seeds `locationStore`), theme, sign out, Delete account (dialog requiring password → `DELETE /api/users/me`; on success clear session, cart, location; go home with a toast).
- Modify: `CONTEXT/DESIGN.md` — note new shared components (LocationChooser, RxBadge, QuantityStepper, QR view) and patterns (status chips, cart groups).
- Test: nav items by role; settings saves language + district (request body); delete account requires password and clears stores; server `INVALID_PASSWORD` shown.

- [ ] **Step 1–4:** RED → implement → checks + screenshots (header en/si/ta at 360; settings) → run `impeccable` critique across the customer flow and fix High findings → commit `feat(frontend): customer navigation and settings`.

---

## Done when

- All frontend checks pass; backend suite passes.
- With the dev stack and demo mode on, the §14 customer steps work in the browser: search "Panadol" → offers by distance → pharmacy page → add from two pharmacies → reserve → two reservations with QR; upload a prescription to "My district" → (pharmacy replies via demo data or API) → compare and reserve from the reply; open `/r/<code>` as the pharmacy owner → mark collected; switch to Sinhala/Tamil and dark mode throughout.
