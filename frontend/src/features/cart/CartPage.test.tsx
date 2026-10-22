import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CartLine } from "@/stores/cartStore"
import { CartPage } from "@/features/cart/CartPage"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"
import { reservation } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>

function line(over: Partial<CartLine> = {}): CartLine {
  return {
    inventoryItemId: "inv1",
    pharmacyId: "p1",
    pharmacyName: "City Pharmacy",
    medicineId: "m1",
    medicineName: "Panadol",
    strength: "500 mg",
    unitPrice: 12.5,
    quantity: 2,
    maxQuantity: 40,
    requiresPrescription: false,
    ...over,
  }
}

const PANADOL = line()
const PIRITON = line({
  inventoryItemId: "inv2",
  medicineId: "m3",
  medicineName: "Piriton",
  strength: "4 mg",
  unitPrice: 8,
  quantity: 5,
})
const AMOXIL = line({
  inventoryItemId: "inv3",
  pharmacyId: "p2",
  pharmacyName: "Lanka Medicals",
  medicineId: "m2",
  medicineName: "Amoxil",
  strength: "250 mg",
  unitPrice: 45,
  quantity: 1,
  maxQuantity: 21,
  requiresPrescription: true,
  prescriptionResponseItemId: "ri1",
  prescriptionRequestId: "rx1",
})

function fill(...lines: Array<CartLine>) {
  useCartStore.setState({ lines })
}

function signIn(role: "CUSTOMER" | "PHARMACY_OWNER" = "CUSTOMER") {
  useSessionStore.getState().setSession("t", { id: "u1", name: "Nimal", role })
}

async function renderCart() {
  const view = renderRoutes(
    [
      { path: "/cart", component: CartPage },
      { path: "/login" },
      { path: "/search" },
      { path: "/pharmacies/$id" },
      { path: "/medicines/$id" },
      { path: "/reservations/$id" },
      { path: "/reservations" },
    ],
    "/cart"
  )
  await screen.findByRole("heading", { level: 1, name: "Your cart" })
  return view
}

const group = (name: string) => screen.getByRole("region", { name })

beforeEach(() => {
  useSessionStore.getState().clear()
  useCartStore.getState().clear()
  api = mockApi({})
})
afterEach(() => api.restore())

describe("CartPage", () => {
  it("explains an empty cart", async () => {
    await renderCart()
    expect(screen.getByText("Your cart is empty")).toBeVisible()
    expect(screen.getByRole("link", { name: "Find medicine" })).toHaveAttribute(
      "href",
      "/search"
    )
  })

  it("groups lines by pharmacy with subtotals and a grand total", async () => {
    fill(PANADOL, AMOXIL, PIRITON)
    await renderCart()
    const city = group("City Pharmacy")
    expect(
      within(city).getByRole("link", { name: "City Pharmacy" })
    ).toHaveAttribute("href", "/pharmacies/p1")
    expect(within(city).getAllByRole("listitem")).toHaveLength(2)
    expect(within(city).getByText(/Subtotal/).parentElement).toHaveTextContent(
      /65\.00/
    )
    const lanka = group("Lanka Medicals")
    expect(within(lanka).getByText(/Subtotal/).parentElement).toHaveTextContent(
      /45\.00/
    )
    expect(screen.getByText("Total").parentElement).toHaveTextContent(/110\.00/)
    expect(screen.getByText("2 reservations, one per pharmacy")).toBeVisible()
  })

  it("marks quoted lines and tells the customer to bring a prescription", async () => {
    fill(PANADOL, AMOXIL)
    await renderCart()
    expect(
      within(group("Lanka Medicals")).getByText("Quoted price")
    ).toBeVisible()
    expect(
      within(group("Lanka Medicals")).getByText(
        "Bring your prescription when you collect"
      )
    ).toBeVisible()
    expect(
      within(group("City Pharmacy")).queryByText(
        "Bring your prescription when you collect"
      )
    ).toBeNull()
  })

  it("changes quantities within the limit and removes lines", async () => {
    fill(PANADOL, PIRITON)
    await renderCart()
    const panadol = within(group("City Pharmacy")).getAllByRole("listitem")[0]
    await userEvent.click(
      within(panadol).getByRole("button", { name: "Increase quantity" })
    )
    expect(useCartStore.getState().lines[0].quantity).toBe(3)
    await userEvent.click(
      within(panadol).getByRole("button", { name: "Remove Panadol" })
    )
    expect(useCartStore.getState().lines.map((l) => l.medicineName)).toEqual([
      "Piriton",
    ])
  })

  it("sends signed-out visitors to sign in and back", async () => {
    fill(PANADOL)
    await renderCart()
    expect(
      screen.getByRole("link", { name: "Sign in to reserve" })
    ).toHaveAttribute("href", "/login?redirect=%2Fcart")
    expect(screen.queryByRole("button", { name: /^Reserve/ })).toBeNull()
  })

  it("explains that pharmacy accounts cannot reserve", async () => {
    signIn("PHARMACY_OWNER")
    fill(PANADOL)
    await renderCart()
    expect(
      screen.getByText("Only customer accounts can reserve medicines.")
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: /^Reserve/ })).toBeNull()
  })

  it("explains the hold before reserving", async () => {
    signIn()
    fill(PANADOL)
    await renderCart()
    expect(
      screen.getByText(/The pharmacy holds your medicines for 24 hours/)
    ).toBeVisible()
  })

  it("reserves each pharmacy separately and keeps a failed one in the cart", async () => {
    signIn()
    fill(PANADOL, AMOXIL, PIRITON)
    api.restore()
    api = mockApi({
      "/reservations": ({ data }) => {
        const body = data as { lines: Array<{ inventoryItemId: string }> }
        if (body.lines[0].inventoryItemId === "inv3") {
          return fail(409, "INSUFFICIENT_STOCK")
        }
        return reservation({ id: "r9", pickupCode: "K7Q2MXH4PA", total: 62.5 })
      },
    })
    await renderCart()
    await userEvent.click(screen.getByRole("button", { name: "Reserve all" }))

    const summary = await screen.findByRole("dialog", {
      name: "1 of 2 reservations made",
    })
    expect(within(summary).getByText("K7Q2MXH4PA")).toBeVisible()
    expect(
      within(summary).getByRole("link", { name: /View reservation/ })
    ).toHaveAttribute("href", "/reservations/r9")
    expect(within(summary).getByText(/Lanka Medicals/)).toBeVisible()

    expect(api.callsTo("/reservations").map((c) => c.data)).toEqual([
      {
        lines: [
          { inventoryItemId: "inv1", quantity: 2 },
          { inventoryItemId: "inv2", quantity: 5 },
        ],
      },
      {
        lines: [
          {
            inventoryItemId: "inv3",
            quantity: 1,
            prescriptionResponseItemId: "ri1",
          },
        ],
      },
    ])
    expect(useCartStore.getState().lines.map((l) => l.inventoryItemId)).toEqual(
      ["inv3"]
    )

    await userEvent.click(
      within(summary).getByRole("button", { name: "Close" })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(
      within(group("Lanka Medicals")).getByText(
        "There is not enough stock for this."
      )
    ).toBeVisible()
    expect(screen.queryByRole("region", { name: "City Pharmacy" })).toBeNull()
  })

  it("reserves one pharmacy on its own", async () => {
    signIn()
    fill(PANADOL, AMOXIL)
    api.restore()
    api = mockApi({ "/reservations": () => reservation({ id: "r9" }) })
    await renderCart()
    await userEvent.click(
      within(group("Lanka Medicals")).getByRole("button", {
        name: "Reserve at Lanka Medicals",
      })
    )
    expect(
      await screen.findByRole("dialog", { name: "Reservation made" })
    ).toBeVisible()
    expect(api.callsTo("/reservations")).toHaveLength(1)
    expect(useCartStore.getState().lines.map((l) => l.pharmacyId)).toEqual([
      "p1",
    ])
  })

  it("blocks a pharmacy with more than 20 lines before sending", async () => {
    signIn()
    fill(
      ...Array.from({ length: 21 }, (_, i) =>
        line({ inventoryItemId: `x${i}`, medicineName: `Medicine ${i}` })
      )
    )
    await renderCart()
    expect(
      within(group("City Pharmacy")).getByText(
        "A reservation can hold at most 20 different medicines from one pharmacy."
      )
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Reserve at City Pharmacy" })
    ).toBeDisabled()
  })
})
