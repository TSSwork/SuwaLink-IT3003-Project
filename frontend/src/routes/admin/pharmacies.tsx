import { createFileRoute } from "@tanstack/react-router"
import { PharmaciesPage } from "@/features/admin/PharmaciesPage"
import { validatePharmaciesSearch } from "@/features/admin/pharmaciesSearch"

export const Route = createFileRoute("/admin/pharmacies")({
  validateSearch: validatePharmaciesSearch,
  component: PharmaciesPage,
})
