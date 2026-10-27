import { createFileRoute } from "@tanstack/react-router"
import { PrescriptionDetailPage } from "@/features/prescriptions/PrescriptionDetailPage"
import { requireRole } from "@/lib/guards"

export const Route = createFileRoute("/prescriptions/$id")({
  beforeLoad: requireRole("CUSTOMER"),
  component: PrescriptionDetailPage,
})
