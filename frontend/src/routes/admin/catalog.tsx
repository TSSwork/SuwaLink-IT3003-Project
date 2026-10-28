import { createFileRoute } from "@tanstack/react-router"
import { CatalogPage } from "@/features/admin/CatalogPage"
import { validateCatalogSearch } from "@/features/admin/catalogSearch"

export const Route = createFileRoute("/admin/catalog")({
  validateSearch: validateCatalogSearch,
  component: CatalogPage,
})
