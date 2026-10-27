import { createFileRoute } from "@tanstack/react-router"
import { PharmacyPage } from "@/features/pharmacy/PharmacyPage"

export const Route = createFileRoute("/pharmacies/$id")({
  component: PharmacyPage,
})
