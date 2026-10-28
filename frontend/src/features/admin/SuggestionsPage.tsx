import { useId, useState } from "react"
import { getRouteApi } from "@tanstack/react-router"
import { LightbulbIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { CatalogMedicine } from "@/api/types"
import type { SuggestionFilter } from "@/features/admin/suggestionsSearch"
import {
  useAdminSuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
} from "@/api/admin"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { MedicineStatusBadge } from "@/features/admin/MedicineStatusBadge"
import { SUGGESTION_FILTERS } from "@/features/admin/suggestionsSearch"
import { translateError } from "@/lib/translateError"

const route = getRouteApi("/admin/suggestions")

/** RejectMedicineRequest.reason: @NotBlank, @Size(max = 500). */
const REASON_MAX = 500

/** Medicines pharmacies suggested; an admin approves them into the catalog or rejects them with a reason. */
export function SuggestionsPage() {
  const { t } = useTranslation()
  const { status = "PENDING" } = route.useSearch()
  const navigate = route.useNavigate()
  const suggestions = useAdminSuggestions(status === "ALL" ? undefined : status)

  const setFilter = (filter: SuggestionFilter) =>
    void navigate({ search: { status: filter }, replace: true })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("admin.suggestions.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.suggestions.subtitle")}
        </p>
      </div>

      <div
        role="group"
        aria-label={t("admin.suggestions.filtersLabel")}
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {SUGGESTION_FILTERS.map((name) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant={status === name ? "default" : "outline"}
            aria-pressed={status === name}
            onClick={() => setFilter(name)}
            className="shrink-0 rounded-full px-4"
          >
            {t(`admin.suggestions.filter.${name}`)}
          </Button>
        ))}
      </div>

      {suggestions.isPending ? (
        <LoadingState label={t("admin.suggestions.loading")} rows={3} />
      ) : suggestions.isError ? (
        <ErrorState
          title={t("admin.suggestions.loadError")}
          description={translateError(t, suggestions.error)}
          onRetry={() => void suggestions.refetch()}
        />
      ) : suggestions.data.length === 0 ? (
        <EmptyState
          icon={LightbulbIcon}
          title={t(`admin.suggestions.none.${status}`)}
          description={t(
            status === "ALL"
              ? "admin.suggestions.noneAllBody"
              : "admin.suggestions.noneBody"
          )}
          action={
            status !== "ALL" && (
              <Button variant="outline" onClick={() => setFilter("ALL")}>
                {t("admin.suggestions.showAll")}
              </Button>
            )
          }
        />
      ) : (
        <ul
          aria-label={t("admin.suggestions.listLabel")}
          className="grid gap-3 lg:grid-cols-2"
        >
          {suggestions.data.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: CatalogMedicine }) {
  const { t } = useTranslation()
  const name = `${suggestion.brandName} ${suggestion.strength}`
  const pharmacy = suggestion.suggestedByPharmacyName ?? ""
  const values = { name, pharmacy, interpolation: { escapeValue: false } }
  // Toasts at hook level: the card leaves the PENDING list once reviewed.
  const approve = useApproveSuggestion({
    onSuccess: () => toast.success(t("admin.suggestions.approved", values)),
  })
  const reject = useRejectSuggestion({
    onSuccess: () => toast.success(t("admin.suggestions.rejected", values)),
  })
  const busy = approve.isPending || reject.isPending
  const onError = (error: Error) => toast.error(translateError(t, error))

  const details: Array<[string, string]> = [
    [t("pharmacyOwner.suggest.genericName"), suggestion.genericName],
    [t("pharmacyOwner.suggest.dosageForm"), suggestion.dosageForm],
    [
      t("pharmacyOwner.suggest.unitOfMeasure"),
      t(`pharmacyOwner.suggest.units.${suggestion.unitOfMeasure}`),
    ],
    [
      t("pharmacyOwner.suggest.legalCategory"),
      t(`pharmacyOwner.suggest.legal.${suggestion.legalCategory}`),
    ],
    [t("pharmacyOwner.suggest.category"), suggestion.therapeuticCategoryName],
    [t("pharmacyOwner.suggest.manufacturer"), suggestion.manufacturerName],
  ]

  return (
    <li className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="min-w-0 font-semibold break-words">{name}</h3>
          <MedicineStatusBadge status={suggestion.status} />
        </div>
        {pharmacy && (
          <p className="text-sm break-words text-muted-foreground">
            {t("admin.suggestions.suggestedBy", values)}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
        {suggestion.description && (
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-muted-foreground">
              {t("admin.suggestions.description")}
            </dt>
            <dd className="break-words whitespace-pre-line">
              {suggestion.description}
            </dd>
          </div>
        )}
        {suggestion.status === "REJECTED" && suggestion.rejectionReason && (
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-muted-foreground">
              {t("admin.suggestions.reasonGiven")}
            </dt>
            <dd className="break-words">{suggestion.rejectionReason}</dd>
          </div>
        )}
      </dl>

      {suggestion.status === "PENDING" && (
        <div className="flex flex-wrap justify-end gap-2">
          <RejectButton
            name={name}
            disabled={busy}
            onReject={(reason) =>
              reject.mutate({ id: suggestion.id, reason }, { onError })
            }
          />
          <Button
            disabled={busy}
            onClick={() => approve.mutate(suggestion.id, { onError })}
          >
            {t("admin.suggestions.approve")}
          </Button>
        </div>
      )}
    </li>
  )
}

/** Reject, asking for the reason the pharmacy is sent (1–500 characters). */
function RejectButton({
  name,
  disabled,
  onReject,
}: {
  name: string
  disabled: boolean
  onReject: (reason: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  // Kept outside the dialog, so a failed reject can be retried without retyping.
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const trimmed = reason.trim()

  return (
    <ConfirmButton
      label={t("admin.suggestions.reject")}
      title={t("admin.suggestions.rejectTitle", {
        name,
        interpolation: { escapeValue: false },
      })}
      description={t("admin.suggestions.rejectBody")}
      confirmLabel={t("admin.suggestions.rejectConfirm")}
      destructive
      disabled={disabled}
      onConfirm={(event) => {
        const problem =
          trimmed.length === 0
            ? t("admin.suggestions.reasonRequired")
            : trimmed.length > REASON_MAX
              ? t("validation.maxLength", { count: REASON_MAX })
              : null
        setError(problem)
        if (problem) {
          event.preventDefault()
          return
        }
        onReject(trimmed)
      }}
    >
      <Field data-invalid={error !== null}>
        <FieldLabel htmlFor={id}>{t("admin.suggestions.reason")}</FieldLabel>
        <Textarea
          id={id}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          aria-invalid={error !== null}
          aria-describedby={`${id}-hint`}
        />
        {error ? (
          <FieldError id={`${id}-hint`}>{error}</FieldError>
        ) : (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {t("admin.suggestions.reasonHint")}
          </p>
        )}
      </Field>
    </ConfirmButton>
  )
}
