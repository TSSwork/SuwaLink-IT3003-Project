import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
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
