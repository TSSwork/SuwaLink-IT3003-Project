import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  ApiResponse,
  CategoryOption,
  ManufacturerOption,
} from "@/api/types"

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

/** Active manufacturers, sorted by name; public, like the categories. */
export function useManufacturers() {
  return useQuery({
    queryKey: ["manufacturers"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<ManufacturerOption>>>("/manufacturers"))
        .data.data,
    staleTime: 10 * 60_000,
  })
}
