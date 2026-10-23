import { getRouteApi } from "@tanstack/react-router"
import { useReservation } from "@/api/reservations"
import { ReservationQueryView } from "@/features/reservations/ReservationView"

const route = getRouteApi("/reservations/$id")

export function ReservationDetailPage() {
  const { id } = route.useParams()
  return <ReservationQueryView query={useReservation(id)} />
}
