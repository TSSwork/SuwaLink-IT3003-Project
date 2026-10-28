import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import type { ReactNode } from "react"
import type { TFunction } from "i18next"
import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import type { CatalogKind, CatalogRequest } from "@/api/admin"
import type {
  AdminCategory,
  AdminManufacturer,
  CatalogMedicine,
} from "@/api/types"
import type {
  MedicineMasterInput,
  MedicineMasterValues,
} from "@/components/medicine/medicineMasterSchema"
import { ApiError } from "@/api/client"
import { useAdminCatalog, useSaveCatalogEntry } from "@/api/admin"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { SelectField } from "@/components/forms/SelectField"
import { TextField } from "@/components/forms/TextField"
import { TextareaField } from "@/components/forms/TextareaField"
import { MedicineMasterFields } from "@/components/medicine/MedicineMasterFields"
import {
  EMPTY_MEDICINE_MASTER,
  MEDICINE_MASTER_FIELDS,
  medicineMasterInput,
  medicineMasterSchema,
  toMedicineMasterRequest,
} from "@/components/medicine/medicineMasterSchema"
import { Button } from "@/components/ui/button"
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import { translateError } from "@/lib/translateError"

interface FormProps<TEntry> {
  /** The entry to edit; adds a new one when left out. */
  entry?: TEntry
  onDone: () => void
}

// 255 is the column length of every short text in the catalog tables.
const required = z
  .string()
  .trim()
  .min(1, "validation.required")
  .max(255, "validation.tooLong")
const optional = z.string().trim().max(255, "validation.tooLong")

/** Empty optional text is sent as null, like the other forms. */
function orNull(value: string) {
  return value || null
}

/**
 * Saves the form's request, then closes the dialog with a toast naming the
 * entry. Server field errors go under their fields, anything else into a
 * banner, and what was typed stays.
 */
function useSaveForm<
  TInput extends FieldValues,
  TValues extends FieldValues,
  TKind extends CatalogKind,
>({
  kind,
  id,
  form,
  fields,
  toRequest,
  nameOf,
  onDone,
}: {
  kind: TKind
  id?: string
  form: UseFormReturn<TInput, unknown, TValues>
  fields: ReadonlyArray<Path<TInput>>
  toRequest: (values: TValues) => CatalogRequest<TKind>
  nameOf: (values: TValues) => string
  onDone: () => void
}) {
  const { t } = useTranslation()
  const save = useSaveCatalogEntry(kind)
  const submit = form.handleSubmit((values) =>
    save.mutate(
      { id, body: toRequest(values) },
      {
        onSuccess: () => {
          toast.success(
            t(id ? "admin.catalog.saved" : "admin.catalog.added", {
              name: nameOf(values),
              interpolation: { escapeValue: false },
            })
          )
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            applyFieldErrors(error.fieldErrors, fields, form.setError, t)
          }
        },
      }
    )
  )
  const banner =
    save.error && !hasFieldErrorFor(save.error, fields)
      ? translateError(t, save.error)
      : null
  return { submit, banner, pending: save.isPending }
}

function FormShell({
  title,
  description,
  submit,
  banner,
  pending,
  children,
}: {
  title: string
  description: string
  submit: () => void
  banner: string | null
  pending: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader className="pr-10">
        <DialogTitle className="break-words">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
      {banner && (
        <ErrorState
          title={t("admin.catalog.saveFailed")}
          description={banner}
        />
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("common.cancel")}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? t("admin.catalog.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  )
}

function titleFor(t: TFunction, kind: CatalogKind, name?: string) {
  return name
    ? t("admin.catalog.editTitle", {
        name,
        interpolation: { escapeValue: false },
      })
    : t(`admin.catalog.addTitle.${kind}`)
}

/** Options of a catalog list; inactive entries are offered but marked. */
function options(
  t: TFunction,
  entries: Array<{ id: string; name: string; active: boolean }>
) {
  return entries.map(({ id, name, active }) => ({
    value: id,
    label: active
      ? name
      : t("admin.catalog.inactiveOption", {
          name,
          interpolation: { escapeValue: false },
        }),
  }))
}

/** Add or edit a catalog medicine (MedicineMasterRequest), like a pharmacy's suggestion. */
export function MedicineForm({ entry, onDone }: FormProps<CatalogMedicine>) {
  const { t } = useTranslation()
  const categories = useAdminCatalog("categories")
  const manufacturers = useAdminCatalog("manufacturers")

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
    <MedicineFormFields
      entry={entry}
      onDone={onDone}
      categories={options(t, categories.data)}
      manufacturers={options(t, manufacturers.data)}
    />
  )
}

function MedicineFormFields({
  entry,
  onDone,
  categories,
  manufacturers,
}: FormProps<CatalogMedicine> & {
  categories: Array<{ value: string; label: string }>
  manufacturers: Array<{ value: string; label: string }>
}) {
  const { t } = useTranslation()
  const form = useForm<MedicineMasterInput, unknown, MedicineMasterValues>({
    resolver: zodResolver(medicineMasterSchema),
    defaultValues: entry ? medicineMasterInput(entry) : EMPTY_MEDICINE_MASTER,
  })
  const { submit, banner, pending } = useSaveForm({
    kind: "medicines",
    id: entry?.id,
    form,
    fields: MEDICINE_MASTER_FIELDS,
    // PUT replaces every field; the form doesn't offer the image, so keep it.
    toRequest: (values) => ({
      ...toMedicineMasterRequest(values),
      ...(entry && { imageUrl: entry.imageUrl }),
    }),
    nameOf: (values) => `${values.brandName} ${values.strength}`,
    onDone,
  })
  return (
    <FormShell
      title={titleFor(
        t,
        "medicines",
        entry && `${entry.brandName} ${entry.strength}`
      )}
      description={t("admin.catalog.formBody.medicines")}
      submit={submit}
      banner={banner}
      pending={pending}
    >
      <MedicineMasterFields
        control={form.control}
        categories={categories}
        manufacturers={manufacturers}
      />
    </FormShell>
  )
}

/** Radix Select has no empty value; a top-level category picks this. */
const NO_PARENT = "none"

const categorySchema = z.object({
  name: required,
  description: z.string().trim(),
  parentCategoryId: z.string(),
})
type CategoryInput = z.input<typeof categorySchema>
type CategoryValues = z.infer<typeof categorySchema>
const CATEGORY_FIELDS = [
  "name",
  "description",
  "parentCategoryId",
] as const satisfies ReadonlyArray<keyof CategoryInput>

/** Add or edit a category (CategoryRequest). */
export function CategoryForm({ entry, onDone }: FormProps<AdminCategory>) {
  const { t } = useTranslation()
  const categories = useAdminCatalog("categories")
  const form = useForm<CategoryInput, unknown, CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: entry?.name ?? "",
      description: entry?.description ?? "",
      parentCategoryId: entry?.parentCategoryId ?? NO_PARENT,
    },
  })
  const { submit, banner, pending } = useSaveForm({
    kind: "categories",
    id: entry?.id,
    form,
    fields: CATEGORY_FIELDS,
    toRequest: (values) => ({
      name: values.name,
      description: orNull(values.description),
      parentCategoryId:
        values.parentCategoryId === NO_PARENT ? null : values.parentCategoryId,
    }),
    nameOf: (values) => values.name,
    onDone,
  })
  // A category can't sit under itself.
  const parents = (categories.data ?? []).filter((c) => c.id !== entry?.id)
  return (
    <FormShell
      title={titleFor(t, "categories", entry?.name)}
      description={t("admin.catalog.formBody.categories")}
      submit={submit}
      banner={banner}
      pending={pending}
    >
      <TextField
        control={form.control}
        name="name"
        label={t("admin.catalog.field.name")}
        autoComplete="off"
      />
      <SelectField
        control={form.control}
        name="parentCategoryId"
        label={t("admin.catalog.field.parent")}
        options={[
          { value: NO_PARENT, label: t("admin.catalog.field.noParent") },
          ...options(t, parents),
        ]}
      />
      <TextareaField
        control={form.control}
        name="description"
        label={t("admin.catalog.field.description")}
      />
    </FormShell>
  )
}

const manufacturerSchema = z.object({
  name: required,
  country: required,
  licenseNumber: optional,
  contactEmail: optional,
  phone: optional,
})
type ManufacturerInput = z.input<typeof manufacturerSchema>
type ManufacturerValues = z.infer<typeof manufacturerSchema>
const MANUFACTURER_FIELDS = [
  "name",
  "country",
  "licenseNumber",
  "contactEmail",
  "phone",
] as const satisfies ReadonlyArray<keyof ManufacturerInput>

/** Add or edit a manufacturer (ManufacturerRequest). */
export function ManufacturerForm({
  entry,
  onDone,
}: FormProps<AdminManufacturer>) {
  const { t } = useTranslation()
  const form = useForm<ManufacturerInput, unknown, ManufacturerValues>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      name: entry?.name ?? "",
      country: entry?.country ?? "",
      licenseNumber: entry?.licenseNumber ?? "",
      contactEmail: entry?.contactEmail ?? "",
      phone: entry?.phone ?? "",
    },
  })
  const { submit, banner, pending } = useSaveForm({
    kind: "manufacturers",
    id: entry?.id,
    form,
    fields: MANUFACTURER_FIELDS,
    toRequest: (values) => ({
      name: values.name,
      country: values.country,
      licenseNumber: orNull(values.licenseNumber),
      contactEmail: orNull(values.contactEmail),
      phone: orNull(values.phone),
    }),
    nameOf: (values) => values.name,
    onDone,
  })
  return (
    <FormShell
      title={titleFor(t, "manufacturers", entry?.name)}
      description={t("admin.catalog.formBody.manufacturers")}
      submit={submit}
      banner={banner}
      pending={pending}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="name"
          label={t("admin.catalog.field.name")}
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="country"
          label={t("admin.catalog.field.country")}
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="licenseNumber"
          label={t("admin.catalog.field.licenseNumber")}
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="phone"
          label={t("admin.catalog.field.phone")}
          type="tel"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="contactEmail"
          label={t("admin.catalog.field.contactEmail")}
          type="email"
          autoComplete="off"
          className="sm:col-span-2"
        />
      </div>
    </FormShell>
  )
}
