import { z } from "zod"
import type { MedicineStatus } from "@/api/types"

/** The statuses an admin filters suggestions by. */
export const SUGGESTION_FILTERS = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ALL",
] as const satisfies ReadonlyArray<MedicineStatus | "ALL">
export type SuggestionFilter = (typeof SUGGESTION_FILTERS)[number]

/** Search params of /admin/suggestions. `status` absent means PENDING. */
export interface SuggestionsSearch {
  status?: SuggestionFilter
}

// A bad value falls back to the default instead of breaking the link.
const schema = z.object({
  status: z.enum(SUGGESTION_FILTERS).optional().catch(undefined),
})

export function validateSuggestionsSearch(
  search: Record<string, unknown>
): SuggestionsSearch {
  // `status` is set even when undefined: the raw value would otherwise
  // survive from the root route's unvalidated search.
  return { status: schema.parse(search).status }
}
