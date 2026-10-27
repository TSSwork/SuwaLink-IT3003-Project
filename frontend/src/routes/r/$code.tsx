import { createFileRoute } from "@tanstack/react-router"
import { PickupCodePage } from "@/features/reservations/PickupCodePage"
import { requireAuth } from "@/lib/guards"

/** QR target `/r/<pickupCode>`: sign in first, then back here. */
export const Route = createFileRoute("/r/$code")({
  beforeLoad: requireAuth,
  component: PickupCodePage,
})
