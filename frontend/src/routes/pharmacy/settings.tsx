import { createFileRoute } from "@tanstack/react-router"
import { SettingsPage } from "@/features/pharmacy-owner/SettingsPage"

export const Route = createFileRoute("/pharmacy/settings")({
  component: SettingsPage,
})
