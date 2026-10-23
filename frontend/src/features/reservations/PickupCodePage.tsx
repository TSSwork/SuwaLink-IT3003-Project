import { getRouteApi } from "@tanstack/react-router"
import { useReservationByCode } from "@/api/reservations"
import { ReservationQueryView } from "@/features/reservations/ReservationView"

const route = getRouteApi("/r/$code")

/** The QR target: the customer's order page, or the counter view for the owning pharmacy. */
export function PickupCodePage() {
  const { code } = route.useParams()
  return <ReservationQueryView query={useReservationByCode(code)} />
}
