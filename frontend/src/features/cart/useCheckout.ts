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

/** Why an over-limit group was not sent; shown with `cart.limit`. */
export class OverLimitError extends Error {
  constructor() {
    super(`More than ${CART_LINE_LIMIT} lines`)
    this.name = "OverLimitError"
  }
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

/** What a group held when it failed: its items and quantities. */
function contents(group: CartGroup): string {
  return group.lines
    .map((line) => `${line.inventoryItemId}:${line.quantity}`)
    .join(",")
}

interface GroupError {
  error: unknown
  contents: string
}

/**
 * One reservation per pharmacy, sent one after another. A reserved group
 * leaves the cart; a failed one stays with its error, so nothing is dropped.
 * A group over the line limit is not sent and is reported as not reserved.
 */
export function useCheckout() {
  const create = useCreateReservation()
  const clearPharmacy = useCartStore((state) => state.clearPharmacy)
  const [errors, setErrors] = useState<Record<string, GroupError>>({})
  const [busy, setBusy] = useState(false)

  const checkout = async (
    groups: Array<CartGroup>
  ): Promise<CheckoutOutcome> => {
    const outcome: CheckoutOutcome = { created: [], failed: [] }
    const sendFailures: Array<{ group: CartGroup; error: unknown }> = []
    setBusy(true)
    try {
      for (const group of groups) {
        if (isOverLimit(group)) {
          outcome.failed.push({ group, error: new OverLimitError() })
          continue
        }
        try {
          const reservation = await create.mutateAsync(toRequest(group))
          clearPharmacy(group.pharmacyId)
          outcome.created.push({ group, reservation })
        } catch (error) {
          outcome.failed.push({ group, error })
          sendFailures.push({ group, error })
        }
      }
    } finally {
      setBusy(false)
    }
    // Over-limit groups already show their own notice in the cart.
    setErrors((previous) => {
      const next = { ...previous }
      for (const { group } of outcome.created) delete next[group.pharmacyId]
      for (const { group, error } of sendFailures) {
        next[group.pharmacyId] = { error, contents: contents(group) }
      }
      return next
    })
    return outcome
  }

  /** The last error for this group, until its lines or quantities change. */
  const errorFor = (group: CartGroup): unknown => {
    const stored = errors[group.pharmacyId] as GroupError | undefined
    return stored && stored.contents === contents(group)
      ? stored.error
      : undefined
  }

  return { checkout, errorFor, busy }
}
