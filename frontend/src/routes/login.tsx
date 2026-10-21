import { createFileRoute } from "@tanstack/react-router"
import { LoginPage } from "@/features/auth/LoginPage"
import { validateLoginSearch } from "@/features/auth/schemas"

export const Route = createFileRoute("/login")({
  validateSearch: validateLoginSearch,
  component: LoginPage,
})
