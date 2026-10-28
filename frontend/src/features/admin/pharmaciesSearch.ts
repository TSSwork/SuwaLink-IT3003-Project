import { z } from "zod"
import type { PharmacyStatus } from "@/api/types"

/** The statuses an admin filters by; DEACTIVATED pharmacies show under ALL only. */
export const PHARMACY_FILTERS = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "ALL",
] as const satisfies ReadonlyArray<PharmacyStatus | "ALL">
export type PharmacyFilter = (typeof PHARMACY_FILTERS)[number]

/** Search params of /admin/pharmacies. `status` absent means PENDING. */
export interface PharmaciesSearch {
  status?: PharmacyFilter
}

// A bad value falls back to the default instead of breaking the link.
const schema = z.object({
  status: z.enum(PHARMACY_FILTERS).optional().catch(undefined),
})

export function validatePharmaciesSearch(
  search: Record<string, unknown>
): PharmaciesSearch {
  // `status` is set even when undefined: the raw value would otherwise
  // survive from the root route's unvalidated search.
  return { status: schema.parse(search).status }
}
