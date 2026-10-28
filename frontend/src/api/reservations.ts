import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import { pharmacyOwnerKey } from "@/api/pharmacyOwner"
import type { ApiResponse, Reservation } from "@/api/types"
import { useSessionStore } from "@/stores/sessionStore"

export const reservationsKey = ["reservations"] as const

/** The signed-in customer's reservations, newest first; idle for other roles. */
export function useMyReservations() {
  const isCustomer = useSessionStore((state) => state.user?.role === "CUSTOMER")
  return useQuery({
    queryKey: [...reservationsKey, "mine"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<Reservation>>>("/reservations/me")).data
        .data,
    enabled: isCustomer,
  })
}

/** POST /api/reservations body: every line from one pharmacy. */
export interface CreateReservationRequest {
  lines: Array<{
    inventoryItemId: string
    quantity: number
    /** Reserve at the price a pharmacy quoted for a prescription. */
    prescriptionResponseItemId?: string
  }>
}

export function useCreateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CreateReservationRequest) =>
      (await api.post<ApiResponse<Reservation>>("/reservations", request)).data
        .data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reservationsKey }),
  })
}

/** Visible to the customer who made it, the owning pharmacy and admins; 404 for anyone else. */
export function useReservation(id: string) {
  return useQuery({
    queryKey: [...reservationsKey, id],
    queryFn: async () =>
      (await api.get<ApiResponse<Reservation>>(`/reservations/${id}`)).data
        .data,
  })
}

/** The QR / typed pickup code lookup; same visibility, never 403. */
export function useReservationByCode(code: string) {
  return useQuery({
    queryKey: [...reservationsKey, "code", code.toUpperCase()],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Reservation>>(
          `/reservations/by-code/${encodeURIComponent(code)}`
        )
      ).data.data,
  })
}

/**
 * Also refetches the pharmacy owner's reservation list and overview, which
 * live under their own key.
 */
function useReservationChange<TVariables>(
  request: (variables: TVariables) => Promise<Reservation>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (reservation) => {
      queryClient.setQueryData(
        [...reservationsKey, reservation.id],
        reservation
      )
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: reservationsKey }),
        queryClient.invalidateQueries({ queryKey: pharmacyOwnerKey }),
      ])
    },
  })
}

/** Customer (own) or owning pharmacy; only while CONFIRMED. */
export function useCancelReservation() {
  return useReservationChange(
    async ({ id, reason }: { id: string; reason?: string }) =>
      (
        await api.patch<ApiResponse<Reservation>>(
          `/reservations/${id}/cancel`,
          reason ? { reason } : {}
        )
      ).data.data
  )
}

/** Owning pharmacy only: the customer collected it. */
export function useCompleteReservation() {
  return useReservationChange(
    async (id: string) =>
      (
        await api.patch<ApiResponse<Reservation>>(
          `/reservations/${id}/complete`
        )
      ).data.data
  )
}
