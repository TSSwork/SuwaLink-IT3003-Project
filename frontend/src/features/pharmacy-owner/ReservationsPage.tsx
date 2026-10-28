import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronRightIcon, ReceiptTextIcon, ScanLineIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Reservation, ReservationStatus } from "@/api/types"
import { usePharmacyReservations } from "@/api/pharmacyOwner"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import {
  RefreshFailedNotice,
  failedWithData,
} from "@/components/feedback/RefreshFailedNotice"
import { RxBadge } from "@/components/medicine/RxBadge"
import { HoldCountdown } from "@/components/reservation/HoldCountdown"
import { ReservationStatusBadge } from "@/components/reservation/ReservationStatusBadge"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatPrice, formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

type Filter = ReservationStatus | "ALL"

const FILTERS: Array<Filter> = [
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "ALL",
]

/** Reservations made at this pharmacy, waiting for pickup first. */
export function ReservationsPage() {
  const { t } = useTranslation()
  const reservations = usePharmacyReservations()
  const [filter, setFilter] = useState<Filter>("CONFIRMED")
  const shown =
    reservations.data?.filter((r) => filter === "ALL" || r.status === filter) ??
    []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("pharmacyOwner.reservations.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("pharmacyOwner.reservations.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-auto">
          <Link to="/pharmacy/scan">
            <ScanLineIcon aria-hidden />
            {t("pharmacyOwner.scan.title")}
          </Link>
        </Button>
      </div>

      {failedWithData(reservations) && (
        <RefreshFailedNotice onRetry={() => void reservations.refetch()} />
      )}
      {reservations.isPending ? (
        <LoadingState
          label={t("pharmacyOwner.reservations.loading")}
          rows={4}
        />
      ) : reservations.data === undefined ? (
        <ErrorState
          title={t("pharmacyOwner.reservations.loadError")}
          description={translateError(t, reservations.error)}
          onRetry={() => void reservations.refetch()}
        />
      ) : reservations.data.length === 0 ? (
        <EmptyState
          icon={ReceiptTextIcon}
          title={t("pharmacyOwner.reservations.emptyTitle")}
          description={t("pharmacyOwner.reservations.emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link to="/pharmacy/inventory">
                {t("pharmacyOwner.reservations.updateStock")}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div
            role="group"
            aria-label={t("pharmacyOwner.reservations.filtersLabel")}
            className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
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
                {name === "ALL"
                  ? t("reservations.all")
                  : t(`reservations.status.${name}`)}
              </Button>
            ))}
          </div>

          {/* "All" is never empty here: the list as a whole is not. */}
          {shown.length === 0 && filter !== "ALL" ? (
            <EmptyState
              icon={ReceiptTextIcon}
              title={t(`pharmacyOwner.reservations.noneFiltered.${filter}`)}
              description={t("pharmacyOwner.reservations.noneFilteredBody")}
              action={
                <Button variant="outline" onClick={() => setFilter("ALL")}>
                  {t("pharmacyOwner.reservations.showAll")}
                </Button>
              }
            />
          ) : (
            <ul
              aria-label={t("pharmacyOwner.reservations.listLabel")}
              className="grid gap-3 lg:grid-cols-2"
            >
              {shown.map((reservation) => (
                <ReservationRow
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

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <li className="relative flex items-center gap-3 rounded-3xl border bg-card p-4 focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {/* Mark as collected / Cancel live on the shared reservation page. */}
          <Link
            to="/reservations/$id"
            params={{ id: reservation.id }}
            className="font-semibold break-words outline-none after:absolute after:inset-0 after:rounded-3xl"
          >
            {reservation.customer.name}
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
            <time
              dateTime={reservation.createdAt}
              title={formatDateTime(reservation.createdAt, language)}
            >
              {formatRelative(reservation.createdAt, language)}
            </time>
          )}
        </p>
        {reservation.requiresPrescription && <RxBadge className="self-start" />}
      </div>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </li>
  )
}
