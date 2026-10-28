import { z } from "zod"
import type { AccountStatus } from "@/api/types"

/** The statuses an admin filters by; DELETED accounts are anonymised and not listed. */
export const USER_FILTERS = [
  "ALL",
  "ACTIVE",
  "SUSPENDED",
] as const satisfies ReadonlyArray<AccountStatus | "ALL">
export type UserFilter = (typeof USER_FILTERS)[number]

/** Search params of /admin/users. `status` absent means ALL. */
export interface UsersSearch {
  status?: Exclude<UserFilter, "ALL">
}

// A bad value falls back to the default instead of breaking the link.
const schema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional().catch(undefined),
})

export function validateUsersSearch(
  search: Record<string, unknown>
): UsersSearch {
  // `status` is set even when undefined: the raw value would otherwise
  // survive from the root route's unvalidated search.
  return { status: schema.parse(search).status }
}
