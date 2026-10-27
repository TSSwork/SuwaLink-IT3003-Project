import { useId, useState } from "react"
import { Link, getRouteApi } from "@tanstack/react-router"
import { FileTextIcon, PackageSearchIcon, SearchXIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { MedicineDetail, Offer, OfferSort } from "@/api/types"
import { useMedicine, useOffers } from "@/api/medicines"
import { AddToCartButton } from "@/components/cart/AddToCartButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { LocationChooser } from "@/components/location/LocationChooser"
import { RxBadge } from "@/components/medicine/RxBadge"
import { SaveButton } from "@/components/medicine/SaveButton"
import { StockIndicator } from "@/components/medicine/StockIndicator"
import { PharmacyPlace } from "@/components/pharmacy/PharmacyPlace"
import { UploadPrescriptionButton } from "@/components/prescription/UploadPrescriptionButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistance, formatPrice } from "@/lib/format"
import { isNotFound, translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"
import { placeParams, useLocationStore } from "@/stores/locationStore"

const route = getRouteApi("/medicines/$id")

export function MedicinePage() {
  const { t } = useTranslation()
  const { id } = route.useParams()
  const medicine = useMedicine(id)

  if (medicine.isPending) {
    return <LoadingState label={t("medicine.loading")} rows={4} />
  }
  if (medicine.isError) {
    return isNotFound(medicine.error) ? (
      <EmptyState
        icon={SearchXIcon}
        title={t("medicine.notFound")}
        description={t("medicine.notFoundBody")}
        action={<SearchLink />}
      />
    ) : (
      <ErrorState
        title={t("medicine.loadError")}
        description={translateError(t, medicine.error)}
        onRetry={() => void medicine.refetch()}
      />
    )
  }
  return (
    <div className="flex flex-col gap-8">
      <MedicineHeader medicine={medicine.data} />
      <Offers medicine={medicine.data} />
    </div>
  )
}

function SearchLink() {
  const { t } = useTranslation()
  return (
    <Button asChild variant="outline">
      <Link to="/search">{t("medicine.searchMedicines")}</Link>
    </Button>
  )
}

function MedicineHeader({ medicine }: { medicine: MedicineDetail }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {medicine.brandName}
          </h1>
          {medicine.requiresPrescription && <RxBadge />}
        </div>
        <p className="text-lg text-muted-foreground">{medicine.genericName}</p>
        <p className="text-base">
          {[medicine.strength, medicine.dosageForm].filter(Boolean).join(" · ")}
        </p>
      </div>

      <dl className="grid max-w-xl grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("medicine.manufacturer")}</dt>
        <dd>{medicine.manufacturer}</dd>
        <dt className="text-muted-foreground">{t("medicine.category")}</dt>
        <dd>{medicine.category}</dd>
      </dl>

      {medicine.description && (
        <p className="max-w-prose text-base text-muted-foreground">
          {medicine.description}
        </p>
      )}

      {medicine.requiresPrescription && (
        <Alert className="max-w-xl border-highlight/40">
          <FileTextIcon aria-hidden className="text-highlight" />
          <AlertTitle>{t("medicine.rxNotice")}</AlertTitle>
          <AlertDescription>{t("medicine.rxNoticeBody")}</AlertDescription>
        </Alert>
      )}
    </section>
  )
}

/** Pharmacies stocking it: nearest first when a point is known, else cheapest. */
function Offers({ medicine }: { medicine: MedicineDetail }) {
  const { t } = useTranslation()
  const titleId = useId()
  const location = useLocationStore()
  const hasPoint = location.mode === "point"
  const [chosen, setChosen] = useState<OfferSort>("distance")
  const sort: OfferSort = hasPoint ? chosen : "price"
  // With no place at all the backend's default order (price) applies.
  const offers = useOffers(medicine.medicineId, {
    ...placeParams(location),
    sort: location.mode === "none" ? undefined : sort,
  })

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-xl font-semibold">
            {t("medicine.offersTitle")}
          </h2>
          {offers.data && offers.data.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("medicine.offersCount", { count: offers.data.length })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocationChooser />
          {hasPoint && <SortToggle value={chosen} onChange={setChosen} />}
        </div>
      </div>
      {!hasPoint && (
        <p className="text-sm text-muted-foreground">
          {t("medicine.sortedByPrice")}
        </p>
      )}

      {offers.isPending ? (
        <OfferSkeletons />
      ) : offers.isError ? (
        <ErrorState
          title={t("medicine.offersError")}
          description={translateError(t, offers.error)}
          onRetry={() => void offers.refetch()}
        />
      ) : offers.data.length === 0 ? (
        <EmptyState
          icon={PackageSearchIcon}
          title={t("medicine.noOffersTitle")}
          description={t("medicine.noOffersBody")}
          action={<UploadPrescriptionButton variant="outline" />}
        />
      ) : (
        <ul aria-labelledby={titleId} className="grid gap-3 lg:grid-cols-2">
          {offers.data.map((offer) => (
            <OfferCard
              key={offer.inventoryId}
              offer={offer}
              medicine={medicine}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function SortToggle({
  value,
  onChange,
}: {
  value: OfferSort
  onChange: (sort: OfferSort) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const options: Array<[OfferSort, string]> = [
    ["distance", t("medicine.sortDistance")],
    ["price", t("medicine.sortPrice")],
  ]
  return (
    <RadioGroup
      aria-label={t("medicine.sortLabel")}
      value={value}
      onValueChange={(next) => onChange(next as OfferSort)}
      className="flex w-auto flex-wrap gap-x-5 gap-y-2"
    >
      {options.map(([option, label]) => (
        <div key={option} className="flex min-h-11 items-center gap-2">
          <RadioGroupItem value={option} id={`${id}-${option}`} />
          <Label htmlFor={`${id}-${option}`}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  )
}

function OfferCard({
  offer,
  medicine,
}: {
  offer: Offer
  medicine: MedicineDetail
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const { pharmacy } = offer
  return (
    <li className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            to="/pharmacies/$id"
            params={{ id: pharmacy.id }}
            className="rounded-md text-lg font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {pharmacy.name}
          </Link>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <PharmacyPlace city={pharmacy.city} district={pharmacy.district} />
            {offer.distanceKm !== null && (
              <span className="tabular-nums">
                {t("medicine.away", {
                  distance: formatDistance(offer.distanceKm, language),
                  interpolation: { escapeValue: false },
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          <span className="text-lg font-semibold tabular-nums">
            {formatPrice(offer.unitPrice, language)}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("medicine.unitPrice")}
          </span>
        </div>
      </div>
      <StockIndicator stock={offer.stockQuantity} />
      <div className="flex flex-wrap items-start justify-between gap-3 border-t pt-4">
        <AddToCartButton
          stock={offer.stockQuantity}
          item={{
            inventoryItemId: offer.inventoryId,
            pharmacyId: pharmacy.id,
            pharmacyName: pharmacy.name,
            medicineId: medicine.medicineId,
            medicineName: medicine.brandName,
            strength: medicine.strength,
            unitPrice: offer.unitPrice,
            requiresPrescription: medicine.requiresPrescription,
          }}
        />
        <SaveButton inventoryId={offer.inventoryId} />
      </div>
    </li>
  )
}

function OfferSkeletons() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite" className="grid gap-3 lg:grid-cols-2">
      <span className="sr-only">{t("medicine.offersLoading")}</span>
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:p-5"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-2 h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
