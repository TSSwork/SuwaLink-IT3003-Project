import { createFileRoute } from "@tanstack/react-router"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { requireRole } from "@/lib/guards"

// Pharmacy owners and admins get their own settings in Phase 2C.
export const Route = createFileRoute("/settings")({
  beforeLoad: requireRole("CUSTOMER"),
  component: SettingsPage,
})
