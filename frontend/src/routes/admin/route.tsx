import { createFileRoute } from "@tanstack/react-router"
import { AdminLayout } from "@/features/admin/AdminLayout"
import { requireRole } from "@/lib/guards"

// Every /admin/* page inherits this guard.
export const Route = createFileRoute("/admin")({
  beforeLoad: requireRole("ADMIN"),
  component: AdminLayout,
})
