import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ApiResponse, PublicPharmacy } from "@/api/types"

export const pharmaciesKey = ["pharmacies"] as const

/** A publicly visible pharmacy with what it has in stock; 404 (NOT_FOUND) otherwise. */
export function usePublicPharmacy(id: string) {
  return useQuery({
    queryKey: [...pharmaciesKey, id],
    queryFn: async () =>
      (await api.get<ApiResponse<PublicPharmacy>>(`/pharmacies/${id}`)).data
        .data,
  })
}
