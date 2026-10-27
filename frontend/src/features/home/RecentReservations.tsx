import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Reservation } from "@/api/types"
import { useMyReservations } from "@/api/reservations"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { ReservationStatusBadge } from "@/components/reservation/ReservationStatusBadge"
import { Button } from "@/components/ui/button"
import { formatPrice, formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

const SHOWN = 3

/** The signed-in customer's latest reservations (the API lists newest first). */
export function RecentReservations() {
  const { t } = useTranslation()
  const reservations = useMyReservations()

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recent-title" className="text-xl font-semibold">
          {t("home.recentTitle")}
        </h2>
        {reservations.data && reservations.data.length > 0 && (
          <Button asChild variant="ghost">
            <Link to="/reservations">
              {t("home.seeAll")}
              <ChevronRightIcon data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        )}
      </div>

      {reservations.isPending ? (
        <LoadingState rows={3} />
      ) : reservations.isError ? (
        <ErrorState
          title={t("home.recentError")}
          description={translateError(t, reservations.error)}
          onRetry={() => void reservations.refetch()}
        />
      ) : reservations.data.length === 0 ? (
        <p className="rounded-3xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
          {t("home.recentEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-3xl border bg-card">
          {reservations.data.slice(0, SHOWN).map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const items = reservation.items.length
  return (
    <li>
      <Link
        to="/reservations/$id"
        params={{ id: reservation.id }}
        className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset sm:px-5"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{reservation.pharmacy.name}</span>
            <ReservationStatusBadge status={reservation.status} />
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {t("home.pickupCode")}{" "}
              <span className="font-mono text-foreground">
                {reservation.pickupCode}
              </span>
            </span>
            <span>{t("home.itemCount", { count: items })}</span>
            <span className="tabular-nums">
              {formatPrice(reservation.total, language)}
            </span>
            <span>{formatRelative(reservation.createdAt, language)}</span>
          </p>
        </div>
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  )
}
