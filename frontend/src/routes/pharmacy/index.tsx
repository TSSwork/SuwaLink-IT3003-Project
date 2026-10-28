import { createFileRoute } from "@tanstack/react-router"
import { OverviewPage } from "@/features/pharmacy-owner/OverviewPage"

export const Route = createFileRoute("/pharmacy/")({
  component: OverviewPage,
})
