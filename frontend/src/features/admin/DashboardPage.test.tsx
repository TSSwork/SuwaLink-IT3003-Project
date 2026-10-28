import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { AdminDashboard } from "@/api/types"
import { DashboardPage } from "@/features/admin/DashboardPage"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { catalogMedicine } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

let api: ReturnType<typeof mockApi>
let dashboardFails: boolean

const stats: AdminDashboard = {
  totalCustomers: 120,
  totalPharmacies: 14,
  verifiedPharmacies: 9,
  pendingPharmacies: 3,
  rejectedPharmacies: 2,
}

function renderDashboard() {
  return renderRoutes(
    [
      { path: "/admin", component: DashboardPage },
      { path: "/admin/pharmacies" },
      { path: "/admin/suggestions" },
      { path: "/admin/users" },
    ],
    "/admin"
  )
}

/** The stat card whose label is `label`, found by its link. */
function card(label: string) {
  return screen.getByRole("link", { name: new RegExp(label) })
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
  dashboardFails = false
  api = mockApi({
    "/admin/dashboard": () => {
      if (dashboardFails) throw fail(500, "INTERNAL_ERROR")
      return stats
    },
    "/admin/medicines/suggestions": () => [
      catalogMedicine({ id: "s1", status: "PENDING" }),
      catalogMedicine({ id: "s2", status: "PENDING" }),
    ],
  })
})
afterEach(() => api.restore())

describe("admin DashboardPage", () => {
  it("shows every count from the dashboard", async () => {
    renderDashboard()
    await waitFor(() => expect(card("Customers")).toHaveTextContent("120"))
    expect(card("All pharmacies")).toHaveTextContent("14")
    expect(card("Verified")).toHaveTextContent("9")
    expect(card("Waiting for approval")).toHaveTextContent("3")
    expect(card("Rejected")).toHaveTextContent("2")
  })

  it("links each pharmacy count to its filtered list", async () => {
    renderDashboard()
    await waitFor(() => expect(card("Customers")).toHaveTextContent("120"))
    expect(card("Waiting for approval")).toHaveAttribute(
      "href",
      "/admin/pharmacies?status=PENDING"
    )
    expect(card("Verified")).toHaveAttribute(
      "href",
      "/admin/pharmacies?status=VERIFIED"
    )
    expect(card("Rejected")).toHaveAttribute(
      "href",
      "/admin/pharmacies?status=REJECTED"
    )
    expect(card("All pharmacies")).toHaveAttribute(
      "href",
      "/admin/pharmacies?status=ALL"
    )
    expect(card("Customers")).toHaveAttribute("href", "/admin/users")
  })

  it("counts the medicine suggestions waiting for review", async () => {
    renderDashboard()
    const suggestions = await screen.findByRole("link", {
      name: /Medicine suggestions to review/,
    })
    await waitFor(() => expect(suggestions).toHaveTextContent("2"))
    expect(suggestions).toHaveAttribute("href", "/admin/suggestions")
    expect(api.callsTo("/admin/medicines/suggestions")[0].params).toEqual({
      status: "PENDING",
    })
  })

  it("explains a failed load and retries", async () => {
    dashboardFails = true
    renderDashboard()
    expect(
      await screen.findByText("Could not load the dashboard")
    ).toBeVisible()
    dashboardFails = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(card("Customers")).toHaveTextContent("120"))
  })
})
