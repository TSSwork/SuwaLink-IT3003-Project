import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AdminLayout } from "@/features/admin/AdminLayout"
import { Route as AdminRoute } from "@/routes/admin/route"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { renderRoutes } from "@/test/renderRoutes"

/** The real guard from routes/admin/route.tsx. */
const guard = AdminRoute.options.beforeLoad as (context: {
  location: { href: string }
}) => void

function renderAt(path: string) {
  return renderRoutes(
    [
      { path: "/admin", component: AdminLayout, beforeLoad: guard },
      { path: "/admin/pharmacies", component: AdminLayout, beforeLoad: guard },
      { path: "/pharmacy" },
      { path: "/login" },
    ],
    path
  )
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
})
afterEach(() => vi.restoreAllMocks())

describe("AdminLayout", () => {
  it("shows every admin section", async () => {
    renderAt("/admin")
    expect(
      await screen.findByRole("heading", { level: 1, name: "Administration" })
    ).toBeVisible()
    const nav = screen.getByRole("navigation", { name: "Admin sections" })
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")])
    ).toEqual([
      ["Dashboard", "/admin"],
      ["Pharmacies", "/admin/pharmacies"],
      ["Users", "/admin/users"],
      ["Catalog", "/admin/catalog"],
      ["Suggestions", "/admin/suggestions"],
      ["Settings", "/admin/settings"],
    ])
  })

  it("marks only the current section, filters included", async () => {
    renderAt("/admin/pharmacies?status=VERIFIED")
    const nav = await screen.findByRole("navigation", {
      name: "Admin sections",
    })
    await waitFor(() =>
      expect(
        within(nav).getByRole("link", { name: "Pharmacies" })
      ).toHaveAttribute("aria-current", "page")
    )
    expect(
      within(nav).getByRole("link", { name: "Dashboard" })
    ).not.toHaveAttribute("aria-current")
  })

  it("scrolls the current section into view on phones", async () => {
    const scrolled: Array<string | null> = []
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (
      this: Element
    ) {
      scrolled.push(this.textContent)
    })
    renderAt("/admin/pharmacies")
    await waitFor(() => expect(scrolled).toContain("Pharmacies"))
  })

  it("sends a pharmacy owner to their own home", async () => {
    useSessionStore
      .getState()
      .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
    const { router } = renderAt("/admin")
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/pharmacy")
    )
    expect(
      screen.queryByRole("navigation", { name: "Admin sections" })
    ).toBeNull()
  })

  it("sends a signed-out visitor to sign in", async () => {
    useSessionStore.getState().clear()
    const { router } = renderAt("/admin/pharmacies")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })
})
