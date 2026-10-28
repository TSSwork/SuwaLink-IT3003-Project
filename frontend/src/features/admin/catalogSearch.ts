import { z } from "zod"
import type { CatalogKind } from "@/api/admin"

/** The catalog's tabs, in order; each is one admin list. */
export const CATALOG_TABS = [
  "medicines",
  "categories",
  "manufacturers",
] as const satisfies ReadonlyArray<CatalogKind>

/** Search params of /admin/catalog. `tab` absent means medicines. */
export interface CatalogSearch {
  tab?: Exclude<CatalogKind, "medicines">
}

// A bad value falls back to the default instead of breaking the link.
const schema = z.object({
  tab: z.enum(["categories", "manufacturers"]).optional().catch(undefined),
})

export function validateCatalogSearch(
  search: Record<string, unknown>
): CatalogSearch {
  // `tab` is set even when undefined: the raw value would otherwise
  // survive from the root route's unvalidated search.
  return { tab: schema.parse(search).tab }
}
