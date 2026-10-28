import { createFileRoute } from "@tanstack/react-router"
import { RequestsPage } from "@/features/pharmacy-owner/RequestsPage"

export const Route = createFileRoute("/pharmacy/requests/")({
  component: RequestsPage,
})
