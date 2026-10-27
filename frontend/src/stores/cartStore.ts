import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { useSessionStore } from "@/stores/sessionStore"

/** localStorage key for the cart (spec §5: the cart lives in the browser). */
export const CART_STORAGE_KEY = "suwalink.cart"

/** Backend §9.5: one reservation holds at most 20 lines. */
export const CART_LINE_LIMIT = 20

/** Backend §9.5: quantity per line is 1–100. */
export const MAX_LINE_QUANTITY = 100

export interface CartLine {
  inventoryItemId: string
  pharmacyId: string
  pharmacyName: string
  medicineId: string
  medicineName: string
  strength: string
  /** The offer (or quoted) price when added; checkout refreshes it from the server. */
  unitPrice: number
  quantity: number
  /** The stock shown, or the quoted quantity for a quoted line. */
  maxQuantity: number
  requiresPrescription: boolean
  /** Set for a line taken from a pharmacy's reply to a prescription. */
  prescriptionResponseItemId?: string
  prescriptionRequestId?: string
}

export interface CartGroup {
  pharmacyId: string
  pharmacyName: string
  lines: Array<CartLine>
}

/** What `add` did: a new line, more of an existing one, more but cut to the limit, or refused (20 lines). */
export type AddResult = "added" | "merged" | "capped" | "limit"

interface CartState {
  lines: Array<CartLine>
  /** The signed-in user the cart belongs to; null while built by a visitor. */
  ownerId: string | null
  /**
   * Adds a line. The same item with the same quote merges (newest price and
   * limit win); the same item with a different quote replaces it, so an
   * inventory item is in the cart at most once.
   */
  add: (line: CartLine) => AddResult
  setQuantity: (inventoryItemId: string, quantity: number) => void
  remove: (inventoryItemId: string) => void
  clearPharmacy: (pharmacyId: string) => void
  clear: () => void
  /** Lines grouped by pharmacy; a new array on every call, so memoise in components. */
  groups: () => Array<CartGroup>
}

/** 1..min(maxQuantity, 100); a fraction rounds down. */
function clampQuantity(quantity: number, maxQuantity: number): number {
  const max = Math.max(1, Math.min(maxQuantity, MAX_LINE_QUANTITY))
  return Math.min(Math.max(1, Math.floor(quantity) || 1), max)
}

/** Groups lines by pharmacy, pharmacies in the order they were first added. */
export function groupLines(lines: Array<CartLine>): Array<CartGroup> {
  const groups = new Map<string, CartGroup>()
  for (const line of lines) {
    const group = groups.get(line.pharmacyId)
    if (group) group.lines.push(line)
    else
      groups.set(line.pharmacyId, {
        pharmacyId: line.pharmacyId,
        pharmacyName: line.pharmacyName,
        lines: [line],
      })
  }
  return [...groups.values()]
}

function isCartLine(value: unknown): value is CartLine {
  const line = value as Partial<CartLine> | null
  return (
    typeof line === "object" &&
    line !== null &&
    typeof line.inventoryItemId === "string" &&
    typeof line.pharmacyId === "string" &&
    typeof line.pharmacyName === "string" &&
    typeof line.medicineId === "string" &&
    typeof line.medicineName === "string" &&
    typeof line.strength === "string" &&
    typeof line.unitPrice === "number" &&
    typeof line.quantity === "number" &&
    typeof line.maxQuantity === "number" &&
    typeof line.requiresPrescription === "boolean"
  )
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      ownerId: null,
      add: (line) => {
        const { lines } = get()
        const existing = lines.find(
          (l) => l.inventoryItemId === line.inventoryItemId
        )
        const sameQuote =
          existing?.prescriptionResponseItemId ===
          line.prescriptionResponseItemId
        if (existing && sameQuote) {
          const wanted = existing.quantity + line.quantity
          const quantity = clampQuantity(wanted, line.maxQuantity)
          set({
            lines: lines.map((l) =>
              l === existing ? { ...existing, ...line, quantity } : l
            ),
          })
          return quantity < wanted ? "capped" : "merged"
        }
        const quantity = clampQuantity(line.quantity, line.maxQuantity)
        if (existing) {
          set({
            lines: lines.map((l) =>
              l === existing ? { ...line, quantity } : l
            ),
          })
          return "added"
        }
        const inPharmacy = lines.filter(
          (l) => l.pharmacyId === line.pharmacyId
        ).length
        if (inPharmacy >= CART_LINE_LIMIT) return "limit"
        set({ lines: [...lines, { ...line, quantity }] })
        return "added"
      },
      setQuantity: (inventoryItemId, quantity) =>
        set({
          lines: get().lines.map((l) =>
            l.inventoryItemId === inventoryItemId
              ? { ...l, quantity: clampQuantity(quantity, l.maxQuantity) }
              : l
          ),
        }),
      remove: (inventoryItemId) =>
        set({
          lines: get().lines.filter(
            (l) => l.inventoryItemId !== inventoryItemId
          ),
        }),
      clearPharmacy: (pharmacyId) =>
        set({ lines: get().lines.filter((l) => l.pharmacyId !== pharmacyId) }),
      clear: () =>
        set({
          lines: [],
          ownerId: useSessionStore.getState().user?.id ?? null,
        }),
      groups: () => groupLines(get().lines),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lines, ownerId }) => ({ lines, ownerId }),
      // A tampered entry keeps only well-formed lines; a cart whose owner is
      // not the one signed in now is dropped (see syncOwner).
      merge: (persisted, current) => {
        const stored = persisted as
          Partial<Pick<CartState, "lines" | "ownerId">> | undefined
        const ownerId =
          typeof stored?.ownerId === "string" ? stored.ownerId : null
        const userId = useSessionStore.getState().user?.id ?? null
        if (ownerId !== null && ownerId !== userId) {
          return { ...current, lines: [], ownerId: userId }
        }
        return {
          ...current,
          lines: Array.isArray(stored?.lines)
            ? stored.lines.filter(isCartLine)
            : [],
          ownerId,
        }
      },
    }
  )
)

/**
 * A visitor's cart passes to whoever signs in. Signing out clears the
 * signed-in user's cart and makes the cart a visitor's again, so the next
 * person on this browser never sees it and their own cart is not wiped by a
 * stale owner. A cart owned by someone else is cleared on sign-in.
 */
function syncOwner(userId: string | undefined): void {
  const { ownerId } = useCartStore.getState()
  if (!userId) {
    if (ownerId !== null) useCartStore.setState({ lines: [], ownerId: null })
    return
  }
  if (ownerId === userId) return
  useCartStore.setState(
    ownerId === null ? { ownerId: userId } : { lines: [], ownerId: userId }
  )
}

syncOwner(useSessionStore.getState().user?.id)
useSessionStore.subscribe((state) => syncOwner(state.user?.id))
