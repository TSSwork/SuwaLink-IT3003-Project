import { Link } from "@tanstack/react-router"
import {
  BadgeCheckIcon,
  BanIcon,
  ClockIcon,
  PillIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LucideIcon } from "lucide-react"
import type { PharmacyFilter } from "@/features/admin/pharmaciesSearch"
import { useAdminSuggestions, useDashboard } from "@/api/admin"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { translateError } from "@/lib/translateError"
import { cn } from "@/lib/utils"

export function DashboardPage() {
  const { t } = useTranslation()
  const dashboard = useDashboard()
  const suggestions = useAdminSuggestions("PENDING")
  const stats = dashboard.data

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">{t("admin.dashboard.title")}</h2>
      {dashboard.isError && (
        <ErrorState
          title={t("admin.dashboard.loadError")}
          description={translateError(t, dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      )}
      {suggestions.isError && (
        <ErrorState
          title={t("admin.dashboard.suggestionsError")}
          description={translateError(t, suggestions.error)}
          onRetry={() => void suggestions.refetch()}
        />
      )}

      <section
        aria-labelledby="dashboard-pharmacies"
        className="flex flex-col gap-3"
      >
        <h3 id="dashboard-pharmacies" className="text-lg font-semibold">
          {t("admin.dashboard.pharmacies")}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PharmacyCard
            status="PENDING"
            icon={ClockIcon}
            label={t("admin.dashboard.stats.pending")}
            value={stats?.pendingPharmacies}
            failed={dashboard.isError}
            attention={(stats?.pendingPharmacies ?? 0) > 0}
          />
          <PharmacyCard
            status="VERIFIED"
            icon={BadgeCheckIcon}
            label={t("admin.dashboard.stats.verified")}
            value={stats?.verifiedPharmacies}
            failed={dashboard.isError}
          />
          <PharmacyCard
            status="REJECTED"
            icon={BanIcon}
            label={t("admin.dashboard.stats.rejected")}
            value={stats?.rejectedPharmacies}
            failed={dashboard.isError}
          />
          <PharmacyCard
            status="ALL"
            icon={StoreIcon}
            label={t("admin.dashboard.stats.pharmacies")}
            value={stats?.totalPharmacies}
            failed={dashboard.isError}
          />
        </div>
      </section>

      <section
        aria-labelledby="dashboard-people"
        className="flex flex-col gap-3"
      >
        <h3 id="dashboard-people" className="text-lg font-semibold">
          {t("admin.dashboard.peopleAndCatalog")}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/admin/users" className={cardClass(false)}>
            <CardBody
              icon={UsersIcon}
              label={t("admin.dashboard.stats.customers")}
              value={stats?.totalCustomers}
              failed={dashboard.isError}
            />
          </Link>
          <Link
            to="/admin/suggestions"
            className={cardClass((suggestions.data?.length ?? 0) > 0)}
          >
            <CardBody
              icon={PillIcon}
              label={t("admin.dashboard.stats.suggestions")}
              value={suggestions.data?.length}
              failed={suggestions.isError}
            />
          </Link>
        </div>
      </section>
    </div>
  )
}

/** Highlighted while something waits for the admin. */
function cardClass(attention: boolean) {
  return cn(
    "flex min-h-11 flex-col gap-2 rounded-3xl border bg-card p-4 outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5",
    attention && "border-primary/50 bg-primary/5"
  )
}

function PharmacyCard({
  status,
  attention = false,
  ...body
}: {
  status: PharmacyFilter
  attention?: boolean
} & CardBodyProps) {
  return (
    <Link
      to="/admin/pharmacies"
      search={{ status }}
      className={cardClass(attention)}
    >
      <CardBody {...body} />
    </Link>
  )
}

interface CardBodyProps {
  icon: LucideIcon
  label: string
  value: number | undefined
  failed: boolean
}

function CardBody({ icon: Icon, label, value, failed }: CardBodyProps) {
  return (
    <>
      <Icon className="size-5 text-primary" aria-hidden />
      {failed ? (
        <span className="text-3xl font-bold" aria-hidden>
          —
        </span>
      ) : value === undefined ? (
        <Skeleton aria-hidden className="h-9 w-12" />
      ) : (
        <span className="text-3xl font-bold tabular-nums">{value}</span>
      )}
      <span className="text-sm text-muted-foreground">{label}</span>
    </>
  )
}
