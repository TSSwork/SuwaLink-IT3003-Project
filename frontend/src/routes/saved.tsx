import { createFileRoute } from "@tanstack/react-router"
import { SavedPage } from "@/features/saved/SavedPage"
import { requireRole } from "@/lib/guards"

export const Route = createFileRoute("/saved")({
  beforeLoad: requireRole("CUSTOMER"),
  component: SavedPage,
})
