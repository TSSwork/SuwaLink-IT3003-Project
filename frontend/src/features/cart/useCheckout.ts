import { useState } from "react"
import type { Reservation } from "@/api/types"
import type { CreateReservationRequest } from "@/api/reservations"
import type { CartGroup } from "@/stores/cartStore"
import { useCreateReservation } from "@/api/reservations"
import { CART_LINE_LIMIT, useCartStore } from "@/stores/cartStore"

export interface CheckoutOutcome {
  created: Array<{ group: CartGroup; reservation: Reservation }>
  failed: Array<{ group: CartGroup; error: unknown }>
}

/** A group the backend would refuse anyway (more than 20 lines). */
export function isOverLimit(group: CartGroup): boolean {
  return group.lines.length > CART_LINE_LIMIT
}

export function toRequest(group: CartGroup): CreateReservationRequest {
  return {
    lines: group.lines.map((line) => ({
      inventoryItemId: line.inventoryItemId,
      quantity: line.quantity,
      ...(line.prescriptionResponseItemId && {
        prescriptionResponseItemId: line.prescriptionResponseItemId,
      }),
    })),
  }
}

/**
 * One reservation per pharmacy, sent one after another. A reserved group
 * leaves the cart; a failed one stays with its error, so nothing is dropped.
 */
export function useCheckout() {
  const create = useCreateReservation()
  const clearPharmacy = useCartStore((state) => state.clearPharmacy)
  const [errors, setErrors] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)

  const checkout = async (
    groups: Array<CartGroup>
  ): Promise<CheckoutOutcome> => {
    const outcome: CheckoutOutcome = { created: [], failed: [] }
    setBusy(true)
    try {
      for (const group of groups.filter((g) => !isOverLimit(g))) {
        try {
          const reservation = await create.mutateAsync(toRequest(group))
          clearPharmacy(group.pharmacyId)
          outcome.created.push({ group, reservation })
        } catch (error) {
          outcome.failed.push({ group, error })
        }
      }
    } finally {
      setBusy(false)
    }
    setErrors((previous) => {
      const next = { ...previous }
      for (const { group } of outcome.created) delete next[group.pharmacyId]
      for (const { group, error } of outcome.failed) {
        next[group.pharmacyId] = error
      }
      return next
    })
    return outcome
  }

  return { checkout, errors, busy }
}
