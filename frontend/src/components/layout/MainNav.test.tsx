import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { Role } from "@/api/types"
import { MainNav } from "@/components/layout/MainNav"
import { useSessionStore } from "@/stores/sessionStore"
import { renderRoutes } from "@/test/renderRoutes"

function renderNav(path = "/") {
  return renderRoutes(
    [
      {
        path: "/",
        component: () => (
          <nav aria-label="Main">
            <MainNav />
          </nav>
        ),
      },
      {
        path: "/reservations",
        component: () => (
          <nav aria-label="Main">
            <MainNav />
          </nav>
        ),
      },
    ],
    path
  )
}

const names = () =>
  screen
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")])

function signIn(role: Role) {
  useSessionStore.getState().setSession("t", { id: "u1", name: "Nimal", role })
}

beforeEach(() => useSessionStore.getState().clear())

describe("MainNav", () => {
  it("offers visitors the medicine search", async () => {
    renderNav()
    await screen.findByRole("link", { name: "Find medicine" })
    expect(names()).toEqual([["Find medicine", "/search"]])
  })

  it("gives customers search, prescriptions, reservations and saved", async () => {
    signIn("CUSTOMER")
    renderNav()
    await screen.findByRole("link", { name: "Find medicine" })
    expect(names()).toEqual([
      ["Find medicine", "/search"],
      ["Prescriptions", "/prescriptions"],
      ["Reservations", "/reservations"],
      ["Saved", "/saved"],
    ])
  })

  it("marks the current page", async () => {
    signIn("CUSTOMER")
    renderNav("/reservations")
    expect(
      await screen.findByRole("link", { name: "Reservations" })
    ).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Saved" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("sends pharmacy owners and admins to their dashboards", async () => {
    signIn("PHARMACY_OWNER")
    const { unmount } = renderNav()
    await screen.findByRole("link", { name: "Dashboard" })
    expect(names()).toEqual([["Dashboard", "/pharmacy"]])
    unmount()
    signIn("ADMIN")
    renderNav()
    await screen.findByRole("link", { name: "Admin" })
    expect(names()).toEqual([["Admin", "/admin"]])
  })
})
