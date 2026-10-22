import { useTranslation } from "react-i18next"
import type { PrescriptionRequest } from "@/api/types"

/** "Sent to 8 pharmacies in Colombo" / "… within 10 km" / "Sent to all 42 pharmacies". */
export function ScopeSummary({
  request,
  className,
}: {
  request: Pick<PrescriptionRequest, "targetScope" | "targetCount" | "district">
  className?: string
}) {
  const { t } = useTranslation()
  const count = request.targetCount
  const text =
    request.targetScope === "RADIUS_10KM"
      ? t("prescriptions.sentRadius", { count })
      : request.targetScope === "DISTRICT" && request.district
        ? t("prescriptions.sentDistrict", {
            count,
            district: t(`districts.${request.district}`),
          })
        : t("prescriptions.sentAll", { count })
  return <span className={className}>{text}</span>
}
