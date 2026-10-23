import { createFileRoute } from "@tanstack/react-router"
import { ReservationDetailPage } from "@/features/reservations/ReservationDetailPage"
import { requireAuth } from "@/lib/guards"

// Customer, owning pharmacy or admin; the backend answers 404 to anyone else.
export const Route = createFileRoute("/reservations/$id")({
  beforeLoad: requireAuth,
  component: ReservationDetailPage,
})
