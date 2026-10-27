import { ConstructionIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/feedback/EmptyState"

/** Stand-in for a pharmacy section that a later change builds. */
export function ComingSoonPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={ConstructionIcon}
      title={t("common.comingSoonTitle")}
      description={t("common.comingSoonBody")}
    />
  )
}
