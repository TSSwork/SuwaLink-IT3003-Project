import { z } from "zod"

/** Search params of /search. `page` is 1-based and left out on page 1. */
export interface SearchParams {
  q?: string
  category?: string
  page?: number
}

const QUERY_MAX = 100

// Each field falls back to "absent" on its own, so one bad value never
// throws away the rest of a shared link.
const schema = z.object({
  q: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim().slice(0, QUERY_MAX))
    .transform((value) => value || undefined)
    .optional()
    .catch(undefined),
  category: z.uuid().optional().catch(undefined),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .transform((value) => (value === 1 ? undefined : value))
    .optional()
    .catch(undefined),
})

export function validateSearchParams(
  search: Record<string, unknown>
): SearchParams {
  const { q, category, page } = schema.parse(search)
  // Absent keys, not `undefined` ones, so links never print "?q=".
  return {
    ...(q && { q }),
    ...(category && { category }),
    ...(page && { page }),
  }
}
