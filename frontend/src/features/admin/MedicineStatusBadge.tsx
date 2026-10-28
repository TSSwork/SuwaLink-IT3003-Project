import { useTranslation } from "react-i18next"
import type { MedicineStatus } from "@/api/types"
import { Badge } from "@/components/ui/badge"

const VARIANT: Record<MedicineStatus, "secondary" | "default" | "destructive"> =
  {
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
  }

/** A catalog medicine's review status; only APPROVED ones can be stocked. */
export function MedicineStatusBadge({ status }: { status: MedicineStatus }) {
  const { t } = useTranslation()
  return (
    <Badge
      variant={VARIANT[status]}
      className="h-auto shrink-0 whitespace-normal"
    >
      {t(`admin.medicineStatus.${status}`)}
    </Badge>
  )
}
