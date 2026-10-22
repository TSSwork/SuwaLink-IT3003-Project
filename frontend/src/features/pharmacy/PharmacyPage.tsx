import { Suspense, lazy, useId, useState } from "react"
import { Link, getRouteApi } from "@tanstack/react-router"
import {
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  NavigationIcon,
  PackageOpenIcon,
  PhoneIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { PublicPharmacy, PublicPharmacyItem } from "@/api/types"
import { usePublicPharmacy } from "@/api/pharmacies"
import { AddToCartButton } from "@/components/cart/AddToCartButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { RxBadge } from "@/components/medicine/RxBadge"
import { StockIndicator } from "@/components/medicine/StockIndicator"
import { PharmacyPlace } from "@/components/pharmacy/PharmacyPlace"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/format"
import { isNotFound, translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

const MapView = lazy(() => import("@/components/map/MapView"))

const route = getRouteApi("/pharmacies/$id")

/** OpenStreetMap route planner to a point (the customer picks the start). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/directions?to=${lat},${lng}`
}

export function PharmacyPage() {
  const { t } = useTranslation()
  const { id } = route.useParams()
  const pharmacy = usePublicPharmacy(id)

  if (pharmacy.isPending) {
    return <LoadingState label={t("pharmacy.loading")} rows={4} />
  }
  if (pharmacy.isError) {
    return isNotFound(pharmacy.error) ? (
      <EmptyState
        icon={SearchXIcon}
        title={t("pharmacy.notFound")}
        description={t("pharmacy.notFoundBody")}
        action={
          <Button asChild variant="outline">
            <Link to="/search">{t("medicine.searchMedicines")}</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState
        title={t("pharmacy.loadError")}
        description={translateError(t, pharmacy.error)}
        onRetry={() => void pharmacy.refetch()}
      />
    )
  }
  return (
    <div className="flex flex-col gap-8">
      <PharmacyDetails pharmacy={pharmacy.data} />
      <Shelf pharmacy={pharmacy.data} />
    </div>
  )
}

function PharmacyDetails({ pharmacy }: { pharmacy: PublicPharmacy }) {
  const { t } = useTranslation()
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {pharmacy.name}
          </h1>
          <PharmacyPlace
            city={pharmacy.city}
            district={pharmacy.district}
            className="text-base text-muted-foreground"
          />
        </div>

        <dl className="flex flex-col gap-3 text-sm">
          <Detail icon={MapPinIcon} term={t("pharmacy.address")}>
            {pharmacy.address}
          </Detail>
          <Detail icon={ClockIcon} term={t("pharmacy.hours")}>
            {pharmacy.openingHours ?? (
              <span className="text-muted-foreground">
                {t("pharmacy.hoursNone")}
              </span>
            )}
          </Detail>
          <Detail icon={PhoneIcon} term={t("pharmacy.phone")}>
            {pharmacy.phone ? (
              <a
                href={`tel:${pharmacy.phone}`}
                aria-label={t("pharmacy.call", { phone: pharmacy.phone })}
                className="inline-flex min-h-11 items-center rounded-md font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30 sm:min-h-0"
              >
                {pharmacy.phone}
              </a>
            ) : (
              <span className="text-muted-foreground">
                {t("pharmacy.phoneNone")}
              </span>
            )}
          </Detail>
        </dl>

        <div>
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
      </div>

      {/* isolate: map panes never cover the header or menus. */}
      <div className="isolate h-56 overflow-hidden rounded-3xl border bg-muted sm:h-72">
        <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
          <MapView
            value={{ lat: pharmacy.latitude, lng: pharmacy.longitude }}
            height={288}
            label={t("pharmacy.map", {
              name: pharmacy.name,
              interpolation: { escapeValue: false },
            })}
          />
        </Suspense>
      </div>
    </section>
  )
}

function Detail({
  icon: Icon,
  term,
  children,
}: {
  icon: typeof MapPinIcon
  term: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{term}</dt>
        <dd className="text-base">{children}</dd>
      </div>
    </div>
  )
}

function matches(item: PublicPharmacyItem, query: string): boolean {
  const q = query.trim().toLocaleLowerCase()
  return (
    !q ||
    item.brandName.toLocaleLowerCase().includes(q) ||
    item.genericName.toLocaleLowerCase().includes(q)
  )
}

/** What the pharmacy has in stock, with a filter box. */
function Shelf({ pharmacy }: { pharmacy: PublicPharmacy }) {
  const { t } = useTranslation()
  const titleId = useId()
  const filterId = useId()
  const [query, setQuery] = useState("")
  const shown = pharmacy.items.filter((item) => matches(item, query))

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={titleId} className="text-xl font-semibold">
          {t("pharmacy.itemsTitle")}
        </h2>
        {pharmacy.items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("pharmacy.itemCount", { count: pharmacy.items.length })}
          </p>
        )}
      </div>

      {pharmacy.items.length === 0 ? (
        <EmptyState
          icon={PackageOpenIcon}
          title={t("pharmacy.emptyTitle")}
          description={t("pharmacy.emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link to="/search">{t("medicine.searchMedicines")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex max-w-md flex-col gap-2">
            <label htmlFor={filterId} className="text-sm font-medium">
              {t("pharmacy.filter")}
            </label>
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id={filterId}
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("pharmacy.filterPlaceholder")}
              />
              {query && shown.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t("pharmacy.clearFilter")}
                    onClick={() => setQuery("")}
                  >
                    <XIcon aria-hidden />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed px-5 py-4">
              <p className="text-sm text-muted-foreground">
                {t("pharmacy.noMatch", {
                  q: query.trim(),
                  interpolation: { escapeValue: false },
                })}
              </p>
              <Button variant="outline" onClick={() => setQuery("")}>
                {t("pharmacy.clearFilter")}
              </Button>
            </div>
          ) : (
            <ul
              aria-labelledby={titleId}
              className="flex flex-col divide-y overflow-hidden rounded-3xl border bg-card"
            >
              {shown.map((item) => (
                <ShelfItem
                  key={item.inventoryId}
                  item={item}
                  pharmacy={pharmacy}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function ShelfItem({
  item,
  pharmacy,
}: {
  item: PublicPharmacyItem
  pharmacy: PublicPharmacy
}) {
  const language = useLanguageStore((state) => state.language)
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/medicines/$id"
            params={{ id: item.medicineId }}
            className="rounded-md font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {item.brandName}
          </Link>
          {item.requiresPrescription && <RxBadge />}
        </div>
        <p className="text-sm text-muted-foreground">
          {[item.genericName, item.strength, item.dosageForm]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold tabular-nums">
            {formatPrice(item.unitPrice, language)}
          </span>
          <StockIndicator stock={item.stockQuantity} />
        </div>
      </div>
      <AddToCartButton
        className="shrink-0"
        stock={item.stockQuantity}
        item={{
          inventoryItemId: item.inventoryId,
          pharmacyId: pharmacy.id,
          pharmacyName: pharmacy.name,
          medicineId: item.medicineId,
          medicineName: item.brandName,
          strength: item.strength,
          unitPrice: item.unitPrice,
          requiresPrescription: item.requiresPrescription,
        }}
      />
    </li>
  )
}
