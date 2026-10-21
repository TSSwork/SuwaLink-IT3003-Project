# Phase 2A — Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running TanStack Start app in `frontend/` with the SuwaLink look (olive palette, light/dark), three languages, a typed API client with JWT session, and complete auth screens including the multi-step pharmacy registration with an OpenStreetMap location picker.

**Architecture:** SPA-mode TanStack Start (file routes, client-rendered; built static files served by Caddy in Phase 3). Vite dev server proxies `/api` to Spring Boot so the browser always talks same-origin. Server state through TanStack Query; client state (session, theme, language, later cart) in persisted Zustand stores; HTTP through one axios instance. UI built only from shadcn components on the owner's preset, re-themed with brand tokens. i18n with react-i18next (JSON per language); API errors translated by their stable `code`.

**Tech Stack:** TanStack Start + Router, React 19, Vite 8, Tailwind 4, shadcn (`radix-rhea` style from preset `b236ehlD6e`), TanStack Query, Zustand, axios, react-hook-form + zod, react-i18next, Leaflet + react-leaflet, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` — §6.1, §6.7, §6.12, "Languages", §7 (SPA mode, same origin, design, mobile-first, manual fallbacks for location), §10, §13.

## Global Constraints

- The app lives in `frontend/` and is created **only** with the owner's command, run from the repo root: `npx shadcn@latest init --preset b236ehlD6e --base radix --template start --pointer --name frontend --no-monorepo`. Keep the preset's component style (`radix-rhea`, radius, menu style); add components only with `npx shadcn@latest add <name>` from `frontend/`.
- Package manager: npm (the scaffold writes `package-lock.json`). Replace every `"latest"` version in `package.json` with the exact installed version.
- Brand palette (from `CONTEXT/DESIGN.md`, "Olive Garden Feast"): Olive Leaf `#606C38` (primary), Black Forest `#283618` (foreground/headlines), Cornsilk `#FEFAE0` (light background), Sunlit Clay `#DDA15E` (secondary/accent), Copperwood `#BC6C25` (tertiary/highlight). Expressed as oklch in the shadcn CSS variables, light **and** dark; dark mode is a designed palette, not an inversion. Destructive stays the preset's red.
- Fonts: Manrope (UI), Noto Sans Sinhala and Noto Sans Tamil (fallbacks in the same `font-family` stack), Space Mono only for codes/IDs (pickup codes, licence numbers). Remove the preset's Geist/Raleway imports.
- Languages `en` (default), `si`, `ta`; every visible string goes through `t()`; locale files `frontend/src/locales/{en,si,ta}.json` with identical keys. Sinhala/Tamil text written by the implementer, flagged in `README/I18N.md` as pending native review.
- API base path is `/api` (relative). Dev proxy `/api → http://localhost:8080` in `vite.config.ts`. Never hard-code `localhost:8080` in app code.
- Every request sends `Authorization: Bearer <token>` when logged in and `Accept-Language: <current language>`.
- Error display: translate `ApiError.code` with `t('errors.<CODE>')`; fall back to the server `message` only if the key is missing. The backend code list in `README/I18N.md` is the contract.
- Mobile-first: every screen usable at 360 px wide; touch targets ≥ 44 px; keyboard accessible; visible focus; `prefers-reduced-motion` respected.
- Districts: the 25 enum values (`AMPARA … VAVUNIYA`, see `backend/src/main/java/com/suwalink/entity/District.java`) with translated labels.
- Sri Lanka coordinate range: latitude `5.85`–`9.90`, longitude `79.50`–`81.95`; map default centre Colombo `6.9271, 79.8612`, zoom 13; tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with the OSM attribution.
- Design skills: before UI work, load the `frontend-design` skill (and `impeccable` for critique of finished screens). Follow `CONTEXT/DESIGN.md` principles (calm, trustworthy, no glassmorphism/neumorphism/gradient-heavy UI).
- Commands from `frontend/`: `npm run typecheck`, `npm run lint`, `npm test` (Vitest, `--run`), `npm run build`. All must pass at the end of every task.
- Branch `feature/phase2a-frontend-foundation` off `main`; one commit per task.

## Review Focus

1. **Backend down or slow on the login page** — expected: the form stays usable, a translated "can't reach the server" message (code `NETWORK_ERROR`, frontend-only), no blank screen, demo buttons simply absent. Test in Task 4/5.
2. **JWT expired while a page is open** — expected: the next API call returns 401, the session clears once, the user lands on `/login?redirect=<current path>` with a translated "please sign in again" notice, no redirect loop. Test in Task 4.
3. **Location permission denied or no GPS (desktop)** — expected: map still shows at Colombo, a translated hint "tap the map to place your pharmacy", registration still completes. Test in Task 6.
4. **Sinhala/Tamil text longer than English in buttons/inputs** — expected: no overflow or clipped labels at 360 px. Checked in the Task 2 and Task 6 screenshots.
5. **Unknown error code from the server** — expected: shows the server `message`, never `errors.SOMETHING` raw. Test in Task 3.

---

### Task 1: Scaffold, SPA mode, dev proxy, test tooling

**Files:**
- Create: `frontend/` via the owner's command (Global Constraints).
- Modify: `frontend/vite.config.ts` — SPA mode (`tanstackStart({ spa: { enabled: true } })` — confirm the exact option against the installed `@tanstack/react-start` version's docs/types), `server.proxy` for `/api`, devtools plugin only in dev.
- Modify: `frontend/package.json` — pin versions; add `"test": "vitest --run"`; add deps: `@tanstack/react-query`, `zustand`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `i18next`, `react-i18next`; dev deps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- Create: `frontend/vitest.config.ts` (jsdom, setup file with jest-dom), `frontend/src/test/setup.ts`.
- Modify: `frontend/src/routes/__root.tsx` — title "SuwaLink", devtools only when `import.meta.env.DEV`.
- Replace: `frontend/src/routes/index.tsx` — temporary placeholder page (translated in Task 3).
- Modify: root `.gitignore` / `frontend/.gitignore` — `node_modules`, `dist`, `.output`, `.tanstack`.
- Modify: `README.md` quick start — `cd frontend && npm install && npm run dev` (http://localhost:3000), project-structure line.
- Test: `frontend/src/test/smoke.test.tsx` — renders the index route component and finds "SuwaLink".

- [ ] **Step 1:** Run the owner's command from the repo root; confirm `frontend/components.json` style is `radix-rhea`.
- [ ] **Step 2:** Write the smoke test; run `npm test`. Expected: FAIL (no test setup yet / text missing).
- [ ] **Step 3:** Add tooling, SPA mode, proxy, pins, placeholder page.
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm test && npm run build` all pass; `npm run build` output is a static client bundle (record the output directory in the report). Manual: `npm run dev`, then with the backend running `curl -s localhost:3000/api/settings/public` returns the backend JSON through the proxy.
- [ ] **Step 5:** Commit `feat(frontend): scaffold TanStack Start app with SPA mode, API proxy and tests`.

### Task 2: Brand theme, fonts, app shell

**Files:**
- Modify: `frontend/src/styles.css` — brand oklch tokens for `:root` and `.dark` (primary, primary-foreground, secondary, accent, background, foreground, card, muted, border, ring, sidebar-*, chart-1…5 derived from the palette); `--font-sans` Manrope + Noto Sans Sinhala + Noto Sans Tamil; `--font-mono` Space Mono; remove Geist/Raleway.
- Modify: `frontend/package.json` — `@fontsource-variable/manrope`, `@fontsource/noto-sans-sinhala`, `@fontsource/noto-sans-tamil`, `@fontsource/space-mono` (check exact package names on npm).
- Create: `frontend/src/stores/themeStore.ts` — Zustand persisted (`suwalink.theme`): `theme: 'light' | 'dark' | 'system'`, `setTheme`. `frontend/src/lib/theme.ts` — applies `.dark` on `<html>` (system follows `prefers-color-scheme`, reacts to changes); applied before first paint (inline script in the root head) to avoid a flash.
- Create: `frontend/src/components/layout/AppShell.tsx` — top bar: brand wordmark linking to `/`, slot for navigation, `LanguageSwitcher` slot (Task 3), `ThemeToggle`, account area (sign-in button or user menu — wired in Task 4/5); main content container; footer with Privacy/Terms links. Responsive: on < 768 px the nav collapses into a `Sheet` menu.
- Create: `frontend/src/components/layout/ThemeToggle.tsx` (shadcn `DropdownMenu`: Light / Dark / System).
- Create: `frontend/src/components/feedback/{LoadingState,EmptyState,ErrorState}.tsx` — shared states (skeleton or spinner; icon + title + "what to do next" + optional action; error with retry). Use shadcn `Skeleton`, `Alert`, `Button`.
- Modify: `CONTEXT/DESIGN.md` — new top section "Implementation (shadcn)": components come from shadcn on the `radix-rhea` preset; Material Design 3 references below are historical guidance for principles only; token table mapping each brand colour to shadcn variables; fonts; dark mode rules. Modify `CONTEXT/SPECS.md` frontend section: TanStack Start, React, shadcn, TanStack Query, Zustand, axios, react-hook-form/zod, react-i18next, Vitest.
- Test: `frontend/src/lib/theme.test.ts` — system mode follows media query; explicit dark adds `.dark`; persisted choice restored.

- [ ] **Step 1:** Load the `frontend-design` skill. Write the theme tests; run. Expected: FAIL.
- [ ] **Step 2:** Implement tokens, fonts, store, shell, toggle, feedback components; add shadcn components as needed (`dropdown-menu`, `sheet`, `skeleton`, `alert`, `separator`, `avatar`, `badge`).
- [ ] **Step 3:** All four commands pass.
- [ ] **Step 4:** Visual check: run the dev server; if a browser tool is available (e.g. `anthropic-skills:chrome-browser` / `built-in-browser`), capture the placeholder page at 360 px and 1280 px in light and dark and attach the paths in the report; contrast of primary text/buttons ≥ WCAG AA (state measured ratios).
- [ ] **Step 5:** Commit `feat(frontend): brand theme, fonts, dark mode and app shell`.

### Task 3: Internationalisation

**Files:**
- Create: `frontend/src/i18n/index.ts` — i18next init (resources from the three JSON files, `fallbackLng: 'en'`, interpolation escaping on), `frontend/src/stores/languageStore.ts` (persisted `suwalink.lang`, default from `navigator.language` if it starts with si/ta else en), sync to `i18n.changeLanguage` and `<html lang>`.
- Create: `frontend/src/locales/{en,si,ta}.json` — namespaces as nested keys: `common.*`, `nav.*`, `auth.*`, `register.*`, `pharmacyRegister.*`, `districts.<ENUM>` (all 25), `errors.<CODE>` (every code in `README/I18N.md` plus frontend‑only `NETWORK_ERROR`, `UNKNOWN`), `validation.*` (required, email, minLength, maxLength, passwordMismatch, coordinatesRange, acceptTerms), `theme.*`, `legal.*`.
- Create: `frontend/src/components/layout/LanguageSwitcher.tsx` — shows "English / සිංහල / தமிழ்" (native names); placed in the AppShell.
- Create: `frontend/src/lib/translateError.ts` — `translateError(t, error: ApiError): string` (`errors.<code>` if present, else server message, else `errors.UNKNOWN`).
- Test: `frontend/src/i18n/locales.test.ts` — identical key sets across en/si/ta; every `{{placeholder}}` set identical per key; every code listed in `README/I18N.md`'s code table (parse the markdown table from the repo file at test time via `fs`) has `errors.<CODE>` in all three; `translateError` falls back to message for an unknown code.

- [ ] **Step 1:** Write the tests; run. Expected: FAIL.
- [ ] **Step 2:** Implement; replace every literal string in existing components with `t()`.
- [ ] **Step 3:** All four commands pass; switching language in the dev server updates the shell immediately and survives reload.
- [ ] **Step 4:** Commit `feat(frontend): English, Sinhala and Tamil with translated error codes`.

### Task 4: API client, session, query provider, route guards

**Files:**
- Create: `frontend/src/api/client.ts` — axios instance `baseURL: '/api'`; request interceptor adds `Authorization` from the session store and `Accept-Language` from the language store; response interceptor converts errors to `ApiError` (`status`, `code`, `message`, `fieldErrors: {field, code, message}[]`; network failure → `code: 'NETWORK_ERROR'`); on 401 for any request except `POST /auth/login`, clear the session once and navigate to `/login?redirect=<current path>&reason=expired`.
- Create: `frontend/src/api/types.ts` — `ApiResponse<T>`, `ApiErrorBody`, `Role` (`CUSTOMER | PHARMACY_OWNER | ADMIN`), `AuthResponse` (`token, role, id, name`), `UserProfile` (fields of `GET /api/users/me`), `PublicSettings` (`demoModePublic`, `demoAccounts: {role, email, password}[]`), `District` union of the 25 values. Shapes must match backend DTOs — read them from `backend/src/main/java/com/suwalink/dto/**` and list any mismatch in the report.
- Create: `frontend/src/api/auth.ts` — `login`, `registerCustomer`, `registerPharmacy`, `forgotPassword`, `resetPassword`, `getMe`, `getPublicSettings`.
- Create: `frontend/src/stores/sessionStore.ts` — persisted (`suwalink.session`): `token`, `user: {id, name, role}`, `setSession`, `clear`. (Spec §9: JWT in browser storage for the MVP.)
- Create: `frontend/src/lib/queryClient.ts` — QueryClient (retry: no retry on 4xx, 1 retry on network errors; `staleTime` 30 s); provider in `__root.tsx`.
- Create: `frontend/src/lib/guards.ts` — `requireAuth()` and `requireRole(...roles)` helpers for route `beforeLoad` (redirect to `/login?redirect=…`, or to the role's home if the role is wrong); `homeFor(role)` → `CUSTOMER: '/'`, `PHARMACY_OWNER: '/pharmacy'`, `ADMIN: '/admin'`.
- Create: placeholder routes `frontend/src/routes/pharmacy/index.tsx`, `frontend/src/routes/admin/index.tsx` guarded by role (content filled in 2C), showing a translated "coming soon" `EmptyState`.
- Modify: `AppShell` account area — signed‑out: "Sign in" button; signed‑in: avatar menu with name, role home, "Sign out".
- Test: `frontend/src/api/client.test.ts` (with `axios-mock-adapter` or msw — pick one, add as dev dep): adds both headers; maps a backend error body to `ApiError` incl. field errors; network error → `NETWORK_ERROR`; 401 clears session and redirects once even for two parallel failing requests; 401 from login does not redirect. `frontend/src/lib/guards.test.ts`: role redirects.

- [ ] **Step 1:** Write tests; run. Expected: FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** All four commands pass.
- [ ] **Step 4:** Commit `feat(frontend): typed API client, persisted session and role guards`.

### Task 5: Sign-in, customer sign-up, password reset, legal pages

**Files:**
- Create routes: `frontend/src/routes/login.tsx`, `register.tsx` (customer), `forgot-password.tsx`, `reset-password.tsx`, `privacy.tsx`, `terms.tsx`.
- Create: `frontend/src/features/auth/schemas.ts` — zod schemas mirroring backend validation (customer: name required, email valid, phone required, password ≥ 8, confirm matches, `acceptTerms` must be true; login: email, password; forgot: email; reset: email, 6‑digit OTP, new password ≥ 8 + confirm). Messages are i18n keys.
- Create: `frontend/src/features/auth/applyFieldErrors.ts` — maps `ApiError.fieldErrors` onto react‑hook‑form `setError` (message via `t('validation.<code>')` fallback server message).
- Login page: email/password; on success store session and go to `redirect` param or `homeFor(role)`; `PHARMACY_NOT_VERIFIED` shows a calm "your pharmacy is awaiting approval" panel; `ACCOUNT_SUSPENDED` and `DEMO_DISABLED` show their translated messages; `reason=expired` shows a notice; "Forgot password?" and "Create account" / "Register your pharmacy" links. When `getPublicSettings().demoAccounts` is non‑empty, show a "Try the demo" card with one button per account that fills and submits the form.
- Register page: customer form with a Terms/Privacy checkbox linking to the pages; success → sign in automatically (call login) and go to `/`.
- Forgot/reset: request code → move to reset form with the email pre‑filled; success → toast and go to `/login`.
- Privacy/Terms: placeholder content from the locale files with a visible "Draft — pending review" badge (spec §13).
- Use shadcn `card`, `form`/`field`, `input`, `label`, `checkbox`, `button`, `alert`, `sonner` (toasts).
- Test: `frontend/src/features/auth/*.test.tsx` — login success routes by role; `PHARMACY_NOT_VERIFIED` panel; demo button fills credentials; register blocks submit without terms; server field error appears under the right field; backend unreachable shows `NETWORK_ERROR` text and the form stays usable.

- [ ] **Step 1:** Load `frontend-design`. Write tests; run. Expected: FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** All four commands pass. Manual on the dev stack (backend running, demo mode on via admin API): log in with each demo account and the dev admin; register a customer; run forgot/reset with the OTP from Mailpit (`http://localhost:8025`).
- [ ] **Step 4:** Screenshots at 360 px (en and si) of login and register if a browser tool is available.
- [ ] **Step 5:** Commit `feat(frontend): sign-in, sign-up, password reset and legal pages`.

### Task 6: Pharmacy registration with map location picker

**Files:**
- Modify: `frontend/package.json` — `leaflet`, `react-leaflet`, `@types/leaflet`.
- Create: `frontend/src/components/map/LocationPicker.tsx` — props `{ value?: {lat, lng}, onChange(lat, lng), height? }`; client‑only (Leaflet touches `window` — lazy import inside an effect or `React.lazy`); OSM tiles + attribution; draggable marker; clicking the map moves the marker; "Use my location" button calls `navigator.geolocation.getCurrentPosition` (timeout 10 s) and recentres; denial/timeout/unsupported show a translated inline hint and leave the map usable; coordinates outside Sri Lanka show a translated validation error; shows the chosen lat/lng in mono text (6 dp). Reusable by 2B (prescription radius) and 2C (pharmacy settings).
- Create: `frontend/src/components/forms/DistrictSelect.tsx` — shadcn `select` (or `combobox` if the list is long on mobile) over the 25 districts with translated labels.
- Create: `frontend/src/routes/register/pharmacy.tsx` — 4 steps with a progress indicator: (1) Owner account: owner name, email, phone, password + confirm; (2) Pharmacy: pharmacy name, licence number, pharmacy phone (defaults to owner phone), address, district, city, opening hours (optional); (3) Location: `LocationPicker` + manual lat/lng inputs kept in sync; (4) Review: summary of everything + Terms/Privacy checkbox → submit `POST /api/auth/register/pharmacy` with `name, email, phone, password, licenceNo, address, pharmacyName, district, city, latitude, longitude, openingHours, acceptTerms`. Each step validates before "Next"; "Back" keeps entered data; state survives an accidental reload (persist draft in `sessionStorage`, never the password). Success screen: "Thanks — an admin will review your pharmacy. We'll email you when it's approved."
- Create: `frontend/src/features/pharmacyRegister/schema.ts` — zod per step (ranges per Global Constraints).
- Test: `LocationPicker` (with a mocked Leaflet or by testing the coordinate logic in a pure helper `clampToSriLanka`/`isInSriLanka`), geolocation denied → hint shown; wizard: cannot advance with invalid step data; out‑of‑range coordinates block; submit payload has exactly the backend field names; server `DUPLICATE` (licence) shows translated error on step 2's licence field.

- [ ] **Step 1:** Load `frontend-design`. Write tests; run. Expected: FAIL.
- [ ] **Step 2:** Implement (`npx shadcn@latest add select progress` etc. as needed; import `leaflet/dist/leaflet.css`; fix the default marker icon asset paths for Vite).
- [ ] **Step 3:** All four commands pass. Manual on the dev stack: register a pharmacy end to end with "Use my location" allowed and denied; approve it as admin via Swagger/curl; log in as that owner → lands on `/pharmacy`.
- [ ] **Step 4:** Screenshots at 360 px of steps 2 and 3 (en and ta) if a browser tool is available; run the `impeccable` skill's critique on the finished flow and fix any High findings.
- [ ] **Step 5:** Commit `feat(frontend): multi-step pharmacy registration with map location picker`.

---

## Done when

- From `frontend/`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass.
- With the backend dev stack running: customer sign-up/sign-in/sign-out, password reset via Mailpit, pharmacy registration with map, demo one-click sign-in (demo mode on), language switching (en/si/ta) and dark mode all work in the browser at 360 px and desktop widths.
- `CONTEXT/DESIGN.md`, `CONTEXT/SPECS.md`, `README.md` describe the new frontend.
