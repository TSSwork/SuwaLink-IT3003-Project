import { createFileRoute } from "@tanstack/react-router"
import { UsersPage } from "@/features/admin/UsersPage"
import { validateUsersSearch } from "@/features/admin/usersSearch"

export const Route = createFileRoute("/admin/users")({
  validateSearch: validateUsersSearch,
  component: UsersPage,
})
