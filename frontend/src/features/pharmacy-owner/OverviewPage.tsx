import { Link } from "@tanstack/react-router"
import {
  CalendarClockIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  InboxIcon,
  PackageIcon,
  PackageOpenIcon,
  ReceiptTextIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import type {
  InventoryItem,
  PrescriptionReply,
  PrescriptionRequest,
  Reservation,
} from "@/api/types"
import {
  useMyInventory,
  useMyReplies,
  usePharmacyRequests,
  usePharmacyReservations,
} from "@/api/pharmacyOwner"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { HoldCountdown } from "@/components/reservation/HoldCountdown"
import { Skeleton } from "@/components/ui/skeleton"
import {
  isLowStock,
  needsExpiryAttention,
} from "@/features/pharmacy-owner/stock"
import { formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

const LIST_SIZE = 5

/** Requests this pharmacy has not replied to yet, oldest first (longest waiting). */
function waitingRequests(
  requests: Array<PrescriptionRequest>,
  replies: Array<PrescriptionReply>
): Array<PrescriptionRequest> {
  const replied = new Set(replies.map((reply) => reply.prescriptionRequestId))
  return requests
    .filter((request) => !replied.has(request.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Confirmed reservations, the hold that ends first on top. */
function pickups(reservations: Array<Reservation>): Array<Reservation> {
  return reservations
    .filter((reservation) => reservation.status === "CONFIRMED")
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
}

function stockCounts(items: Array<InventoryItem>) {
  return {
    low: items.filter(isLowStock).length,
    expiring: items.filter(needsExpiryAttention).length,
  }
}

export function OverviewPage() {
  const { t } = useTranslation()
  const requests = usePharmacyRequests()
  const replies = useMyReplies()
  const reservations = usePharmacyReservations()
  const inventory = useMyInventory()

  const waiting =
    requests.data && replies.data
      ? waitingRequests(requests.data, replies.data)
      : undefined
  const due = reservations.data ? pickups(reservations.data) : undefined
  const stock = inventory.data ? stockCounts(inventory.data) : undefined

  const requestsError = requests.error ?? replies.error
  const retryRequests = () => {
    if (requests.isError) void requests.refetch()
    if (replies.isError) void replies.refetch()
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">{t("pharmacyOwner.overview.title")}</h2>
      <section
        aria-label={t("pharmacyOwner.overview.atAGlance")}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            to="/pharmacy/requests"
            icon={InboxIcon}
            label={t("pharmacyOwner.overview.stats.waiting")}
            value={waiting?.length}
            failed={requestsError !== null}
          />
          <StatCard
            to="/pharmacy/reservations"
            icon={ReceiptTextIcon}
            label={t("pharmacyOwner.overview.stats.confirmed")}
            value={due?.length}
            failed={reservations.isError}
          />
          <StatCard
            to="/pharmacy/inventory"
            icon={PackageIcon}
            label={t("pharmacyOwner.overview.stats.lowStock")}
            value={stock?.low}
            failed={inventory.isError}
          />
          <StatCard
            to="/pharmacy/inventory"
            icon={CalendarClockIcon}
            label={t("pharmacyOwner.overview.stats.expiring")}
            value={stock?.expiring}
            failed={inventory.isError}
          />
        </div>
        {inventory.isError && (
          <ErrorState
            title={t("pharmacyOwner.overview.stockError")}
            description={translateError(t, inventory.error)}
            onRetry={() => void inventory.refetch()}
          />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <ListSection
          title={t("pharmacyOwner.overview.waitingTitle")}
          seeAll="/pharmacy/requests"
        >
          {(titleId) =>
            requestsError ? (
              <ErrorState
                title={t("pharmacyOwner.overview.waitingError")}
                description={translateError(t, requestsError)}
                onRetry={retryRequests}
              />
            ) : !waiting ? (
              <LoadingState rows={3} />
            ) : waiting.length === 0 ? (
              <EmptyState
                icon={ClipboardListIcon}
                title={t("pharmacyOwner.overview.waitingEmptyTitle")}
                description={t("pharmacyOwner.overview.waitingEmptyBody")}
              />
            ) : (
              <ul aria-labelledby={titleId} className="flex flex-col gap-3">
                {waiting.slice(0, LIST_SIZE).map((request) => (
                  <RequestRow key={request.id} request={request} />
                ))}
              </ul>
            )
          }
        </ListSection>

        <ListSection
          title={t("pharmacyOwner.overview.pickupsTitle")}
          seeAll="/pharmacy/reservations"
        >
          {(titleId) =>
            reservations.isError ? (
              <ErrorState
                title={t("pharmacyOwner.overview.pickupsError")}
                description={translateError(t, reservations.error)}
                onRetry={() => void reservations.refetch()}
              />
            ) : !due ? (
              <LoadingState rows={3} />
            ) : due.length === 0 ? (
              <EmptyState
                icon={PackageOpenIcon}
                title={t("pharmacyOwner.overview.pickupsEmptyTitle")}
                description={t("pharmacyOwner.overview.pickupsEmptyBody")}
              />
            ) : (
              <ul aria-labelledby={titleId} className="flex flex-col gap-3">
                {due.slice(0, LIST_SIZE).map((reservation) => (
                  <PickupRow key={reservation.id} reservation={reservation} />
                ))}
              </ul>
            )
          }
        </ListSection>
      </div>
    </div>
  )
}

function StatCard({
  to,
  icon: Icon,
  label,
  value,
  failed,
}: {
  to: "/pharmacy/requests" | "/pharmacy/reservations" | "/pharmacy/inventory"
  icon: LucideIcon
  label: string
  value: number | undefined
  failed: boolean
}) {
  return (
    <Link
      to={to}
      className="flex min-h-11 flex-col gap-2 rounded-3xl border bg-card p-4 outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5"
    >
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
    </Link>
  )
}

function ListSection({
  title,
  seeAll,
  children,
}: {
  title: string
  seeAll: "/pharmacy/requests" | "/pharmacy/reservations"
  children: (titleId: string) => ReactNode
}) {
  const { t } = useTranslation()
  const titleId = `overview-${seeAll.replaceAll("/", "-")}`
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={titleId} className="text-lg font-semibold">
          {title}
        </h3>
        <Link
          to={seeAll}
          aria-label={t("pharmacyOwner.overview.seeAllLabel", {
            section: title,
            interpolation: { escapeValue: false },
          })}
          className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t("pharmacyOwner.overview.seeAll")}
        </Link>
      </div>
      {children(titleId)}
    </section>
  )
}

function RequestRow({ request }: { request: PrescriptionRequest }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <li className="relative flex items-center gap-3 rounded-3xl border bg-card p-4 focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to="/pharmacy/requests/$id"
          params={{ id: request.id }}
          className="font-semibold outline-none after:absolute after:inset-0 after:rounded-3xl"
        >
          {t("pharmacyOwner.overview.patientAge", {
            count: request.patientAge,
          })}
        </Link>
        <p className="line-clamp-2 text-sm break-words text-muted-foreground">
          {request.note ?? t("pharmacyOwner.overview.noNote")}
        </p>
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

function PickupRow({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  return (
    <li className="relative flex items-center gap-3 rounded-3xl border bg-card p-4 focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to="/reservations/$id"
          params={{ id: reservation.id }}
          className="font-semibold break-words outline-none after:absolute after:inset-0 after:rounded-3xl"
        >
          {reservation.customer.name}
        </Link>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted-foreground">{t("home.pickupCode")}</span>
          <span className="font-mono tracking-wider">
            {reservation.pickupCode}
          </span>
        </p>
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>
            {t("home.itemCount", { count: reservation.items.length })}
          </span>
          <HoldCountdown
            expiresAt={reservation.expiresAt}
            className="font-medium text-foreground"
          />
        </p>
      </div>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </li>
  )
}
