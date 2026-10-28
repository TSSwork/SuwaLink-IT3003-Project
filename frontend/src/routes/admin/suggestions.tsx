import { createFileRoute } from "@tanstack/react-router"
import { SuggestionsPage } from "@/features/admin/SuggestionsPage"
import { validateSuggestionsSearch } from "@/features/admin/suggestionsSearch"

export const Route = createFileRoute("/admin/suggestions")({
  validateSearch: validateSuggestionsSearch,
  component: SuggestionsPage,
})
