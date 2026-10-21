import { createFileRoute } from "@tanstack/react-router"
import { ConstructionIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/feedback/EmptyState"
import { requireRole } from "@/lib/guards"

export const Route = createFileRoute("/admin/")({
  beforeLoad: requireRole("ADMIN"),
  component: ComingSoon,
})

// Content arrives in Phase 2C.
function ComingSoon() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={ConstructionIcon}
      title={t("common.comingSoonTitle")}
      description={t("common.comingSoonBody")}
    />
  )
}
