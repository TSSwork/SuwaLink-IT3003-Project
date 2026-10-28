import { createFileRoute } from "@tanstack/react-router"
import { ScanPage } from "@/features/pharmacy-owner/ScanPage"

export const Route = createFileRoute("/pharmacy/scan")({
  component: ScanPage,
})
