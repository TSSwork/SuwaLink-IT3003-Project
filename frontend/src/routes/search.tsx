import { createFileRoute } from "@tanstack/react-router"
import { SearchPage } from "@/features/search/SearchPage"
import { validateSearchParams } from "@/features/search/searchParams"

export const Route = createFileRoute("/search")({
  validateSearch: validateSearchParams,
  component: SearchPage,
})
