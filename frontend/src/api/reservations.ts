import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ApiResponse, Reservation } from "@/api/types"
import { useSessionStore } from "@/stores/sessionStore"

export const reservationsKey = ["reservations"] as const

/** The signed-in customer's reservations, newest first; idle for other roles. */
export function useMyReservations() {
  const isCustomer = useSessionStore(
    (state) => state.user?.role === "CUSTOMER"
  )
  return useQuery({
    queryKey: [...reservationsKey, "mine"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<Reservation>>>("/reservations/me")).data
        .data,
    enabled: isCustomer,
  })
}
