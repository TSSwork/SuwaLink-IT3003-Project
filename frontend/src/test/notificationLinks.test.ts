import { createMemoryHistory, createRouter } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"
import { routeTree } from "@/routeTree.gen"

/**
 * Every link the backend writes into a notification
 * (NotificationEventListener), with the route it must open.
 */
const LINKS: Array<[link: string, route: string]> = [
  // Pharmacy owner
  ["/pharmacy", "/pharmacy/"],
  ["/pharmacy/inventory", "/pharmacy/inventory"],
  [
    "/pharmacy/requests/3f2b7c1e-0000-4000-8000-000000000001",
    "/pharmacy/requests/$id",
  ],
  ["/pharmacy/reservations", "/pharmacy/reservations"],
  // Admin
  ["/admin/pharmacies", "/admin/pharmacies"],
  // Customer (Phase 2B); "/" after a pharmacy is rejected
  ["/", "/"],
  ["/prescriptions/3f2b7c1e-0000-4000-8000-000000000002", "/prescriptions/$id"],
  ["/reservations/3f2b7c1e-0000-4000-8000-000000000003", "/reservations/$id"],
]

const router = createRouter({
  routeTree,
  history: createMemoryHistory(),
})

/** The page route `link` opens, or undefined when only a layout (or nothing) matches. */
function routeFor(link: string) {
  const deepest = router.matchRoutes(link).at(-1)
  if (!deepest) return undefined
  const route = router.routesById[deepest.routeId]
  const isPage = !(route.children as Array<unknown> | undefined)?.length
  return isPage ? deepest.fullPath : undefined
}

describe("notification links", () => {
  it.each(LINKS)("%s opens %s", (link, route) => {
    expect(routeFor(link)).toBe(route)
  })

  it("would notice a link with no route", () => {
    expect(routeFor("/pharmacy/no-such-page")).toBeUndefined()
  })
})
