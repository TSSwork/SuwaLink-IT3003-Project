import { createFileRoute } from "@tanstack/react-router"
import { SuggestMedicinePage } from "@/features/pharmacy-owner/SuggestMedicinePage"

export const Route = createFileRoute("/pharmacy/suggest-medicine")({
  component: SuggestMedicinePage,
})
