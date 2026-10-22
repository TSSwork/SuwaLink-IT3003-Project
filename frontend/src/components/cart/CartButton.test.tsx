import { act, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { CartButton } from "@/components/cart/CartButton"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"
import { renderRoutes } from "@/test/renderRoutes"

const line = (id: string) => ({
  inventoryItemId: id,
  pharmacyId: "p1",
  pharmacyName: "City Pharmacy",
  medicineId: "m1",
  medicineName: "Panadol",
  strength: "500 mg",
  unitPrice: 12.5,
  quantity: 1,
  maxQuantity: 5,
  requiresPrescription: false,
})

function renderButton() {
  return renderRoutes(
    [{ path: "/", component: CartButton }, { path: "/cart" }],
    "/"
  )
}

beforeEach(() => {
  useSessionStore.getState().clear()
  useCartStore.getState().clear()
})

describe("CartButton", () => {
  it("links to the cart and counts its lines", async () => {
    renderButton()
    const link = await screen.findByRole("link", { name: "Cart, empty" })
    expect(link).toHaveAttribute("href", "/cart")
    act(() => {
      useCartStore.setState({ lines: [line("a"), line("b")] })
    })
    expect(screen.getByRole("link", { name: "Cart, 2 items" })).toBeVisible()
    expect(screen.getByText("2")).toBeVisible()
  })

  it("caps the badge at 99+", async () => {
    useCartStore.setState({
      lines: Array.from({ length: 120 }, (_, i) => line(`x${i}`)),
    })
    renderButton()
    expect(await screen.findByText("99+")).toBeVisible()
  })

  it("is hidden from pharmacy owners and admins", async () => {
    useSessionStore
      .getState()
      .setSession("t", { id: "o1", name: "Owner", role: "PHARMACY_OWNER" })
    renderButton()
    await screen.findByText((_, el) => el?.tagName === "BODY")
    expect(screen.queryByRole("link", { name: /Cart/ })).toBeNull()
  })
})
