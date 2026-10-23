import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronRightIcon, ReceiptTextIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Reservation, ReservationStatus } from "@/api/types"
import { useMyReservations } from "@/api/reservations"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { HoldCountdown } from "@/components/reservation/HoldCountdown"
import { ReservationStatusBadge } from "@/components/reservation/ReservationStatusBadge"
import { Button } from "@/components/ui/button"
import { formatPrice, formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

const FILTERS: Array<ReservationStatus> = [
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]

export function ReservationsPage() {
  const { t } = useTranslation()
  const reservations = useMyReservations()
  const [filter, setFilter] = useState<ReservationStatus | null>(null)
  const shown =
    reservations.data?.filter((r) => !filter || r.status === filter) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("reservations.title")}
        </h1>
        <p className="text-muted-foreground">{t("reservations.subtitle")}</p>
      </div>

      {reservations.isPending ? (
        <LoadingState label={t("reservations.loading")} rows={4} />
      ) : reservations.isError ? (
        <ErrorState
          title={t("home.recentError")}
          description={translateError(t, reservations.error)}
          onRetry={() => void reservations.refetch()}
        />
      ) : reservations.data.length === 0 ? (
        <EmptyState
          icon={ReceiptTextIcon}
          title={t("reservations.emptyTitle")}
          description={t("reservations.emptyBody")}
          action={
            <Button asChild>
              <Link to="/search">{t("nav.findMedicine")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div
            role="group"
            aria-label={t("reservations.filter")}
            className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
          >
            <FilterChip
              label={t("search.allCategories")}
              pressed={filter === null}
              onClick={() => setFilter(null)}
            />
            {FILTERS.map((status) => (
              <FilterChip
                key={status}
                label={t(`reservations.filters.${status}`)}
                pressed={filter === status}
                onClick={() => setFilter(status)}
              />
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="rounded-3xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
              {filter && t(`reservations.noneFiltered.${filter}`)}
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {shown.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function FilterChip({
  label,
  pressed,
  onClick,
}: {
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={pressed ? "default" : "outline"}
      aria-pressed={pressed}
      onClick={onClick}
      className="shrink-0 rounded-full px-4"
    >
      {label}
    </Button>
  )
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <li className="relative flex items-center gap-3 rounded-3xl border bg-card p-4 transition-colors focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40 sm:p-5">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/reservations/$id"
            params={{ id: reservation.id }}
            aria-label={t("reservations.cardLink", {
              name: reservation.pharmacy.name,
              interpolation: { escapeValue: false },
            })}
            className="font-semibold outline-none after:absolute after:inset-0 after:rounded-3xl"
          >
            {reservation.pharmacy.name}
          </Link>
          <ReservationStatusBadge status={reservation.status} />
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted-foreground">{t("home.pickupCode")}</span>
          <span className="font-mono tracking-wider">
            {reservation.pickupCode}
          </span>
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            {t("home.itemCount", { count: reservation.items.length })}
          </span>
          <span className="tabular-nums">
            {formatPrice(reservation.total, language)}
          </span>
          {reservation.status === "CONFIRMED" ? (
            <HoldCountdown
              expiresAt={reservation.expiresAt}
              className="font-medium text-foreground"
            />
          ) : (
            <span>{formatRelative(reservation.createdAt, language)}</span>
          )}
        </p>
      </div>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </li>
  )
}
