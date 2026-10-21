import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { MedicineSearchResult } from "@/api/types"
import { RxBadge } from "@/components/medicine/RxBadge"
import { formatDistance, formatPrice } from "@/lib/format"
import { useLanguageStore } from "@/stores/languageStore"

/** One search result: what the medicine is, how many pharmacies stock it, from what price, and how near. */
export function MedicineResultCard({
  result,
}: {
  result: MedicineSearchResult
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const raw = { interpolation: { escapeValue: false } }

  return (
    <article className="relative flex flex-col gap-4 rounded-3xl border bg-card p-4 transition-colors focus-within:ring-3 focus-within:ring-ring/30 hover:border-primary/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            {result.category}
          </p>
          <h3 className="text-lg leading-snug font-semibold">
            {/* The link covers the whole card; the badge stays readable above it. */}
            <Link
              // @ts-expect-error the medicine page route arrives in Task 4; then
              // use to="/medicines/$id" with params.
              to={`/medicines/${result.medicineId}`}
              className="outline-none after:absolute after:inset-0 after:rounded-3xl"
            >
              {result.brandName}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {[result.genericName, result.strength, result.dosageForm]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {result.requiresPrescription && <RxBadge className="shrink-0" />}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-3">
        <p className="text-base font-semibold tabular-nums">
          {t("medicine.fromPrice", {
            price: formatPrice(result.lowestPrice, language),
            ...raw,
          })}
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <li>{t("medicine.pharmacyCount", { count: result.pharmacyCount })}</li>
          {result.nearestDistanceKm !== null && (
            <li className="tabular-nums">
              {t("medicine.nearest", {
                distance: formatDistance(result.nearestDistanceKm, language),
                ...raw,
              })}
            </li>
          )}
        </ul>
      </div>
    </article>
  )
}
