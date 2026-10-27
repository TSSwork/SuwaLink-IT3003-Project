import { createFileRoute } from "@tanstack/react-router"
import { PharmacyLayout } from "@/features/pharmacy-owner/PharmacyLayout"
import { requireRole } from "@/lib/guards"

// Every /pharmacy/* page inherits this guard.
export const Route = createFileRoute("/pharmacy")({
  beforeLoad: requireRole("PHARMACY_OWNER"),
  component: PharmacyLayout,
})
