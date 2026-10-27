import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddToCartButton } from "@/components/cart/AddToCartButton"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

const item = {
  inventoryItemId: "inv1",
  pharmacyId: "p1",
  pharmacyName: "City Pharmacy",
  medicineId: "m1",
  medicineName: "Panadol",
  strength: "500 mg",
  unitPrice: 12.5,
  requiresPrescription: false,
}

function renderButton(stock: number) {
  return render(<AddToCartButton item={item} stock={stock} />)
}

beforeEach(() => {
  useSessionStore.getState().clear()
  useCartStore.getState().clear()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.info).mockClear()
  vi.mocked(toast.error).mockClear()
  vi.mocked(toast.warning).mockClear()
})

describe("AddToCartButton", () => {
  it("adds the chosen quantity at the shown price", async () => {
    renderButton(40)
    await userEvent.click(
      screen.getByRole("button", { name: "Increase quantity" })
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Increase quantity" })
    )
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(3)
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(useCartStore.getState().lines).toEqual([
      { ...item, quantity: 3, maxQuantity: 40 },
    ])
    expect(toast.success).toHaveBeenCalledWith("Added to cart")
    expect(screen.getByText("3 in your cart")).toBeVisible()
  })

  it("keeps the quantity between 1 and the stock shown", async () => {
    renderButton(2)
    const minus = screen.getByRole("button", { name: "Decrease quantity" })
    const plus = screen.getByRole("button", { name: "Increase quantity" })
    expect(minus).toBeDisabled()
    await userEvent.click(plus)
    expect(plus).toBeDisabled()
    const input = screen.getByRole("spinbutton", { name: "Quantity" })
    await userEvent.clear(input)
    await userEvent.type(input, "9")
    await userEvent.tab()
    expect(input).toHaveValue(2)
  })

  it("never offers more than 100", async () => {
    renderButton(500)
    const input = screen.getByRole("spinbutton", { name: "Quantity" })
    await userEvent.clear(input)
    await userEvent.type(input, "250")
    await userEvent.tab()
    expect(input).toHaveValue(100)
  })

  it("merges into the cart line and caps at the stock", async () => {
    renderButton(5)
    const input = screen.getByRole("spinbutton", { name: "Quantity" })
    await userEvent.clear(input)
    await userEvent.type(input, "4")
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(useCartStore.getState().lines).toHaveLength(1)
    expect(useCartStore.getState().lines[0].quantity).toBe(5)
    expect(toast.info).toHaveBeenCalledWith(
      "Only 5 can be reserved. Your cart now has 5."
    )
  })

  it("says when the pharmacy's 20-item limit is reached", async () => {
    for (let i = 0; i < 20; i++) {
      useCartStore
        .getState()
        .add({ ...item, inventoryItemId: `x${i}`, quantity: 1, maxQuantity: 5 })
    }
    renderButton(5)
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(toast.error).toHaveBeenCalledWith(
      "A reservation can hold at most 20 different medicines from one pharmacy."
    )
  })

  it("warns when the offer replaces a quoted line for the same item", async () => {
    useCartStore.getState().add({
      ...item,
      unitPrice: 11,
      quantity: 2,
      maxQuantity: 2,
      prescriptionResponseItemId: "q1",
      prescriptionRequestId: "rx1",
    })
    renderButton(5)
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(useCartStore.getState().lines).toEqual([
      { ...item, quantity: 1, maxQuantity: 5 },
    ])
    expect(toast.warning).toHaveBeenCalledWith(
      "This medicine was already in your cart at another price, so that line was replaced."
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("shows out of stock instead of the stepper", () => {
    renderButton(0)
    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull()
    expect(screen.getByText("Out of stock")).toBeVisible()
  })

  it("is hidden from pharmacy owners and admins", () => {
    useSessionStore
      .getState()
      .setSession("t", { id: "o1", name: "Owner", role: "PHARMACY_OWNER" })
    const { container } = renderButton(5)
    expect(container).toBeEmptyDOMElement()
  })
})
