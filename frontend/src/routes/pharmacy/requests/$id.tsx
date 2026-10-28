import { createFileRoute } from "@tanstack/react-router"
import { RequestDetailPage } from "@/features/pharmacy-owner/RequestDetailPage"

export const Route = createFileRoute("/pharmacy/requests/$id")({
  component: RequestDetailPage,
})
