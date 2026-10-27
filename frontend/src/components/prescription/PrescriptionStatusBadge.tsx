import { useTranslation } from "react-i18next"
import type { PrescriptionStatus } from "@/api/types"
import { Badge } from "@/components/ui/badge"

const VARIANT: Record<PrescriptionStatus, "secondary" | "default" | "outline"> =
  {
    PENDING: "outline",
    RESPONDED: "default",
    CLOSED: "secondary",
    EXPIRED: "outline",
  }

/** Status in words ("Waiting for replies"), never colour alone. */
export function PrescriptionStatusBadge({
  status,
}: {
  status: PrescriptionStatus
}) {
  const { t } = useTranslation()
  return (
    <Badge variant={VARIANT[status]} className="h-auto whitespace-normal">
      {t(`prescriptions.status.${status}`)}
    </Badge>
  )
}
