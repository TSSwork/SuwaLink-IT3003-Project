import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  CheckCheckIcon,
  ChevronRightIcon,
  ClipboardListIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { PrescriptionRequest } from "@/api/types"
import { useMyReplies, usePharmacyRequests } from "@/api/pharmacyOwner"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { ScopeSummary } from "@/components/prescription/ScopeSummary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

type Filter = "waiting" | "replied" | "all"

const FILTERS: Array<Filter> = ["waiting", "replied", "all"]

export function RequestsPage() {
  const { t } = useTranslation()
  const requests = usePharmacyRequests()
  const replies = useMyReplies()
  const [filter, setFilter] = useState<Filter>("waiting")

  const error = requests.error ?? replies.error
  const retry = () => {
    if (requests.isError) void requests.refetch()
    if (replies.isError) void replies.refetch()
  }

  // A request's status turns RESPONDED when any pharmacy replies, so "replied"
  // means one of this pharmacy's own replies points at it.
  const replied = new Set(
    replies.data?.map((reply) => reply.prescriptionRequestId)
  )
  const sorted = [...(requests.data ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
  const shown = sorted.filter(
    (request) =>
      filter === "all" || (filter === "replied") === replied.has(request.id)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("pharmacyOwner.requests.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("pharmacyOwner.requests.subtitle")}
        </p>
      </div>

      {error ? (
        <ErrorState
          title={t("pharmacyOwner.requests.loadError")}
          description={translateError(t, error)}
          onRetry={retry}
        />
      ) : !requests.data || !replies.data ? (
        <LoadingState label={t("pharmacyOwner.requests.loading")} rows={4} />
      ) : requests.data.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={t("pharmacyOwner.requests.emptyTitle")}
          description={t("pharmacyOwner.requests.emptyBody")}
        />
      ) : (
        <>
          <div
            role="group"
            aria-label={t("pharmacyOwner.requests.filtersLabel")}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {FILTERS.map((name) => (
              <Button
                key={name}
                type="button"
                size="sm"
                variant={filter === name ? "default" : "outline"}
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
                className="shrink-0 rounded-full px-4"
              >
                {t(`pharmacyOwner.requests.filters.${name}`)}
              </Button>
            ))}
          </div>

          {shown.length === 0 ? (
            <EmptyState
              icon={filter === "waiting" ? CheckCheckIcon : ClipboardListIcon}
              title={t(
                filter === "waiting"
                  ? "pharmacyOwner.requests.noneWaitingTitle"
                  : "pharmacyOwner.requests.noneRepliedTitle"
              )}
              description={t(
                filter === "waiting"
                  ? "pharmacyOwner.requests.noneWaitingBody"
                  : "pharmacyOwner.requests.noneRepliedBody"
              )}
              action={
                <Button variant="outline" onClick={() => setFilter("all")}>
                  {t("pharmacyOwner.requests.showAll")}
                </Button>
              }
            />
          ) : (
            <ul
              aria-label={t("pharmacyOwner.requests.listLabel")}
              className="grid gap-3 lg:grid-cols-2"
            >
              {shown.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  replied={replied.has(request.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function RequestRow({
  request,
  replied,
}: {
  request: PrescriptionRequest
  replied: boolean
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <li className="relative flex items-center gap-3 rounded-3xl border bg-card p-4 focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <Link
            to="/pharmacy/requests/$id"
            params={{ id: request.id }}
            className="font-semibold outline-none after:absolute after:inset-0 after:rounded-3xl"
          >
            {t("pharmacyOwner.overview.patientAge", {
              count: request.patientAge,
            })}
          </Link>
          <Badge
            variant={replied ? "secondary" : "default"}
            className="h-auto whitespace-normal"
          >
            {t(
              replied
                ? "pharmacyOwner.requests.replied"
                : "pharmacyOwner.requests.waiting"
            )}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm break-words text-muted-foreground">
          {request.note ?? t("pharmacyOwner.overview.noNote")}
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time
            dateTime={request.createdAt}
            title={formatDateTime(request.createdAt, language)}
          >
            {formatRelative(request.createdAt, language)}
          </time>
          <ScopeSummary request={request} />
        </p>
      </div>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </li>
  )
}
