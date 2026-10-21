import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  ApiResponse,
  District,
  MedicineDetail,
  MedicineSearchResult,
  Offer,
  OfferSort,
  Page,
} from "@/api/types"

export const medicinesKey = ["medicines"] as const

/** Where to measure from: a point (lat+lng) or a district filter, or neither. */
export interface PlaceParams {
  lat?: number
  lng?: number
  district?: District
}

export interface MedicineSearchParams extends PlaceParams {
  q?: string
  categoryId?: string
  /** 0-based, as the backend counts. */
  page: number
  /** At most 50. */
  size: number
}

/** Drops unset values so they never reach the URL or the cache key. */
function defined<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

/** Public search; the previous page stays on screen while the next loads. */
export function useMedicineSearch(params: MedicineSearchParams) {
  const query = defined(params)
  return useQuery({
    queryKey: [...medicinesKey, "search", query],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Page<MedicineSearchResult>>>(
          "/medicines/search",
          { params: query }
        )
      ).data.data,
    placeholderData: keepPreviousData,
  })
}

export function useMedicine(id: string) {
  return useQuery({
    queryKey: [...medicinesKey, id],
    queryFn: async () =>
      (await api.get<ApiResponse<MedicineDetail>>(`/medicines/${id}`)).data
        .data,
  })
}

/** Pharmacies stocking one medicine; sorted by distance when lat+lng are given, else price. */
export function useOffers(
  id: string,
  params: PlaceParams & { sort?: OfferSort } = {}
) {
  const query = defined(params)
  return useQuery({
    queryKey: [...medicinesKey, id, "offers", query],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<Offer>>>(`/medicines/${id}/offers`, {
          params: query,
        })
      ).data.data,
  })
}
