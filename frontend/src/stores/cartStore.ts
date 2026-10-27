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

/**
 * What `add` did: a new line, more of an existing one, more but cut to the
 * limit, a line for the same item at another price (offer vs quote) replaced,
 * or refused (20 lines).
 */
export type AddResult = "added" | "merged" | "capped" | "replaced" | "limit"

/** The cart of a session that expired, kept aside until its owner returns. */
export interface HeldCart {
  ownerId: string
  lines: Array<CartLine>
}

interface CartState {
  lines: Array<CartLine>
  /** The signed-in user the cart belongs to; null while built by a visitor. */
  ownerId: string | null
  /**
   * An expired session's cart: never shown or used while nobody is signed
   * in, given back if its owner signs in again, dropped for anyone else.
   */
  held: HeldCart | null
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
  /** Forgets everything, held cart included (explicit sign-out, account deleted). */
  reset: () => void
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

type StoredCart = Pick<CartState, "lines" | "ownerId" | "held">

function validLines(value: unknown): Array<CartLine> {
  return Array.isArray(value) ? value.filter(isCartLine) : []
}

function validHeld(value: unknown): HeldCart | null {
  const held = value as Partial<HeldCart> | null | undefined
  return typeof held?.ownerId === "string"
    ? { ownerId: held.ownerId, lines: validLines(held.lines) }
    : null
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      ownerId: null,
      held: null,
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
          return "replaced"
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
      reset: () => set({ lines: [], ownerId: null, held: null }),
      groups: () => groupLines(get().lines),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lines, ownerId, held }) => ({ lines, ownerId, held }),
      // A tampered entry keeps only well-formed lines; then the same owner
      // rule as a sign-in or expiry applies (see reconcile).
      merge: (persisted, current) => {
        const stored = persisted as Partial<StoredCart> | undefined
        return {
          ...current,
          ...reconcile(
            {
              lines: validLines(stored?.lines),
              ownerId:
                typeof stored?.ownerId === "string" ? stored.ownerId : null,
              held: validHeld(stored?.held),
            },
            useSessionStore.getState().user?.id ?? null
          ),
        }
      },
    }
  )
)

/**
 * Who may see the cart, for the user signed in now (null: nobody).
 *
 * - A visitor's cart passes to whoever signs in.
 * - When a session ends without an explicit sign-out (it expired), its cart
 *   is held aside: the visitor never sees or changes it, its owner gets it
 *   back on signing in again (with anything added meanwhile), and anyone
 *   else signing in drops it.
 * - A cart owned by someone other than the user signed in is dropped.
 *
 * An explicit sign-out resets the cart first (see lib/signOut), so nothing
 * is held then.
 */
function reconcile(cart: StoredCart, userId: string | null): StoredCart {
  const { lines, ownerId, held } = cart
  if (userId === null) {
    if (ownerId === null) return cart
    return { lines: [], ownerId: null, held: { ownerId, lines } }
  }
  if (ownerId === userId) return { lines, ownerId, held: null }
  if (ownerId !== null) return { lines: [], ownerId: userId, held: null }
  const restored = held?.ownerId === userId ? combine(held.lines, lines) : lines
  return { lines: restored, ownerId: userId, held: null }
}

/** The owner's lines, then the visitor's for other items while the pharmacy has room. */
function combine(
  own: Array<CartLine>,
  added: Array<CartLine>
): Array<CartLine> {
  const lines = [...own]
  for (const line of added) {
    if (lines.some((l) => l.inventoryItemId === line.inventoryItemId)) continue
    const inPharmacy = lines.filter(
      (l) => l.pharmacyId === line.pharmacyId
    ).length
    if (inPharmacy < CART_LINE_LIMIT) lines.push(line)
  }
  return lines
}

function syncOwner(userId: string | undefined): void {
  const state = useCartStore.getState()
  const next = reconcile(
    { lines: state.lines, ownerId: state.ownerId, held: state.held },
    userId ?? null
  )
  if (
    next.lines !== state.lines ||
    next.ownerId !== state.ownerId ||
    next.held !== state.held
  ) {
    useCartStore.setState(next)
  }
}

syncOwner(useSessionStore.getState().user?.id)
useSessionStore.subscribe((state) => syncOwner(state.user?.id))

// Another tab changed the cart: read it again so both tabs show the same.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === CART_STORAGE_KEY || event.key === null) {
      void useCartStore.persist.rehydrate()
    }
  })
}
