import { ConstructionIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/feedback/EmptyState"

/** Stands in for an admin page that is still being built. */
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
