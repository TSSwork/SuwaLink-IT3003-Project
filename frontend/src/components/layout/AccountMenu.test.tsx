import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { AccountMenu } from "@/components/layout/AccountMenu"
import { useCartStore } from "@/stores/cartStore"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

function renderMenu() {
  const root = createRootRoute({ component: AccountMenu })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => useSessionStore.getState().clear())

describe("AccountMenu", () => {
  it("offers sign in when signed out", async () => {
    renderMenu()
    expect(
      await screen.findByRole("link", { name: "Sign in" })
    ).toHaveAttribute("href", "/login")
  })

  it("shows the name, role home and sign out when signed in; sign out clears the session", async () => {
    useSessionStore
      .getState()
      .setSession("t", { id: "1", name: "Kamal Silva", role: "PHARMACY_OWNER" })
    const user = userEvent.setup()
    renderMenu()
    await user.click(
      await screen.findByRole("button", {
        name: /Account menu for Kamal Silva/,
      })
    )
    expect(await screen.findByText("Kamal Silva")).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/pharmacy"
    )
    useCartStore.getState().add({
      inventoryItemId: "inv1",
      pharmacyId: "p1",
      pharmacyName: "City Pharmacy",
      medicineId: "m1",
      medicineName: "Panadol",
      strength: "500 mg",
      unitPrice: 12.5,
      quantity: 1,
      maxQuantity: 10,
      requiresPrescription: false,
    })
    useLocationStore.getState().setPoint(6.9, 79.86, "device")
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(useSessionStore.getState().user).toBeNull()
    expect(useCartStore.getState().lines).toEqual([])
    expect(useLocationStore.getState().mode).toBe("none")
  })
})
