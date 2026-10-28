import { createFileRoute } from "@tanstack/react-router"
import { DashboardPage } from "@/features/admin/DashboardPage"

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
})
