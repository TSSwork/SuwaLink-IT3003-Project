import { beforeEach, describe, expect, it } from "vitest"
import type { CartLine } from "@/stores/cartStore"
import {
  CART_LINE_LIMIT,
  CART_STORAGE_KEY,
  groupLines,
  useCartStore,
} from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"

function line(over: Partial<CartLine> = {}): CartLine {
  return {
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
    ...over,
  }
}

const cart = () => useCartStore.getState()

beforeEach(() => {
  useSessionStore.getState().clear()
  cart().clear()
  localStorage.clear()
})

describe("cartStore", () => {
  it("adds a new line", () => {
    expect(cart().add(line({ quantity: 2 }))).toBe("added")
    expect(cart().lines).toEqual([line({ quantity: 2 })])
  })

  it("merges the same item and quote, keeping the newest price and limit", () => {
    cart().add(line({ quantity: 2 }))
    expect(cart().add(line({ quantity: 3, unitPrice: 13, maxQuantity: 8 }))).toBe(
      "merged"
    )
    expect(cart().lines).toEqual([
      line({ quantity: 5, unitPrice: 13, maxQuantity: 8 }),
    ])
  })

  it("caps a merge at maxQuantity and says so", () => {
    cart().add(line({ quantity: 6 }))
    expect(cart().add(line({ quantity: 6 }))).toBe("capped")
    expect(cart().lines[0].quantity).toBe(10)
  })

  it("never holds more than 100 of a line, nor less than 1", () => {
    cart().add(line({ quantity: 500, maxQuantity: 500 }))
    expect(cart().lines[0].quantity).toBe(100)
    cart().setQuantity("inv1", 0)
    expect(cart().lines[0].quantity).toBe(1)
  })

  it("replaces the line when the same item comes with a different quote", () => {
    cart().add(line({ quantity: 4 }))
    expect(
      cart().add(
        line({
          quantity: 2,
          maxQuantity: 2,
          unitPrice: 11,
          prescriptionResponseItemId: "q1",
          prescriptionRequestId: "rx1",
        })
      )
    ).toBe("added")
    expect(cart().lines).toEqual([
      line({
        quantity: 2,
        maxQuantity: 2,
        unitPrice: 11,
        prescriptionResponseItemId: "q1",
        prescriptionRequestId: "rx1",
      }),
    ])
  })

  it("caps a quoted line at the quoted quantity", () => {
    cart().add(line({ quantity: 1, maxQuantity: 3, prescriptionResponseItemId: "q1" }))
    expect(
      cart().add(line({ quantity: 5, maxQuantity: 3, prescriptionResponseItemId: "q1" }))
    ).toBe("capped")
    expect(cart().lines[0].quantity).toBe(3)
  })

  it("sets a quantity within 1..maxQuantity", () => {
    cart().add(line())
    cart().setQuantity("inv1", 7)
    expect(cart().lines[0].quantity).toBe(7)
    cart().setQuantity("inv1", 99)
    expect(cart().lines[0].quantity).toBe(10)
  })

  it("removes a line and clears one pharmacy", () => {
    cart().add(line())
    cart().add(line({ inventoryItemId: "inv2" }))
    cart().add(line({ inventoryItemId: "inv3", pharmacyId: "p2" }))
    cart().remove("inv2")
    expect(cart().lines.map((l) => l.inventoryItemId)).toEqual(["inv1", "inv3"])
    cart().clearPharmacy("p1")
    expect(cart().lines.map((l) => l.inventoryItemId)).toEqual(["inv3"])
  })

  it("groups lines by pharmacy in the order pharmacies were added", () => {
    cart().add(line({ inventoryItemId: "a", pharmacyId: "p2", pharmacyName: "Two" }))
    cart().add(line({ inventoryItemId: "b", pharmacyId: "p1", pharmacyName: "One" }))
    cart().add(line({ inventoryItemId: "c", pharmacyId: "p2", pharmacyName: "Two" }))
    const groups = cart().groups()
    expect(
      groups.map((g) => [g.pharmacyId, g.pharmacyName, g.lines.map((l) => l.inventoryItemId)])
    ).toEqual([
      ["p2", "Two", ["a", "c"]],
      ["p1", "One", ["b"]],
    ])
    expect(groupLines(cart().lines)).toEqual(groups)
  })

  it(`refuses a new line past ${CART_LINE_LIMIT} for one pharmacy`, () => {
    for (let i = 0; i < CART_LINE_LIMIT; i++) {
      cart().add(line({ inventoryItemId: `inv${i}` }))
    }
    expect(cart().add(line({ inventoryItemId: "extra" }))).toBe("limit")
    expect(cart().lines).toHaveLength(CART_LINE_LIMIT)
    // Another pharmacy and merges into existing lines still work.
    expect(cart().add(line({ inventoryItemId: "other", pharmacyId: "p2" }))).toBe(
      "added"
    )
    expect(cart().add(line({ inventoryItemId: "inv0" }))).toBe("merged")
  })

  it("persists under suwalink.cart", () => {
    cart().add(line())
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "{}") as {
      state: { lines: Array<CartLine> }
    }
    expect(CART_STORAGE_KEY).toBe("suwalink.cart")
    expect(stored.state.lines).toEqual([line()])
  })

  it("keeps a visitor's cart when they sign in, and clears it for a different user", () => {
    cart().add(line())
    useSessionStore.getState().setSession("t1", { id: "u1", name: "A", role: "CUSTOMER" })
    expect(cart().lines).toHaveLength(1)

    useSessionStore.getState().clear()
    expect(cart().lines).toHaveLength(1)
    useSessionStore.getState().setSession("t1", { id: "u1", name: "A", role: "CUSTOMER" })
    expect(cart().lines).toHaveLength(1)

    useSessionStore.getState().clear()
    useSessionStore.getState().setSession("t2", { id: "u2", name: "B", role: "CUSTOMER" })
    expect(cart().lines).toEqual([])
  })

  it("drops malformed lines from storage", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: { lines: [line(), { inventoryItemId: "x" }, "junk"], ownerId: null },
        version: 0,
      })
    )
    await useCartStore.persist.rehydrate()
    expect(cart().lines).toEqual([line()])
  })
})
