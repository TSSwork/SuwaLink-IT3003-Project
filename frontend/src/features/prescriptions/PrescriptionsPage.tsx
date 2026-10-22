import { Link } from "@tanstack/react-router"
import { ChevronRightIcon, FileImageIcon, FileTextIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { PrescriptionRequest } from "@/api/types"
import { useMyPrescriptions } from "@/api/prescriptions"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { PrescriptionStatusBadge } from "@/components/prescription/PrescriptionStatusBadge"
import { ScopeSummary } from "@/components/prescription/ScopeSummary"
import { UploadPrescriptionButton } from "@/components/prescription/UploadPrescriptionButton"
import { formatDateTime, formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

export function PrescriptionsPage() {
  const { t } = useTranslation()
  const prescriptions = useMyPrescriptions()
  const empty = prescriptions.data?.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("prescriptions.title")}
          </h1>
          <p className="text-muted-foreground">{t("prescriptions.subtitle")}</p>
        </div>
        {!empty && <UploadPrescriptionButton />}
      </div>

      {prescriptions.isPending ? (
        <LoadingState label={t("prescriptions.loading")} rows={4} />
      ) : prescriptions.isError ? (
        <ErrorState
          title={t("prescriptions.loadError")}
          description={translateError(t, prescriptions.error)}
          onRetry={() => void prescriptions.refetch()}
        />
      ) : prescriptions.data.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={t("prescriptions.emptyTitle")}
          description={t("prescriptions.emptyBody")}
          action={<UploadPrescriptionButton />}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {prescriptions.data.map((request) => (
            <PrescriptionCard key={request.id} request={request} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PrescriptionCard({ request }: { request: PrescriptionRequest }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <li className="relative flex items-center gap-4 rounded-3xl border bg-card p-4 transition-colors focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40 sm:p-5">
      {/* A placeholder: the private image is only downloaded on the detail page. */}
      <span
        aria-hidden
        className="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
      >
        <FileImageIcon className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/prescriptions/$id"
            params={{ id: request.id }}
            className="font-semibold outline-none after:absolute after:inset-0 after:rounded-3xl"
          >
            {t("prescriptions.requestFrom", {
              date: formatDateTime(request.createdAt, language),
            })}
          </Link>
          <PrescriptionStatusBadge status={request.status} />
        </div>
        <ScopeSummary
          request={request}
          className="text-sm text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          {formatRelative(request.createdAt, language)}
        </p>
      </div>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </li>
  )
}
