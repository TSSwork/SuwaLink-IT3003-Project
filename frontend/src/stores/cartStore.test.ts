import { waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { signOut } from "@/lib/signOut"
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

const signIn = (id: string) =>
  useSessionStore
    .getState()
    .setSession(`t-${id}`, { id, name: id, role: "CUSTOMER" })

/** What a 401 does: the session ends without an explicit sign-out. */
const expire = () => useSessionStore.getState().clear()

beforeEach(() => {
  useSessionStore.getState().clear()
  cart().reset()
  localStorage.clear()
})

describe("cartStore", () => {
  it("adds a new line", () => {
    expect(cart().add(line({ quantity: 2 }))).toBe("added")
    expect(cart().lines).toEqual([line({ quantity: 2 })])
  })

  it("merges the same item and quote, keeping the newest price and limit", () => {
    cart().add(line({ quantity: 2 }))
    expect(
      cart().add(line({ quantity: 3, unitPrice: 13, maxQuantity: 8 }))
    ).toBe("merged")
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
    ).toBe("replaced")
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

  it("says when a regular offer replaces a quoted line", () => {
    cart().add(line({ prescriptionResponseItemId: "q1", maxQuantity: 2 }))
    expect(cart().add(line({ quantity: 3 }))).toBe("replaced")
    expect(cart().lines).toEqual([line({ quantity: 3 })])
  })

  it("caps a quoted line at the quoted quantity", () => {
    cart().add(
      line({ quantity: 1, maxQuantity: 3, prescriptionResponseItemId: "q1" })
    )
    expect(
      cart().add(
        line({ quantity: 5, maxQuantity: 3, prescriptionResponseItemId: "q1" })
      )
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
    cart().add(
      line({ inventoryItemId: "a", pharmacyId: "p2", pharmacyName: "Two" })
    )
    cart().add(
      line({ inventoryItemId: "b", pharmacyId: "p1", pharmacyName: "One" })
    )
    cart().add(
      line({ inventoryItemId: "c", pharmacyId: "p2", pharmacyName: "Two" })
    )
    const groups = cart().groups()
    expect(
      groups.map((g) => [
        g.pharmacyId,
        g.pharmacyName,
        g.lines.map((l) => l.inventoryItemId),
      ])
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
    expect(
      cart().add(line({ inventoryItemId: "other", pharmacyId: "p2" }))
    ).toBe("added")
    expect(cart().add(line({ inventoryItemId: "inv0" }))).toBe("merged")
  })

  it("persists under suwalink.cart", () => {
    cart().add(line())
    const stored = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY) ?? "{}"
    ) as {
      state: { lines: Array<CartLine> }
    }
    expect(CART_STORAGE_KEY).toBe("suwalink.cart")
    expect(stored.state.lines).toEqual([line()])
  })

  it("keeps a visitor's cart when they sign in", () => {
    cart().add(line())
    useSessionStore
      .getState()
      .setSession("t1", { id: "u1", name: "A", role: "CUSTOMER" })
    expect(cart().lines).toHaveLength(1)
    expect(cart().ownerId).toBe("u1")
  })

  it("clears the signed-in user's cart on an explicit sign-out, so the next visitor never sees it", () => {
    signIn("u1")
    cart().add(line())
    signOut()
    expect(cart().lines).toEqual([])
    expect(cart().ownerId).toBeNull()
    // Nothing comes back when the same person signs in again.
    signIn("u1")
    expect(cart().lines).toEqual([])
  })

  it("keeps a visitor's cart built after a sign-out when someone else signs in", () => {
    signIn("u1")
    cart().add(line())
    signOut()

    cart().add(line({ inventoryItemId: "visitor" }))
    signIn("u2")
    expect(cart().lines.map((l) => l.inventoryItemId)).toEqual(["visitor"])
    expect(cart().ownerId).toBe("u2")
  })

  describe("when the session expires", () => {
    it("hides the cart from a visitor", () => {
      signIn("u1")
      cart().add(line())
      expire()
      expect(cart().lines).toEqual([])
      expect(cart().groups()).toEqual([])
      expect(cart().ownerId).toBeNull()
    })

    it("gives the cart back when the same person signs in again", () => {
      signIn("u1")
      cart().add(line())
      expire()
      signIn("u1")
      expect(cart().lines).toEqual([line()])
      expect(cart().ownerId).toBe("u1")
    })

    it("adds what was put in the cart meanwhile to the owner's cart", () => {
      signIn("u1")
      cart().add(line())
      expire()
      cart().add(line({ inventoryItemId: "meanwhile" }))
      signIn("u1")
      expect(cart().lines.map((l) => l.inventoryItemId)).toEqual([
        "inv1",
        "meanwhile",
      ])
    })

    it("drops the cart when someone else signs in", () => {
      signIn("u1")
      cart().add(line())
      expire()
      signIn("u2")
      expect(cart().lines).toEqual([])
      expect(cart().ownerId).toBe("u2")
      expire()
      signIn("u1")
      expect(cart().lines).toEqual([])
    })

    it("keeps the cart in storage across a reload while nobody is signed in", async () => {
      signIn("u1")
      cart().add(line())
      expire()
      await useCartStore.persist.rehydrate()
      expect(cart().lines).toEqual([])
      signIn("u1")
      expect(cart().lines).toEqual([line()])
    })
  })

  it("hides a stored cart whose owner is not signed in, and gives it back to them", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { lines: [line()], ownerId: "u1" }, version: 0 })
    )
    await useCartStore.persist.rehydrate()
    expect(cart().lines).toEqual([])
    expect(cart().ownerId).toBeNull()
    signIn("u1")
    expect(cart().lines).toEqual([line()])
  })

  it("drops a stored cart owned by someone other than the one signed in", async () => {
    signIn("u2")
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { lines: [line()], ownerId: "u1" }, version: 0 })
    )
    await useCartStore.persist.rehydrate()
    expect(cart().lines).toEqual([])
    expect(cart().ownerId).toBe("u2")
  })

  it("keeps a stored cart for its signed-in owner", async () => {
    signIn("u1")
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { lines: [line()], ownerId: "u1" }, version: 0 })
    )
    await useCartStore.persist.rehydrate()
    expect(cart().lines).toEqual([line()])
  })

  it("follows a change made in another tab", async () => {
    signIn("u1")
    cart().add(line())
    const other = JSON.stringify({
      state: {
        lines: [line(), line({ inventoryItemId: "tab2" })],
        ownerId: "u1",
        held: null,
      },
      version: 0,
    })
    localStorage.setItem(CART_STORAGE_KEY, other)
    window.dispatchEvent(
      new StorageEvent("storage", { key: CART_STORAGE_KEY, newValue: other })
    )
    await waitFor(() =>
      expect(cart().lines.map((l) => l.inventoryItemId)).toEqual([
        "inv1",
        "tab2",
      ])
    )
  })

  it("ignores other keys changing in another tab", async () => {
    cart().add(line())
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { lines: [], ownerId: null }, version: 0 })
    )
    window.dispatchEvent(
      new StorageEvent("storage", { key: "suwalink.lang", newValue: "x" })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(cart().lines).toEqual([line()])
  })

  it("drops malformed lines from storage", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [line(), { inventoryItemId: "x" }, "junk"],
          ownerId: null,
        },
        version: 0,
      })
    )
    await useCartStore.persist.rehydrate()
    expect(cart().lines).toEqual([line()])
  })
})
