import { useId, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  NavigationIcon,
  PhoneIcon,
  SearchXIcon,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { Reservation } from "@/api/types"
import {
  useCancelReservation,
  useCompleteReservation,
} from "@/api/reservations"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { PharmacyPlace } from "@/components/pharmacy/PharmacyPlace"
import {
  HoldCountdown,
  useHasPassed,
} from "@/components/reservation/HoldCountdown"
import { ReservationStatusBadge } from "@/components/reservation/ReservationStatusBadge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { directionsUrl } from "@/features/pharmacy/PharmacyPage"
import { formatDateTime, formatPrice } from "@/lib/format"
import { isNotFound, translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"

const REASON_MAX = 255

/** What the QR encodes: the order page, so any phone camera opens it. */
export function pickupUrl(code: string): string {
  return `${window.location.origin}/r/${code}`
}

/** Loading / not found / error around a reservation query, shared by /reservations/$id and /r/$code. */
export function ReservationQueryView({
  query,
}: {
  query: {
    isPending: boolean
    isError: boolean
    error: unknown
    data?: Reservation
    refetch: () => unknown
  }
}) {
  const { t } = useTranslation()
  if (query.isPending) {
    return <LoadingState label={t("reservations.loading")} rows={5} />
  }
  if (query.isError || !query.data) {
    return isNotFound(query.error) ? (
      <EmptyState
        icon={SearchXIcon}
        title={t("reservations.notFound")}
        description={t("reservations.notFoundBody")}
        action={
          <Button asChild variant="outline">
            <Link to="/reservations">{t("home.seeAll")}</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState
        title={t("reservations.detailError")}
        description={translateError(t, query.error as Error)}
        onRetry={() => void query.refetch()}
      />
    )
  }
  return <ReservationView reservation={query.data} />
}

export function ReservationView({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const role = useSessionStore((state) => state.user?.role)
  const isOwner = role === "PHARMACY_OWNER"
  const active = reservation.status === "CONFIRMED"
  // The server expires holds on its own schedule; once the time is up a
  // cancel or collect would only be refused, so the buttons go.
  const holdEnded = useHasPassed(reservation.expiresAt)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("reservations.detailTitle")}
          </h1>
          <ReservationStatusBadge status={reservation.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("reservations.madeOn", {
            date: formatDateTime(reservation.createdAt, language),
          })}
        </p>
      </div>

      {active ? (
        <PickupCard reservation={reservation} />
      ) : (
        <PickupCodeLine reservation={reservation} />
      )}

      {reservation.status === "CANCELLED" && (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
          {reservation.cancelledBy === "PHARMACY"
            ? t("reservations.cancelledByPharmacy")
            : role === "CUSTOMER"
              ? t("reservations.cancelledByYou")
              : t("reservations.cancelledByCustomer")}
          {reservation.cancelReason && (
            <>
              {": "}
              <q>{reservation.cancelReason}</q>
            </>
          )}
        </p>
      )}

      {reservation.requiresPrescription && (
        <p className="flex gap-2 rounded-2xl border border-highlight/40 px-4 py-3 text-sm">
          <FileTextIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-highlight"
          />
          <span>
            <strong className="font-semibold">{t("medicine.rxNotice")}</strong>
            <br />
            {t("medicine.rxNoticeBody")}
          </span>
        </p>
      )}

      <Items reservation={reservation} />
      <PharmacyCard reservation={reservation} showCustomer={isOwner} />

      {active && !holdEnded && (role === "CUSTOMER" || isOwner) && (
        <Actions reservation={reservation} isOwner={isOwner} />
      )}
    </div>
  )
}

/** Large QR on white (scanners need dark on light in both themes), the code in words, and the hold. */
function PickupCard({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const label = t("reservations.qrLabel", { code: reservation.pickupCode })
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border bg-card p-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
      <div className="rounded-2xl bg-white p-3">
        <QRCodeSVG
          value={pickupUrl(reservation.pickupCode)}
          size={200}
          level="M"
          marginSize={2}
          // Fixed black on white, not theme tokens: scanners need dark
          // modules on a light background, in dark mode too.
          bgColor="#FFFFFF"
          fgColor="#000000"
          title={label}
          role="img"
          aria-label={label}
        />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t("reservations.showCode")}
        </p>
        <p className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t("home.pickupCode")}
          </span>
          <span className="font-mono text-2xl font-bold tracking-widest break-all">
            {reservation.pickupCode}
          </span>
        </p>
        <p className="flex flex-col gap-0.5 text-sm">
          <HoldCountdown
            expiresAt={reservation.expiresAt}
            className="font-semibold"
          />
          <span className="text-muted-foreground">
            {t("reservations.heldUntil", {
              time: formatDateTime(reservation.expiresAt, language),
            })}
          </span>
        </p>
      </div>
    </section>
  )
}

function PickupCodeLine({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
      <span className="text-muted-foreground">{t("home.pickupCode")}</span>
      <span className="font-mono text-base tracking-wider">
        {reservation.pickupCode}
      </span>
    </p>
  )
}

function Items({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{t("reservations.items")}</h2>
      <ul className="flex flex-col divide-y">
        {reservation.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 py-3 first:pt-0"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{item.medicineName}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("prescriptions.quoteLine", {
                  quantity: item.quantity,
                  price: formatPrice(item.unitPrice, language),
                  interpolation: { escapeValue: false },
                })}
              </span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatPrice(item.lineTotal, language)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="flex items-baseline justify-between gap-4 border-t pt-3">
        <dt className="font-semibold">{t("cart.total")}</dt>
        <dd className="text-lg font-bold tabular-nums">
          {formatPrice(reservation.total, language)}
        </dd>
      </dl>
      <p className="text-xs text-muted-foreground">
        {t("reservations.payAtCounter")}
      </p>
    </section>
  )
}

function PharmacyCard({
  reservation,
  showCustomer,
}: {
  reservation: Reservation
  showCustomer: boolean
}) {
  const { t } = useTranslation()
  const { pharmacy } = reservation
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">
        <Link
          to="/pharmacies/$id"
          params={{ id: pharmacy.id }}
          className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {pharmacy.name}
        </Link>
      </h2>
      <div className="flex flex-col gap-0.5 text-sm">
        <span>{pharmacy.address}</span>
        <PharmacyPlace
          city={pharmacy.city}
          district={pharmacy.district}
          className="text-muted-foreground"
        />
      </div>
      <p className="flex items-start gap-2 text-sm">
        <ClockIcon
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
        <span className="sr-only">{t("pharmacy.hours")}</span>
        {pharmacy.openingHours ? (
          <span>{pharmacy.openingHours}</span>
        ) : (
          <span className="text-muted-foreground">
            {t("pharmacy.hoursNone")}
          </span>
        )}
      </p>
      {showCustomer && (
        <dl className="flex gap-3 text-sm">
          <dt className="text-muted-foreground">
            {t("reservations.customer")}
          </dt>
          <dd>{reservation.customer.name}</dd>
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        {pharmacy.phone && (
          <Button asChild variant="outline">
            <a href={`tel:${pharmacy.phone}`}>
              <PhoneIcon data-icon="inline-start" aria-hidden />
              {pharmacy.phone}
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <a
            href={directionsUrl(pharmacy.latitude, pharmacy.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <NavigationIcon data-icon="inline-start" aria-hidden />
            {t("pharmacy.directions")}
            <span className="sr-only"> {t("pharmacy.opensInNewTab")}</span>
            <ExternalLinkIcon data-icon="inline-end" aria-hidden />
          </a>
        </Button>
      </div>
    </section>
  )
}

function Actions({
  reservation,
  isOwner,
}: {
  reservation: Reservation
  isOwner: boolean
}) {
  const { t } = useTranslation()
  const reasonId = useId()
  const [reason, setReason] = useState("")
  const cancel = useCancelReservation()
  const complete = useCompleteReservation()
  const onError = (error: Error) => toast.error(translateError(t, error))

  return (
    <div className="flex flex-wrap gap-2">
      {isOwner && (
        <ConfirmButton
          variant="default"
          label={t("reservations.complete")}
          title={t("reservations.completeTitle")}
          description={t("reservations.completeBody")}
          disabled={complete.isPending}
          onConfirm={() =>
            complete.mutate(reservation.id, {
              onSuccess: () => toast.success(t("reservations.completed")),
              onError,
            })
          }
        />
      )}
      <ConfirmButton
        label={t("reservations.cancel")}
        title={t("reservations.cancelTitle")}
        description={
          isOwner
            ? t("reservations.cancelBodyPharmacy")
            : t("reservations.cancelBody")
        }
        destructive
        disabled={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(
            { id: reservation.id, reason: reason.trim() || undefined },
            {
              onSuccess: () => toast.success(t("reservations.cancelled")),
              onError,
            }
          )
        }
      >
        <Field>
          <FieldLabel htmlFor={reasonId}>{t("reservations.reason")}</FieldLabel>
          <Textarea
            id={reasonId}
            value={reason}
            maxLength={REASON_MAX}
            rows={2}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </ConfirmButton>
    </div>
  )
}
