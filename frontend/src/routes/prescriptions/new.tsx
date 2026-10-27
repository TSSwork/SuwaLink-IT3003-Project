import { createFileRoute } from "@tanstack/react-router"
import { NewPrescriptionPage } from "@/features/prescriptions/NewPrescriptionPage"
import { requireRole } from "@/lib/guards"

export const Route = createFileRoute("/prescriptions/new")({
  beforeLoad: requireRole("CUSTOMER"),
  component: NewPrescriptionPage,
})
