import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  LightbulbIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { CatalogMedicine, MedicineStatus } from "@/api/types"
import type { SelectOption } from "@/components/forms/SelectField"
import type {
  MedicineMasterInput,
  MedicineMasterValues,
} from "@/components/medicine/medicineMasterSchema"
import { ApiError } from "@/api/client"
import { useCategories, useManufacturers } from "@/api/catalog"
import { useMySuggestions, useSuggestMedicine } from "@/api/pharmacyOwner"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import {
  RefreshFailedNotice,
  failedWithData,
} from "@/components/feedback/RefreshFailedNotice"
import { MedicineMasterFields } from "@/components/medicine/MedicineMasterFields"
import {
  EMPTY_MEDICINE_MASTER,
  MEDICINE_MASTER_FIELDS,
  medicineMasterSchema,
  toMedicineMasterRequest,
} from "@/components/medicine/medicineMasterSchema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import { translateError } from "@/lib/translateError"

export function SuggestMedicinePage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("pharmacyOwner.suggest.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("pharmacyOwner.suggest.subtitle")}
        </p>
      </div>
      <SuggestionFormSection />
      <MySuggestions />
    </div>
  )
}

function SuggestionFormSection() {
  const { t } = useTranslation()
  const categories = useCategories()
  const manufacturers = useManufacturers()

  if (categories.isPending || manufacturers.isPending) {
    return <LoadingState rows={6} />
  }
  if (categories.isError || manufacturers.isError) {
    return (
      <ErrorState
        title={t("pharmacyOwner.suggest.optionsError")}
        description={translateError(
          t,
          categories.error ?? manufacturers.error ?? {}
        )}
        onRetry={() => {
          if (categories.isError) void categories.refetch()
          if (manufacturers.isError) void manufacturers.refetch()
        }}
      />
    )
  }
  return (
    <SuggestionForm
      categories={categories.data.map(({ id, name }) => ({
        value: id,
        label: name,
      }))}
      manufacturers={manufacturers.data.map(({ id, name }) => ({
        value: id,
        label: name,
      }))}
    />
  )
}

function SuggestionForm({
  categories,
  manufacturers,
}: {
  categories: Array<SelectOption>
  manufacturers: Array<SelectOption>
}) {
  const { t } = useTranslation()
  const suggest = useSuggestMedicine()
  const form = useForm<MedicineMasterInput, unknown, MedicineMasterValues>({
    resolver: zodResolver(medicineMasterSchema),
    defaultValues: EMPTY_MEDICINE_MASTER,
  })

  const submit = form.handleSubmit((values) =>
    suggest.mutate(toMedicineMasterRequest(values), {
      onSuccess: () => {
        toast.success(t("pharmacyOwner.suggest.sent"))
        form.reset(EMPTY_MEDICINE_MASTER)
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          applyFieldErrors(
            error.fieldErrors,
            MEDICINE_MASTER_FIELDS,
            form.setError,
            t
          )
        }
      },
    })
  )
  const banner =
    suggest.error && !hasFieldErrorFor(suggest.error, MEDICINE_MASTER_FIELDS)

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-3xl border bg-card p-4 sm:p-6"
    >
      <MedicineMasterFields
        control={form.control}
        categories={categories}
        manufacturers={manufacturers}
      />
      {banner && (
        <ErrorState
          title={t("pharmacyOwner.suggest.sendFailed")}
          description={translateError(t, suggest.error)}
        />
      )}
      <Button type="submit" className="self-start" disabled={suggest.isPending}>
        {suggest.isPending
          ? t("pharmacyOwner.suggest.sending")
          : t("pharmacyOwner.suggest.submit")}
      </Button>
    </form>
  )
}

function MySuggestions() {
  const { t } = useTranslation()
  const suggestions = useMySuggestions()
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h3 id={titleId} className="text-lg font-semibold">
        {t("pharmacyOwner.suggest.mineTitle")}
      </h3>
      {failedWithData(suggestions) && (
        <RefreshFailedNotice onRetry={() => void suggestions.refetch()} />
      )}
      {suggestions.isPending ? (
        <LoadingState label={t("pharmacyOwner.suggest.mineLoading")} rows={3} />
      ) : suggestions.data === undefined ? (
        <ErrorState
          title={t("pharmacyOwner.suggest.mineError")}
          description={translateError(t, suggestions.error)}
          onRetry={() => void suggestions.refetch()}
        />
      ) : suggestions.data.length === 0 ? (
        <EmptyState
          icon={LightbulbIcon}
          title={t("pharmacyOwner.suggest.mineEmptyTitle")}
          description={t("pharmacyOwner.suggest.mineEmptyBody")}
        />
      ) : (
        <ul aria-labelledby={titleId} className="flex flex-col gap-3">
          {suggestions.data.map((suggestion) => (
            <SuggestionRow key={suggestion.id} suggestion={suggestion} />
          ))}
        </ul>
      )}
    </section>
  )
}

const STATUS_STYLE: Record<
  MedicineStatus,
  { icon: typeof ClockIcon; variant: "outline" | "default" | "destructive" }
> = {
  PENDING: { icon: ClockIcon, variant: "outline" },
  APPROVED: { icon: CircleCheckIcon, variant: "default" },
  REJECTED: { icon: CircleXIcon, variant: "destructive" },
}

function SuggestionRow({ suggestion }: { suggestion: CatalogMedicine }) {
  const { t } = useTranslation()
  const { icon: Icon, variant } = STATUS_STYLE[suggestion.status]
  return (
    <li className="flex flex-col gap-2 rounded-3xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 font-semibold break-words">
          {suggestion.brandName} {suggestion.strength}
        </p>
        <Badge variant={variant} className="shrink-0">
          <Icon aria-hidden />
          {t(`pharmacyOwner.suggest.status.${suggestion.status}`)}
        </Badge>
      </div>
      <p className="text-sm break-words text-muted-foreground">
        {suggestion.genericName} · {suggestion.manufacturerName}
      </p>
      {suggestion.status === "REJECTED" && suggestion.rejectionReason && (
        <p className="text-sm break-words">
          <span className="font-medium">
            {t("pharmacyOwner.suggest.reason")}
          </span>{" "}
          {suggestion.rejectionReason}
        </p>
      )}
      {suggestion.status === "APPROVED" && (
        <p className="text-sm text-muted-foreground">
          {t("pharmacyOwner.suggest.approvedHint")}{" "}
          <Link
            to="/pharmacy/inventory"
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline pointer-fine:min-h-0"
          >
            {t("pharmacyOwner.suggest.goToInventory")}
          </Link>
        </p>
      )}
    </li>
  )
}
