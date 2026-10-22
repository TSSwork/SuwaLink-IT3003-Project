import { createFileRoute } from "@tanstack/react-router"
import { MedicinePage } from "@/features/medicine/MedicinePage"

export const Route = createFileRoute("/medicines/$id")({
  component: MedicinePage,
})
