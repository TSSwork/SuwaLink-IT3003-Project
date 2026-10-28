import { Suspense, lazy, useState } from "react"
import { getRouteApi } from "@tanstack/react-router"
import { ChevronRightIcon, FlaskConicalIcon, StoreIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { AdminPharmacy, PharmacyStatus } from "@/api/types"
import type { PharmacyFilter } from "@/features/admin/pharmaciesSearch"
import {
  useAdminPharmacies,
  useApprovePharmacy,
  useRejectPharmacy,
} from "@/api/admin"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import {
  RefreshFailedNotice,
  failedWithData,
} from "@/components/feedback/RefreshFailedNotice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { PHARMACY_FILTERS } from "@/features/admin/pharmaciesSearch"
import { translateError } from "@/lib/translateError"

const MapView = lazy(() => import("@/components/map/MapView"))

const route = getRouteApi("/admin/pharmacies")

const STATUS_VARIANT: Record<
  PharmacyStatus,
  "secondary" | "default" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  VERIFIED: "default",
  REJECTED: "destructive",
  DEACTIVATED: "outline",
}

/** Every pharmacy by status; new registrations wait here for approval. */
export function PharmaciesPage() {
  const { t } = useTranslation()
  const { status = "PENDING" } = route.useSearch()
  const navigate = route.useNavigate()
  const pharmacies = useAdminPharmacies()
  const [openId, setOpenId] = useState<string | null>(null)

  const setFilter = (filter: PharmacyFilter) =>
    void navigate({ search: { status: filter }, replace: true })
  const shown =
    pharmacies.data?.filter((p) => status === "ALL" || p.status === status) ??
    []
  // Looked up from the list so the sheet shows the status after a refetch.
  const open = pharmacies.data?.find((p) => p.id === openId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("admin.pharmacies.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.pharmacies.subtitle")}
        </p>
      </div>

      <div
        role="group"
        aria-label={t("admin.pharmacies.filtersLabel")}
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {PHARMACY_FILTERS.map((name) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant={status === name ? "default" : "outline"}
            aria-pressed={status === name}
            onClick={() => setFilter(name)}
            className="shrink-0 rounded-full px-4"
          >
            {t(`admin.pharmacies.filter.${name}`)}
          </Button>
        ))}
      </div>

      {failedWithData(pharmacies) && (
        <RefreshFailedNotice onRetry={() => void pharmacies.refetch()} />
      )}
      {pharmacies.isPending ? (
        <LoadingState label={t("admin.pharmacies.loading")} rows={4} />
      ) : pharmacies.data === undefined ? (
        <ErrorState
          title={t("admin.pharmacies.loadError")}
          description={translateError(t, pharmacies.error)}
          onRetry={() => void pharmacies.refetch()}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title={t(`admin.pharmacies.none.${status}`)}
          description={t(
            status === "ALL"
              ? "admin.pharmacies.noneAllBody"
              : "admin.pharmacies.noneBody"
          )}
          action={
            status !== "ALL" && (
              <Button variant="outline" onClick={() => setFilter("ALL")}>
                {t("admin.pharmacies.showAll")}
              </Button>
            )
          }
        />
      ) : (
        <ul
          aria-label={t("admin.pharmacies.listLabel")}
          className="grid gap-3 lg:grid-cols-2"
        >
          {shown.map((pharmacy) => (
            <PharmacyRow
              key={pharmacy.id}
              pharmacy={pharmacy}
              onOpen={() => setOpenId(pharmacy.id)}
            />
          ))}
        </ul>
      )}

      <Sheet
        open={open !== undefined}
        onOpenChange={(isOpen) => !isOpen && setOpenId(null)}
      >
        {open && <PharmacySheet pharmacy={open} />}
      </Sheet>
    </div>
  )
}

function StatusBadge({ status }: { status: PharmacyStatus }) {
  const { t } = useTranslation()
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className="h-auto whitespace-normal"
    >
      {t(`pharmacyOwner.status.${status}`)}
    </Badge>
  )
}

function DemoBadge() {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className="h-auto gap-1 whitespace-normal">
      <FlaskConicalIcon className="text-highlight" aria-hidden />
      {t("admin.pharmacies.demo")}
    </Badge>
  )
}

function place(t: (key: string) => string, pharmacy: AdminPharmacy) {
  return `${pharmacy.city}, ${t(`districts.${pharmacy.district}`)}`
}

function PharmacyRow({
  pharmacy,
  onOpen,
}: {
  pharmacy: AdminPharmacy
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-3xl border bg-card p-4 text-left outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 className="font-semibold break-words">
              {pharmacy.pharmacyName}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {pharmacy.demo && <DemoBadge />}
              <StatusBadge status={pharmacy.status} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{place(t, pharmacy)}</p>
          <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>
              {t("admin.pharmacies.licence", { licence: pharmacy.licenceNo })}
            </span>
            <span className="break-all">{pharmacy.email}</span>
          </p>
        </div>
        <ChevronRightIcon
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
    </li>
  )
}

function PharmacySheet({ pharmacy }: { pharmacy: AdminPharmacy }) {
  const { t } = useTranslation()
  const approve = useApprovePharmacy()
  const reject = useRejectPharmacy()
  const busy = approve.isPending || reject.isPending
  const name = pharmacy.pharmacyName
  const onError = (error: Error) => toast.error(translateError(t, error))

  const details: Array<[string, string]> = [
    [t("admin.pharmacies.address"), pharmacy.address],
    [t("admin.pharmacies.place"), place(t, pharmacy)],
    [
      t("admin.pharmacies.phone"),
      pharmacy.phone ?? t("admin.pharmacies.notAdded"),
    ],
    [
      t("admin.pharmacies.hours"),
      pharmacy.openingHours ?? t("admin.pharmacies.notAdded"),
    ],
    [t("admin.pharmacies.licenceLabel"), pharmacy.licenceNo],
    [t("admin.pharmacies.email"), pharmacy.email],
  ]

  return (
    <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
      {/* Details scroll; the actions stay in reach at the bottom. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6">
        <SheetHeader className="pr-16">
          <SheetTitle className="break-words">{name}</SheetTitle>
          <SheetDescription>{t("admin.pharmacies.sheetBody")}</SheetDescription>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {pharmacy.demo && <DemoBadge />}
            <StatusBadge status={pharmacy.status} />
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-6">
          <dl className="grid gap-3 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              {t("admin.pharmacies.location")}
            </h3>
            <div className="h-56 overflow-hidden rounded-2xl border">
              <Suspense
                fallback={<Skeleton className="size-full rounded-none" />}
              >
                <MapView
                  value={{ lat: pharmacy.latitude, lng: pharmacy.longitude }}
                  height="100%"
                  label={t("admin.pharmacies.map", {
                    name,
                    interpolation: { escapeValue: false },
                  })}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {(pharmacy.status === "PENDING" || pharmacy.status === "REJECTED") && (
        <SheetFooter className="flex-row flex-wrap justify-end border-t">
          {pharmacy.status === "PENDING" && (
            <ConfirmButton
              label={t("admin.pharmacies.reject")}
              title={t("admin.pharmacies.rejectTitle", {
                name,
                interpolation: { escapeValue: false },
              })}
              description={t("admin.pharmacies.rejectBody")}
              destructive
              disabled={busy}
              onConfirm={() =>
                reject.mutate(pharmacy.id, {
                  onSuccess: () =>
                    toast.success(
                      t("admin.pharmacies.rejected", {
                        name,
                        interpolation: { escapeValue: false },
                      })
                    ),
                  onError,
                })
              }
            />
          )}
          <Button
            disabled={busy}
            onClick={() =>
              approve.mutate(pharmacy.id, {
                onSuccess: () =>
                  toast.success(
                    t("admin.pharmacies.approved", {
                      name,
                      interpolation: { escapeValue: false },
                    })
                  ),
                onError,
              })
            }
          >
            {t("admin.pharmacies.approve")}
          </Button>
        </SheetFooter>
      )}
    </SheetContent>
  )
}
