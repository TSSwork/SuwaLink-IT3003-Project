import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PharmacyLayout } from "@/features/pharmacy-owner/PharmacyLayout"
import { Route as PharmacyRoute } from "@/routes/pharmacy/route"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { pharmacyProfile } from "@/test/fixtures"
import { mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

let api: ReturnType<typeof mockApi>

/** The real guard from routes/pharmacy/route.tsx. */
const guard = PharmacyRoute.options.beforeLoad as (context: {
  location: { href: string }
}) => void

function renderAt(path: string) {
  return renderRoutes(
    [
      { path: "/pharmacy", component: PharmacyLayout, beforeLoad: guard },
      {
        path: "/pharmacy/requests/$id",
        component: PharmacyLayout,
        beforeLoad: guard,
      },
      {
        path: "/pharmacy/settings",
        component: PharmacyLayout,
        beforeLoad: guard,
      },
      { path: "/" },
      { path: "/login" },
    ],
    path
  )
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
  api = mockApi({ "/pharmacies/me": () => pharmacyProfile() })
})
afterEach(() => api.restore())

describe("PharmacyLayout", () => {
  it("shows the pharmacy name and every section", async () => {
    renderAt("/pharmacy")
    expect(
      await screen.findByRole("heading", { level: 1, name: "City Pharmacy" })
    ).toBeVisible()
    const nav = screen.getByRole("navigation", { name: "Pharmacy sections" })
    const links = within(nav).getAllByRole("link")
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")])
    ).toEqual([
      ["Overview", "/pharmacy"],
      ["Requests", "/pharmacy/requests"],
      ["Reservations", "/pharmacy/reservations"],
      ["Scan", "/pharmacy/scan"],
      ["Inventory", "/pharmacy/inventory"],
      ["Suggest medicine", "/pharmacy/suggest-medicine"],
      ["Settings", "/pharmacy/settings"],
    ])
  })

  it("marks only the current section", async () => {
    renderAt("/pharmacy/settings")
    const nav = await screen.findByRole("navigation", {
      name: "Pharmacy sections",
    })
    await waitFor(() =>
      expect(
        within(nav).getByRole("link", { name: "Settings" })
      ).toHaveAttribute("aria-current", "page")
    )
    // Overview is /pharmacy itself, so it must not match every sub-page.
    expect(
      within(nav).getByRole("link", { name: "Overview" })
    ).not.toHaveAttribute("aria-current")
  })

  it("scrolls the current section into view on phones", async () => {
    const scrolled: Array<string | null> = []
    const spy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(function (this: Element) {
        scrolled.push(this.textContent)
      })
    renderAt("/pharmacy/settings")
    await waitFor(() => expect(scrolled).toContain("Settings"))
    spy.mockRestore()
  })

  it("keeps Requests marked on a request's own page", async () => {
    renderAt("/pharmacy/requests/rx1")
    const nav = await screen.findByRole("navigation", {
      name: "Pharmacy sections",
    })
    await waitFor(() =>
      expect(
        within(nav).getByRole("link", { name: "Requests" })
      ).toHaveAttribute("aria-current", "page")
    )
  })

  it("sends a customer to their own home", async () => {
    useSessionStore
      .getState()
      .setSession("t", { id: "c1", name: "Nimal", role: "CUSTOMER" })
    const { router } = renderAt("/pharmacy/settings")
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    expect(
      screen.queryByRole("navigation", { name: "Pharmacy sections" })
    ).toBeNull()
  })

  it("sends a signed-out visitor to sign in", async () => {
    useSessionStore.getState().clear()
    const { router } = renderAt("/pharmacy")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })
})
