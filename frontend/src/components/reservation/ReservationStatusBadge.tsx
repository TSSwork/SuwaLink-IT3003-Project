import { useTranslation } from "react-i18next"
import type { ReservationStatus } from "@/api/types"
import { Badge } from "@/components/ui/badge"

const VARIANT: Record<ReservationStatus, "secondary" | "default" | "outline"> =
  {
    CONFIRMED: "secondary",
    COMPLETED: "default",
    CANCELLED: "outline",
    EXPIRED: "outline",
  }

/** Reservation status in words, never colour alone. */
export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus
}) {
  const { t } = useTranslation()
  return (
    <Badge variant={VARIANT[status]} className="h-auto whitespace-normal">
      {t(`reservations.status.${status}`)}
    </Badge>
  )
}
