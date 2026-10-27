import { createFileRoute } from "@tanstack/react-router"
import { ReservationsPage } from "@/features/reservations/ReservationsPage"
import { requireRole } from "@/lib/guards"

export const Route = createFileRoute("/reservations/")({
  beforeLoad: requireRole("CUSTOMER"),
  component: ReservationsPage,
})
