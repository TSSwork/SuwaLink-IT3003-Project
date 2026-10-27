import { beforeEach, describe, expect, it } from "vitest"
import { signOut } from "@/lib/signOut"
import { useCartStore } from "@/stores/cartStore"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

const line = {
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
}

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  useCartStore.getState().add(line)
})

describe("signOut", () => {
  it("ends the session and forgets the cart", () => {
    signOut()
    expect(useSessionStore.getState().token).toBeNull()
    expect(useCartStore.getState().lines).toEqual([])
    expect(useCartStore.getState().ownerId).toBeNull()
  })

  it("forgets a device location so the next account starts from its district", () => {
    useLocationStore.getState().setPoint(6.9, 79.86, "device")
    signOut()
    expect(useLocationStore.getState().mode).toBe("none")
    useLocationStore.getState().defaultToDistrict("KANDY")
    expect(useLocationStore.getState().district).toBe("KANDY")
  })

  it("resets a district choice too", () => {
    useLocationStore.getState().setDistrict("GALLE")
    signOut()
    expect(useLocationStore.getState().mode).toBe("none")
  })
})
