import { createFileRoute } from "@tanstack/react-router"
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage"
import { validateResetPasswordSearch } from "@/features/auth/schemas"

export const Route = createFileRoute("/reset-password")({
  validateSearch: validateResetPasswordSearch,
  component: ResetPasswordPage,
})
