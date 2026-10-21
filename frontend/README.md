# SuwaLink frontend

Single-page app for SuwaLink: TanStack Start (SPA mode) + React 19, Tailwind 4,
shadcn/ui on the `radix-rhea` preset, TanStack Query, Zustand, axios,
react-hook-form + zod, react-i18next, Vitest.

## Commands

Run from `frontend/` (npm only):

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm install`       | Install dependencies                           |
| `npm run dev`       | Dev server on http://localhost:3000            |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`)              |
| `npm run lint`      | ESLint                                         |
| `npm test`          | Vitest, single run                             |
| `npm run build`     | Static client bundle                           |

All four checks (`typecheck`, `lint`, `test`, `build`) must pass before a commit.

## API proxy

App code calls the backend with the relative base path `/api`. In development
Vite proxies `/api` to the Spring Boot backend on `http://localhost:8080`
(see `vite.config.ts`), so start the backend first. Never hard-code the
backend host in app code.

## Structure

```
src/
  routes/               file-based routes (TanStack Router); __root.tsx = document + AppShell
  components/ui/        shadcn components - add with `npx shadcn@latest add <name>`
  components/layout/    AppShell, ThemeToggle
  components/feedback/  LoadingState, EmptyState, ErrorState
  stores/               Zustand stores (persisted under `suwalink.*` keys)
  lib/                  helpers (theme, utils)
  styles.css            brand tokens (light + dark), fonts
  test/                 Vitest setup
```

Brand colours, fonts and dark-mode rules are documented in
`../CONTEXT/DESIGN.md` ("Implementation (shadcn)").
