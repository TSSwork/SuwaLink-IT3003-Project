import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  LightbulbIcon,
} from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import type { Control } from "react-hook-form"
import type {
  CatalogMedicine,
  MedicineMasterRequest,
  MedicineStatus,
} from "@/api/types"
import { ApiError } from "@/api/client"
import { useCategories, useManufacturers } from "@/api/catalog"
import { useMySuggestions, useSuggestMedicine } from "@/api/pharmacyOwner"
import { SUGGESTABLE_LEGAL_CATEGORIES, UNITS_OF_MEASURE } from "@/api/types"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { TextField } from "@/components/forms/TextField"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import { translateError } from "@/lib/translateError"

/**
 * Mirrors MedicineMasterRequest: the @NotBlank / @NotNull fields are required;
 * 255 is the column length. Field names match the DTO so server field errors
 * land on them. Messages are i18n keys.
 */
const text = z
  .string()
  .trim()
  .min(1, "validation.required")
  .max(255, "validation.tooLong")
const chosen = z.string().min(1, "validation.required")

const suggestionSchema = z.object({
  brandName: text,
  genericName: text,
  dosageForm: text,
  strength: text,
  unitOfMeasure: z
    .string()
    .pipe(z.enum(UNITS_OF_MEASURE, "validation.required")),
  description: z.string().trim(),
  therapeuticCategoryId: chosen,
  manufacturerId: chosen,
  legalCategory: z
    .string()
    .pipe(z.enum(SUGGESTABLE_LEGAL_CATEGORIES, "validation.required")),
})
type SuggestionInput = z.input<typeof suggestionSchema>
type SuggestionValues = z.infer<typeof suggestionSchema>
type SuggestionControl = Control<SuggestionInput, unknown, SuggestionValues>

const FIELDS = [
  "brandName",
  "genericName",
  "dosageForm",
  "strength",
  "unitOfMeasure",
  "description",
  "therapeuticCategoryId",
  "manufacturerId",
  "legalCategory",
] as const satisfies ReadonlyArray<keyof SuggestionInput>

const EMPTY: SuggestionInput = {
  brandName: "",
  genericName: "",
  dosageForm: "",
  strength: "",
  unitOfMeasure: "",
  description: "",
  therapeuticCategoryId: "",
  manufacturerId: "",
  legalCategory: "",
}

function toRequest(values: SuggestionValues): MedicineMasterRequest {
  return { ...values, description: values.description || null }
}

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

interface Option {
  value: string
  label: string
}

function SuggestionForm({
  categories,
  manufacturers,
}: {
  categories: Array<Option>
  manufacturers: Array<Option>
}) {
  const { t } = useTranslation()
  const suggest = useSuggestMedicine()
  const form = useForm<SuggestionInput, unknown, SuggestionValues>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: EMPTY,
  })

  const submit = form.handleSubmit((values) =>
    suggest.mutate(toRequest(values), {
      onSuccess: () => {
        toast.success(t("pharmacyOwner.suggest.sent"))
        form.reset(EMPTY)
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          applyFieldErrors(error.fieldErrors, FIELDS, form.setError, t)
        }
      },
    })
  )
  const banner = suggest.error && !hasFieldErrorFor(suggest.error, FIELDS)

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-3xl border bg-card p-4 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="brandName"
          label={t("pharmacyOwner.suggest.brandName")}
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="genericName"
          label={t("pharmacyOwner.suggest.genericName")}
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="dosageForm"
          label={t("pharmacyOwner.suggest.dosageForm")}
          description={t("pharmacyOwner.suggest.dosageFormHint")}
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="strength"
          label={t("pharmacyOwner.suggest.strength")}
          description={t("pharmacyOwner.suggest.strengthHint")}
          autoComplete="off"
        />
        <SelectField
          control={form.control}
          name="unitOfMeasure"
          label={t("pharmacyOwner.suggest.unitOfMeasure")}
          options={UNITS_OF_MEASURE.map((unit) => ({
            value: unit,
            label: t(`pharmacyOwner.suggest.units.${unit}`),
          }))}
        />
        <SelectField
          control={form.control}
          name="legalCategory"
          label={t("pharmacyOwner.suggest.legalCategory")}
          options={SUGGESTABLE_LEGAL_CATEGORIES.map((category) => ({
            value: category,
            label: t(`pharmacyOwner.suggest.legal.${category}`),
          }))}
        />
        <SelectField
          control={form.control}
          name="therapeuticCategoryId"
          label={t("pharmacyOwner.suggest.category")}
          options={categories}
        />
        <SelectField
          control={form.control}
          name="manufacturerId"
          label={t("pharmacyOwner.suggest.manufacturer")}
          options={manufacturers}
        />
      </div>
      <DescriptionField control={form.control} />
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

function SelectField({
  control,
  name,
  label,
  options,
}: {
  control: SuggestionControl
  name:
    | "unitOfMeasure"
    | "legalCategory"
    | "therapeuticCategoryId"
    | "manufacturerId"
  label: string
  options: Array<Option>
}) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              name={field.name}
            >
              <SelectTrigger
                id={id}
                ref={field.ref}
                onBlur={field.onBlur}
                className="w-full"
                aria-invalid={fieldState.invalid}
                aria-describedby={message ? errorId : undefined}
              >
                <SelectValue placeholder={t("pharmacyOwner.suggest.choose")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {message && (
              <FieldError id={errorId}>
                {t(message, { defaultValue: message })}
              </FieldError>
            )}
          </Field>
        )
      }}
    />
  )
}

function DescriptionField({ control }: { control: SuggestionControl }) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      control={control}
      name="description"
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>
              {t("pharmacyOwner.suggest.description")}
            </FieldLabel>
            <Textarea
              id={id}
              {...field}
              rows={3}
              aria-invalid={fieldState.invalid}
              aria-describedby={message ? errorId : undefined}
            />
            {message && (
              <FieldError id={errorId}>
                {t(message, { defaultValue: message })}
              </FieldError>
            )}
          </Field>
        )
      }}
    />
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
      {suggestions.isPending ? (
        <LoadingState label={t("pharmacyOwner.suggest.mineLoading")} rows={3} />
      ) : suggestions.isError ? (
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
