import { useId, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import {
  CalendarClockIcon,
  CalendarXIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { Control, FieldPath } from "react-hook-form"
import type { CatalogMedicine, InventoryItem } from "@/api/types"
import type {
  AddItemInput,
  AddItemValues,
  StockFieldsInput,
  StockFieldsValues,
} from "@/features/pharmacy-owner/stock"
import { ApiError } from "@/api/client"
import {
  useAddInventory,
  useApprovedMedicines,
  useDeleteInventory,
  useMyInventory,
  useSetAvailability,
  useUpdateInventory,
} from "@/api/pharmacyOwner"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { TextField } from "@/components/forms/TextField"
import { RxBadge } from "@/components/medicine/RxBadge"
import { StockIndicator } from "@/components/medicine/StockIndicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldTitle } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import {
  ADD_FIELDS,
  STOCK_FIELDS,
  addItemSchema,
  isExpired,
  isLowStock,
  localDate,
  needsExpiryAttention,
  stockFieldsSchema,
  toStockFormValues,
  toStockRequest,
} from "@/features/pharmacy-owner/stock"
import { formatDate, formatPrice } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

/** Names and dates are rendered by React, which escapes them already. */
const unescaped = { interpolation: { escapeValue: false } }

type Filter = "all" | "low" | "expiring" | "hidden"

const FILTERS: Array<[Filter, (item: InventoryItem) => boolean]> = [
  ["all", () => true],
  ["low", isLowStock],
  ["expiring", needsExpiryAttention],
  ["hidden", (item) => !item.available],
]

function displayName(medicine: { brandName: string; strength: string }) {
  return `${medicine.brandName} ${medicine.strength}`
}

export function InventoryPage() {
  const { t, i18n } = useTranslation()
  const inventory = useMyInventory()
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const searchId = useId()

  const sorted = useMemo(() => {
    const collator = new Intl.Collator(i18n.language)
    return [...(inventory.data ?? [])].sort((a, b) =>
      collator.compare(a.medicine.brandName, b.medicine.brandName)
    )
  }, [inventory.data, i18n.language])

  const needle = query.trim().toLocaleLowerCase()
  const test = FILTERS.find(([name]) => name === filter)?.[1] ?? (() => true)
  const shown = sorted.filter(
    (item) =>
      test(item) &&
      (needle === "" ||
        [item.medicine.brandName, item.medicine.genericName].some((name) =>
          name.toLocaleLowerCase().includes(needle)
        ))
  )

  const showAll = () => {
    setFilter("all")
    setQuery("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("pharmacyOwner.inventory.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("pharmacyOwner.inventory.subtitle")}
          </p>
        </div>
        {/* Waits for the stock so "In your stock" marks are reliable. */}
        <Button onClick={() => setAdding(true)} disabled={!inventory.data}>
          <PlusIcon aria-hidden />
          {t("pharmacyOwner.inventory.add")}
        </Button>
      </div>

      {inventory.isPending ? (
        <LoadingState label={t("pharmacyOwner.inventory.loading")} rows={5} />
      ) : inventory.isError ? (
        <ErrorState
          title={t("pharmacyOwner.inventory.loadError")}
          description={translateError(t, inventory.error)}
          onRetry={() => void inventory.refetch()}
        />
      ) : inventory.data.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title={t("pharmacyOwner.inventory.emptyTitle")}
          description={t("pharmacyOwner.inventory.emptyBody")}
          action={
            <Button variant="outline" asChild>
              <Link to="/pharmacy/suggest-medicine">
                {t("pharmacyOwner.inventory.suggest")}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex max-w-md flex-col gap-2">
              <label htmlFor={searchId} className="text-sm font-medium">
                {t("pharmacyOwner.inventory.searchLabel")}
              </label>
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon aria-hidden />
                </InputGroupAddon>
                <InputGroupInput
                  id={searchId}
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("pharmacyOwner.inventory.searchPlaceholder")}
                />
              </InputGroup>
            </div>
            <div
              role="group"
              aria-label={t("pharmacyOwner.inventory.filtersLabel")}
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {FILTERS.map(([name]) => (
                <Button
                  key={name}
                  type="button"
                  size="sm"
                  variant={filter === name ? "default" : "outline"}
                  aria-pressed={filter === name}
                  onClick={() => setFilter(name)}
                  className="shrink-0 rounded-full px-4"
                >
                  {t(`pharmacyOwner.inventory.filters.${name}`)}
                </Button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title={t("pharmacyOwner.inventory.noMatchTitle")}
              description={t("pharmacyOwner.inventory.noMatchBody")}
              action={
                <Button variant="outline" onClick={showAll}>
                  {t("pharmacyOwner.inventory.showAll")}
                </Button>
              }
            />
          ) : (
            <ul
              aria-label={t("pharmacyOwner.inventory.listLabel")}
              className="grid gap-3 lg:grid-cols-2"
            >
              {shown.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <AddItemForm
            stocked={inventory.data ?? []}
            onDone={() => setAdding(false)}
            onEditInstead={(item) => {
              setAdding(false)
              setEditing(item)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {editing && (
            <EditItemForm
              key={editing.id}
              item={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InventoryRow({
  item,
  onEdit,
}: {
  item: InventoryItem
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const availability = useSetAvailability(item.id)
  const remove = useDeleteInventory(item.id)
  const headingId = useId()
  const name = displayName(item.medicine)

  const toggle = (available: boolean) =>
    availability.mutate(available, {
      onError: (error) =>
        toast.error(t("pharmacyOwner.inventory.availabilityFailed"), {
          description: translateError(t, error),
        }),
    })

  const confirmDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () =>
        toast.success(
          t("pharmacyOwner.inventory.deleted", { name, ...unescaped })
        ),
      onError: (error) =>
        toast.error(t("pharmacyOwner.inventory.deleteFailed"), {
          description: translateError(t, error),
        }),
    })

  return (
    <li className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 id={headingId} className="font-semibold break-words">
            {item.medicine.brandName}{" "}
            <span className="font-normal text-muted-foreground">
              {item.medicine.strength}
            </span>
          </h3>
          {item.medicine.legalCategory !== "OTC" && <RxBadge />}
        </div>
        <p className="text-sm break-words text-muted-foreground">
          {item.medicine.genericName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-medium tabular-nums">
            {formatPrice(item.unitPrice, language)}{" "}
            <span className="font-normal text-muted-foreground">
              {t("medicine.unitPrice")}
            </span>
          </span>
          <StockIndicator stock={item.stockQuantity} />
          <ExpiryLabel item={item} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <Switch
            checked={item.available}
            disabled={availability.isPending}
            onCheckedChange={toggle}
            aria-label={t("pharmacyOwner.inventory.showLabel", {
              name,
              ...unescaped,
            })}
          />
          <span className={item.available ? "" : "text-muted-foreground"}>
            {item.available
              ? t("pharmacyOwner.inventory.shown")
              : t("pharmacyOwner.inventory.hidden")}
          </span>
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            aria-describedby={headingId}
            onClick={onEdit}
          >
            {t("pharmacyOwner.inventory.edit")}
          </Button>
          <ConfirmButton
            label={t("pharmacyOwner.inventory.delete")}
            title={t("pharmacyOwner.inventory.deleteTitle", {
              name,
              ...unescaped,
            })}
            description={t("pharmacyOwner.inventory.deleteBody")}
            onConfirm={confirmDelete}
            disabled={remove.isPending}
            destructive
          />
        </div>
      </div>
    </li>
  )
}

/** The expiry date, flagged within 30 days and "Expired" once past. */
function ExpiryLabel({ item }: { item: InventoryItem }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const date = formatDate(item.expireDate, language)
  if (isExpired(item)) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <CalendarXIcon aria-hidden className="size-4" />
        {t("pharmacyOwner.inventory.expired", { date, ...unescaped })}
      </span>
    )
  }
  if (needsExpiryAttention(item)) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        <CalendarClockIcon aria-hidden className="size-4 text-highlight" />
        {t("pharmacyOwner.inventory.expiresSoon", { date, ...unescaped })}
      </span>
    )
  }
  return (
    <span className="text-muted-foreground">
      {t("pharmacyOwner.inventory.expires", { date, ...unescaped })}
    </span>
  )
}

/** Price, stock and expiry inputs, shared by the add and edit forms. */
function StockFields<T extends StockFieldsInput>({
  control,
}: {
  control: Control<T>
}) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        control={control}
        name={"unitPrice" as FieldPath<T>}
        label={t("pharmacyOwner.inventory.unitPrice")}
        inputMode="decimal"
        autoComplete="off"
      />
      <TextField
        control={control}
        name={"stockQuantity" as FieldPath<T>}
        label={t("pharmacyOwner.inventory.stockQuantity")}
        inputMode="numeric"
        autoComplete="off"
      />
      <TextField
        control={control}
        name={"expireDate" as FieldPath<T>}
        type="date"
        min={localDate(1)}
        label={t("pharmacyOwner.inventory.expireDate")}
        className="sm:col-span-2"
      />
    </div>
  )
}

function FormFooter({
  submitLabel,
  pending,
}: {
  submitLabel: string
  pending: boolean
}) {
  const { t } = useTranslation()
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline">
          {t("common.cancel")}
        </Button>
      </DialogClose>
      <Button type="submit" disabled={pending}>
        {pending ? t("pharmacyOwner.inventory.saving") : submitLabel}
      </Button>
    </DialogFooter>
  )
}

function EditItemForm({
  item,
  onDone,
}: {
  item: InventoryItem
  onDone: () => void
}) {
  const { t } = useTranslation()
  const update = useUpdateInventory(item.id)
  const form = useForm<StockFieldsInput, unknown, StockFieldsValues>({
    resolver: zodResolver(stockFieldsSchema),
    defaultValues: toStockFormValues(item),
  })
  const name = displayName(item.medicine)

  const submit = form.handleSubmit((values) =>
    update.mutate(toStockRequest(values), {
      onSuccess: () => {
        toast.success(
          t("pharmacyOwner.inventory.saved", { name, ...unescaped })
        )
        onDone()
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          applyFieldErrors(error.fieldErrors, STOCK_FIELDS, form.setError, t)
        }
      },
    })
  )
  const banner = update.error && !hasFieldErrorFor(update.error, STOCK_FIELDS)

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle>
          {t("pharmacyOwner.inventory.editTitle", { name, ...unescaped })}
        </DialogTitle>
        <DialogDescription>
          {t("pharmacyOwner.inventory.editBody")}
        </DialogDescription>
      </DialogHeader>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <StockFields control={form.control} />
        {banner && (
          <ErrorState
            title={t("pharmacyOwner.inventory.saveFailed")}
            description={translateError(t, update.error)}
          />
        )}
        <FormFooter
          submitLabel={t("pharmacyOwner.inventory.save")}
          pending={update.isPending}
        />
      </form>
    </>
  )
}

function AddItemForm({
  stocked,
  onDone,
  onEditInstead,
}: {
  stocked: Array<InventoryItem>
  onDone: () => void
  onEditInstead: (item: InventoryItem) => void
}) {
  const { t } = useTranslation()
  const add = useAddInventory()
  const catalog = useApprovedMedicines()
  const form = useForm<AddItemInput, unknown, AddItemValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      medicineMasterId: "",
      unitPrice: "",
      stockQuantity: "",
      expireDate: "",
    },
  })
  const chosenId = form.watch("medicineMasterId")
  const chosen = catalog.data?.find((medicine) => medicine.id === chosenId)
  const medicineError = form.formState.errors.medicineMasterId?.message

  const choose = (medicine: CatalogMedicine) => {
    const existing = stocked.find((item) => item.medicine.id === medicine.id)
    if (existing) {
      onEditInstead(existing)
      return
    }
    form.setValue("medicineMasterId", medicine.id, {
      shouldValidate: form.formState.isSubmitted,
    })
  }

  const submit = form.handleSubmit((values) =>
    add.mutate(
      { medicineMasterId: values.medicineMasterId, ...toStockRequest(values) },
      {
        onSuccess: () => {
          if (chosen) {
            toast.success(
              t("pharmacyOwner.inventory.added", {
                name: displayName(chosen),
                ...unescaped,
              })
            )
          }
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            applyFieldErrors(error.fieldErrors, ADD_FIELDS, form.setError, t)
          }
        },
      }
    )
  )
  const banner = add.error && !hasFieldErrorFor(add.error, ADD_FIELDS)

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle>{t("pharmacyOwner.inventory.addTitle")}</DialogTitle>
        <DialogDescription>
          {t("pharmacyOwner.inventory.addBody")}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={submit}
        className="flex min-w-0 flex-col gap-5"
      >
        <Field data-invalid={medicineError !== undefined}>
          <FieldTitle>{t("pharmacyOwner.inventory.medicine")}</FieldTitle>
          {chosen ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-3">
              <div className="flex min-w-0 flex-col">
                <p className="font-medium break-words">{displayName(chosen)}</p>
                <p className="text-xs break-words text-muted-foreground">
                  {chosen.genericName} · {chosen.manufacturerName}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue("medicineMasterId", "")}
              >
                {t("pharmacyOwner.inventory.changeMedicine")}
              </Button>
            </div>
          ) : catalog.isPending ? (
            <LoadingState
              label={t("pharmacyOwner.inventory.catalogLoading")}
              rows={3}
            />
          ) : catalog.isError ? (
            <ErrorState
              title={t("pharmacyOwner.inventory.catalogError")}
              description={translateError(t, catalog.error)}
              onRetry={() => void catalog.refetch()}
            />
          ) : (
            <MedicinePicker
              medicines={catalog.data}
              stocked={stocked}
              onChoose={choose}
            />
          )}
          {medicineError && (
            <FieldError>
              {t(medicineError, { defaultValue: medicineError })}
            </FieldError>
          )}
        </Field>
        <StockFields control={form.control} />
        {banner && (
          <ErrorState
            title={t("pharmacyOwner.inventory.addFailed")}
            description={translateError(t, add.error)}
          />
        )}
        <FormFooter
          submitLabel={t("pharmacyOwner.inventory.addSubmit")}
          pending={add.isPending}
        />
      </form>
    </>
  )
}

/** Searchable list over the approved catalogue; stocked ones say so. */
function MedicinePicker({
  medicines,
  stocked,
  onChoose,
}: {
  medicines: Array<CatalogMedicine>
  stocked: Array<InventoryItem>
  onChoose: (medicine: CatalogMedicine) => void
}) {
  const { t } = useTranslation()
  const stockedIds = new Set(stocked.map((item) => item.medicine.id))
  return (
    <Command
      label={t("pharmacyOwner.inventory.searchCatalog")}
      className="rounded-2xl border bg-transparent"
    >
      <CommandInput
        placeholder={t("pharmacyOwner.inventory.searchCatalogPlaceholder")}
      />
      <CommandList className="max-h-56">
        <CommandEmpty className="flex flex-col items-center gap-2 px-3 py-5 text-center text-sm">
          {t("pharmacyOwner.inventory.catalogNoMatch")}
          <Link
            to="/pharmacy/suggest-medicine"
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("pharmacyOwner.inventory.suggest")}
          </Link>
        </CommandEmpty>
        {medicines.map((medicine) => (
          <CommandItem
            key={medicine.id}
            value={medicine.id}
            keywords={[
              medicine.brandName,
              medicine.genericName,
              medicine.strength,
            ]}
            onSelect={() => onChoose(medicine)}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium break-words">
                {displayName(medicine)}
              </span>
              <span className="text-xs break-words text-muted-foreground">
                {medicine.genericName}
              </span>
            </span>
            {stockedIds.has(medicine.id) && (
              <Badge variant="secondary" className="shrink-0">
                {t("pharmacyOwner.inventory.inYourStock")}
              </Badge>
            )}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  )
}
