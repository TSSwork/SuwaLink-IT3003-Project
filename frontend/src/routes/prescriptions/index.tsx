import { createFileRoute } from "@tanstack/react-router"
import { PrescriptionsPage } from "@/features/prescriptions/PrescriptionsPage"
import { requireRole } from "@/lib/guards"

export const Route = createFileRoute("/prescriptions/")({
  beforeLoad: requireRole("CUSTOMER"),
  component: PrescriptionsPage,
})
