import { createFileRoute } from "@tanstack/react-router"
import { InventoryPage } from "@/features/pharmacy-owner/InventoryPage"

export const Route = createFileRoute("/pharmacy/inventory")({
  component: InventoryPage,
})
