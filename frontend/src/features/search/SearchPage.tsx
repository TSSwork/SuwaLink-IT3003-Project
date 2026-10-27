import { Link, getRouteApi } from "@tanstack/react-router"
import { ChevronLeftIcon, ChevronRightIcon, SearchXIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useCategories } from "@/api/catalog"
import { useMedicineSearch } from "@/api/medicines"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LocationChooser } from "@/components/location/LocationChooser"
import { MedicineResultCard } from "@/components/medicine/MedicineResultCard"
import { MedicineSearchForm } from "@/components/medicine/MedicineSearchForm"
import { UploadPrescriptionButton } from "@/components/prescription/UploadPrescriptionButton"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { translateError } from "@/lib/translateError"
import { cn } from "@/lib/utils"
import { placeParams, useLocationStore } from "@/stores/locationStore"

const route = getRouteApi("/search")
const PAGE_SIZE = 20

export function SearchPage() {
  const { t } = useTranslation()
  const { q, category, page = 1 } = route.useSearch()
  const navigate = route.useNavigate()
  const location = useLocationStore()
  const categories = useCategories()
  const search = useMedicineSearch({
    q,
    categoryId: category,
    ...placeParams(location),
    page: page - 1,
    size: PAGE_SIZE,
  })

  const chooseCategory = (id: string | undefined) =>
    void navigate({
      search: (prev) => ({ ...prev, category: id, page: undefined }),
    })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t("search.title")}
      </h1>

      <div className="flex max-w-3xl flex-col gap-3">
        <MedicineSearchForm
          key={q ?? ""}
          defaultValue={q}
          onSearch={(text) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                q: text || undefined,
                page: undefined,
              }),
            })
          }
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LocationChooser />
          {location.mode === "none" && (
            <p className="text-sm text-muted-foreground">
              {t("search.locationPrompt")}
            </p>
          )}
        </div>
      </div>

      {categories.data && categories.data.length > 0 && (
        <div
          role="group"
          aria-label={t("search.categories")}
          // Scrolls sideways on phones, wraps from tablet width up.
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          <CategoryChip
            label={t("search.allCategories")}
            pressed={!category}
            onClick={() => chooseCategory(undefined)}
          />
          {categories.data.map((option) => (
            <CategoryChip
              key={option.id}
              label={option.name}
              pressed={category === option.id}
              onClick={() => chooseCategory(option.id)}
            />
          ))}
        </div>
      )}

      <section aria-labelledby="results-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="results-title" className="text-lg font-semibold">
            {q
              ? t("search.resultsFor", {
                  q,
                  interpolation: { escapeValue: false },
                })
              : t("search.allMedicines")}
          </h2>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {search.data &&
              search.data.totalElements > 0 &&
              t("search.count", { count: search.data.totalElements })}
          </p>
        </div>

        {search.isPending ? (
          <ResultSkeletons />
        ) : search.isError ? (
          <ErrorState
            title={t("search.loadError")}
            description={translateError(t, search.error)}
            onRetry={() => void search.refetch()}
          />
        ) : search.data.content.length === 0 ? (
          page > 1 && search.data.totalElements > 0 ? (
            <PastLastPage />
          ) : (
            <NoResults />
          )
        ) : (
          <>
            <ul
              aria-busy={search.isPlaceholderData}
              className={cn(
                "grid gap-3 transition-opacity md:grid-cols-2",
                search.isPlaceholderData && "opacity-60"
              )}
            >
              {search.data.content.map((result) => (
                <li key={result.medicineId}>
                  <MedicineResultCard result={result} />
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={search.data.totalPages} />
          </>
        )}
      </section>
    </div>
  )
}

function CategoryChip({
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

function ResultSkeletons() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite" className="grid gap-3 md:grid-cols-2">
      <span className="sr-only">{t("search.loading")}</span>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:p-5"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-2 h-5 w-full" />
        </div>
      ))}
    </div>
  )
}

function NoResults() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={SearchXIcon}
      title={t("search.emptyTitle")}
      description={t("search.emptyBody")}
      action={
        <div className="flex flex-col items-center gap-4">
          <div className="text-left">
            <p id="search-tips" className="text-sm font-medium">
              {t("search.tipsLabel")}
            </p>
            <ul
              aria-labelledby="search-tips"
              className="mt-1 list-disc pl-5 text-sm text-muted-foreground"
            >
              <li>{t("search.tipSpelling")}</li>
              <li>{t("search.tipGeneric")}</li>
              <li>{t("search.tipWider")}</li>
            </ul>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("search.orUpload")}
          </p>
          <UploadPrescriptionButton variant="outline" />
        </div>
      }
    />
  )
}

/** A shared or stale link to a page beyond the last one. */
function PastLastPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={SearchXIcon}
      title={t("search.pageEmptyTitle")}
      description={t("search.pageEmptyBody")}
      action={
        <Button asChild variant="outline">
          <Link
            to="/search"
            search={(prev: Record<string, unknown>) => ({
              ...prev,
              page: undefined,
            })}
          >
            {t("search.firstPage")}
          </Link>
        </Button>
      }
    />
  )
}

function Pagination({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  const to = (target: number) => ({
    to: "/search" as const,
    search: (prev: Record<string, unknown>) => ({
      ...prev,
      page: target === 1 ? undefined : target,
    }),
  })
  return (
    <nav
      aria-label={t("search.pagination")}
      className="flex items-center justify-between gap-3 pt-2"
    >
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link {...to(page - 1)}>
            <ChevronLeftIcon data-icon="inline-start" aria-hidden />
            {t("search.previous")}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground tabular-nums">
        {t("search.pageOf", { page, total: totalPages })}
      </p>
      {page < totalPages ? (
        <Button asChild variant="outline">
          <Link {...to(page + 1)}>
            {t("search.next")}
            <ChevronRightIcon data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  )
}
