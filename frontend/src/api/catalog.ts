import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ApiResponse, CategoryOption } from "@/api/types"

export const categoriesKey = ["categories"] as const

/** Active medicine categories, sorted by name; public, so no session needed. */
export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: async () =>
      (await api.get<ApiResponse<Array<CategoryOption>>>("/categories")).data
        .data,
    staleTime: 10 * 60_000,
  })
}
