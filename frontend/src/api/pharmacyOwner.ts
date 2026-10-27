import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  ApiResponse,
  InventoryItem,
  PharmacyProfile,
  PrescriptionReply,
  PrescriptionRequest,
  Reservation,
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

export function useMyInventory() {
  return useQuery({
    queryKey: [...pharmacyOwnerKey, "inventory"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<InventoryItem>>>("/inventory")).data
        .data,
  })
}
