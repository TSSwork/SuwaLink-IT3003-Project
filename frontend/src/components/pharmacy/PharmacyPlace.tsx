import { useTranslation } from "react-i18next"
import type { District } from "@/api/types"
import { cn } from "@/lib/utils"

/** "Colombo 03, Colombo": the city, then the district in the reader's language. */
export function PharmacyPlace({
  city,
  district,
  className,
}: {
  city: string
  district: District
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span className={cn(className)}>
      {t("medicine.place", {
        city,
        district: t(`districts.${district}`),
        interpolation: { escapeValue: false },
      })}
    </span>
  )
}
