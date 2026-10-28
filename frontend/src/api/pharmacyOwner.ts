import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  ApiResponse,
  CatalogMedicine,
  CreateInventoryRequest,
  InventoryItem,
  MedicineMasterRequest,
  PharmacyProfile,
  PrescriptionReply,
  PrescriptionRequest,
  Reservation,
  UpdateInventoryRequest,
  UpdatePharmacyProfileRequest,
} from "@/api/types"

/** Everything the signed-in pharmacy owner sees about their own pharmacy. */
export const pharmacyOwnerKey = ["pharmacy-owner"] as const

const profileKey = [...pharmacyOwnerKey, "profile"] as const

export function useMyPharmacy() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () =>
      (await api.get<ApiResponse<PharmacyProfile>>("/pharmacies/me")).data.data,
  })
}

export function useUpdateMyPharmacy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdatePharmacyProfileRequest) =>
      (await api.put<ApiResponse<PharmacyProfile>>("/pharmacies/me", body)).data
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  })
}

/** Open (PENDING / RESPONDED) requests sent to this pharmacy. */
export function usePharmacyRequests() {
  return useQuery({
    queryKey: [...pharmacyOwnerKey, "requests"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<PrescriptionRequest>>>("/prescriptions"))
        .data.data,
  })
}

/**
 * This pharmacy's own replies. A request's status is shared by every pharmacy
 * it went to (RESPONDED once anyone replied), so "waiting for you" is decided
 * by whether one of these replies points at it.
 */
export function useMyReplies() {
  return useQuery({
    queryKey: [...pharmacyOwnerKey, "replies"],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<PrescriptionReply>>>(
          "/prescriptions/responses/me"
        )
      ).data.data,
  })
}

/** Reservations made at this pharmacy, newest first. */
export function usePharmacyReservations() {
  return useQuery({
    queryKey: [...pharmacyOwnerKey, "reservations"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<Reservation>>>("/reservations")).data
        .data,
  })
}

const inventoryKey = [...pharmacyOwnerKey, "inventory"] as const

export function useMyInventory() {
  return useQuery({
    queryKey: inventoryKey,
    queryFn: async () =>
      (await api.get<ApiResponse<Array<InventoryItem>>>("/inventory")).data
        .data,
  })
}

/** Every stock change refetches the list, which the overview counts come from. */
function useInventoryMutation<TBody, TResult>(
  mutationFn: (body: TBody) => Promise<TResult>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKey }),
  })
}

export function useAddInventory() {
  return useInventoryMutation(
    async (body: CreateInventoryRequest) =>
      (await api.post<ApiResponse<InventoryItem>>("/inventory", body)).data.data
  )
}

export function useUpdateInventory(id: string) {
  return useInventoryMutation(
    async (body: UpdateInventoryRequest) =>
      (await api.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, body)).data
        .data
  )
}

/** Shows (true) or hides (false) the item from customers. */
export function useSetAvailability(id: string) {
  return useInventoryMutation(
    async (available: boolean) =>
      (
        await api.patch<ApiResponse<InventoryItem>>(
          `/inventory/${id}/availability`,
          { available }
        )
      ).data.data
  )
}

export function useDeleteInventory(id: string) {
  return useInventoryMutation(async () => {
    await api.delete(`/inventory/${id}`)
  })
}

/** The APPROVED catalogue, the only medicines a pharmacy can stock. */
export function useApprovedMedicines() {
  return useQuery({
    queryKey: [...pharmacyOwnerKey, "catalog"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<CatalogMedicine>>>("/medicines")).data
        .data,
    staleTime: 5 * 60_000,
  })
}

const suggestionsKey = [...pharmacyOwnerKey, "suggestions"] as const

/** This pharmacy's suggestions in any status, newest first. */
export function useMySuggestions() {
  return useQuery({
    queryKey: suggestionsKey,
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<CatalogMedicine>>>(
          "/medicines/suggestions/mine"
        )
      ).data.data,
  })
}

export function useSuggestMedicine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MedicineMasterRequest) =>
      (
        await api.post<ApiResponse<CatalogMedicine>>(
          "/medicines/suggestions",
          body
        )
      ).data.data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: suggestionsKey }),
  })
}
