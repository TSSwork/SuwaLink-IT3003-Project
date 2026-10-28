import { createFileRoute } from "@tanstack/react-router"
import { ReservationsPage } from "@/features/pharmacy-owner/ReservationsPage"

export const Route = createFileRoute("/pharmacy/reservations")({
  component: ReservationsPage,
})
