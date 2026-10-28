import { useId, useState } from "react"
import { getRouteApi } from "@tanstack/react-router"
import {
  FactoryIcon,
  FolderTreeIcon,
  PillIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { UseQueryResult } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { TFunction } from "i18next"
import type { CatalogKind } from "@/api/admin"
import type {
  AdminCategory,
  AdminManufacturer,
  CatalogMedicine,
} from "@/api/types"
import type { TranslatableError } from "@/lib/translateError"
import { useAdminCatalog, useDeleteCatalogEntry } from "@/api/admin"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CategoryForm,
  ManufacturerForm,
  MedicineForm,
} from "@/features/admin/CatalogForms"
import { MedicineStatusBadge } from "@/features/admin/MedicineStatusBadge"
import { CATALOG_TABS } from "@/features/admin/catalogSearch"
import { translateError } from "@/lib/translateError"

const route = getRouteApi("/admin/catalog")

/** The medicine catalog pharmacies stock from, with its categories and manufacturers. */
export function CatalogPage() {
  const { t } = useTranslation()
  const { tab = "medicines" } = route.useSearch()
  const navigate = route.useNavigate()

  const setTab = (next: string) =>
    void navigate({
      search: {
        tab:
          next === "categories" || next === "manufacturers" ? next : undefined,
      },
      replace: true,
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("admin.catalog.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.catalog.subtitle")}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList
          aria-label={t("admin.catalog.tabsLabel")}
          // Scrolls sideways when the labels don't fit (Tamil at 360 px).
          className="h-auto max-w-full [scrollbar-width:none] justify-start overflow-x-auto"
        >
          {CATALOG_TABS.map((kind) => (
            <TabsTrigger
              key={kind}
              value={kind}
              className="min-h-9 flex-none px-3"
            >
              {t(`admin.catalog.tab.${kind}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="medicines">
          <MedicinesTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="manufacturers">
          <ManufacturersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function includes(values: Array<string | null>, q: string) {
  return values.some((value) => value?.toLowerCase().includes(q))
}

function MedicinesTab() {
  return (
    <CatalogTab
      kind="medicines"
      icon={PillIcon}
      entries={useAdminCatalog("medicines")}
      nameOf={(m) => `${m.brandName} ${m.strength}`}
      matches={(m, q) =>
        includes(
          [
            m.brandName,
            m.genericName,
            m.manufacturerName,
            m.therapeuticCategoryName,
          ],
          q
        )
      }
      Details={MedicineDetails}
      Form={MedicineForm}
    />
  )
}

function CategoriesTab() {
  return (
    <CatalogTab
      kind="categories"
      icon={FolderTreeIcon}
      entries={useAdminCatalog("categories")}
      nameOf={(c) => c.name}
      matches={(c, q) => includes([c.name, c.parentCategoryName], q)}
      Details={CategoryDetails}
      Form={CategoryForm}
    />
  )
}

function ManufacturersTab() {
  return (
    <CatalogTab
      kind="manufacturers"
      icon={FactoryIcon}
      entries={useAdminCatalog("manufacturers")}
      nameOf={(m) => m.name}
      matches={(m, q) => includes([m.name, m.country, m.licenseNumber], q)}
      Details={ManufacturerDetails}
      Form={ManufacturerForm}
    />
  )
}

interface CatalogTabProps<TEntry extends { id: string }> {
  kind: CatalogKind
  icon: LucideIcon
  entries: UseQueryResult<Array<TEntry>>
  nameOf: (entry: TEntry) => string
  /** Whether the entry matches `q`, already lower case. */
  matches: (entry: TEntry, q: string) => boolean
  Details: (props: { entry: TEntry }) => ReactNode
  Form: (props: { entry?: TEntry; onDone: () => void }) => ReactNode
}

/** One searchable list with add, edit and delete. */
function CatalogTab<TEntry extends { id: string }>({
  kind,
  icon,
  entries,
  nameOf,
  matches,
  Details,
  Form,
}: CatalogTabProps<TEntry>) {
  const { t } = useTranslation()
  const searchId = useId()
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TEntry | null>(null)
  const q = query.trim().toLowerCase()
  const shown = entries.data?.filter((entry) => !q || matches(entry, q)) ?? []

  const add = (
    <Button onClick={() => setAdding(true)}>
      <PlusIcon aria-hidden />
      {t(`admin.catalog.add.${kind}`)}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full max-w-md flex-col gap-2">
          <label htmlFor={searchId} className="text-sm font-medium">
            {t(`admin.catalog.search.${kind}`)}
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
              placeholder={t(`admin.catalog.searchPlaceholder.${kind}`)}
            />
          </InputGroup>
        </div>
        <div className="shrink-0">{add}</div>
      </div>

      {entries.isPending ? (
        <LoadingState label={t(`admin.catalog.loading.${kind}`)} rows={4} />
      ) : entries.isError ? (
        <ErrorState
          title={t(`admin.catalog.loadError.${kind}`)}
          description={translateError(t, entries.error)}
          onRetry={() => void entries.refetch()}
        />
      ) : shown.length === 0 ? (
        q ? (
          <EmptyState
            icon={SearchIcon}
            title={t("admin.catalog.noMatch", {
              q: query.trim(),
              interpolation: { escapeValue: false },
            })}
            description={t("admin.catalog.noMatchBody")}
            action={
              <Button variant="outline" onClick={() => setQuery("")}>
                {t("admin.catalog.clearSearch")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={icon}
            title={t(`admin.catalog.none.${kind}`)}
            description={t(`admin.catalog.noneBody.${kind}`)}
            action={add}
          />
        )
      ) : (
        <ul
          aria-label={t(`admin.catalog.tab.${kind}`)}
          className="grid gap-3 lg:grid-cols-2"
        >
          {shown.map((entry) => (
            <CatalogRow
              key={entry.id}
              kind={kind}
              id={entry.id}
              name={nameOf(entry)}
              onEdit={() => setEditing(entry)}
            >
              <Details entry={entry} />
            </CatalogRow>
          ))}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          {adding && <Form onDone={() => setAdding(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          {editing && (
            <Form
              key={editing.id}
              entry={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** DATA_CONFLICT on delete means medicines or stock still use the entry. */
function deleteError(
  t: TFunction,
  kind: CatalogKind,
  error: TranslatableError
) {
  return error.code === "DATA_CONFLICT"
    ? t(`admin.catalog.inUse.${kind}`)
    : translateError(t, error)
}

function CatalogRow({
  kind,
  id,
  name,
  onEdit,
  children,
}: {
  kind: CatalogKind
  id: string
  name: string
  onEdit: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const values = { name, interpolation: { escapeValue: false } }
  // The toast is at hook level: the row is gone once the list refetches.
  const remove = useDeleteCatalogEntry(kind, {
    onSuccess: () => toast.success(t("admin.catalog.deleted", values)),
  })
  return (
    <li className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="font-semibold break-words">{name}</h3>
        {children}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmButton
          label={t("admin.catalog.delete")}
          title={t("admin.catalog.deleteTitle", values)}
          description={t(`admin.catalog.deleteBody.${kind}`)}
          variant="ghost"
          destructive
          disabled={remove.isPending}
          onConfirm={() =>
            remove.mutate(id, {
              onError: (error) => toast.error(deleteError(t, kind, error)),
            })
          }
        />
        <Button variant="outline" onClick={onEdit}>
          {t("admin.catalog.edit")}
        </Button>
      </div>
    </li>
  )
}

function InactiveBadge() {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className="h-auto whitespace-normal">
      {t("admin.catalog.inactive")}
    </Badge>
  )
}

function MedicineDetails({ entry }: { entry: CatalogMedicine }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <MedicineStatusBadge status={entry.status} />
        <Badge variant="outline" className="h-auto whitespace-normal">
          {t(`pharmacyOwner.suggest.legal.${entry.legalCategory}`)}
        </Badge>
      </div>
      <p className="text-sm break-words text-muted-foreground">
        {entry.genericName} · {entry.dosageForm}
      </p>
      <p className="text-sm break-words text-muted-foreground">
        {entry.therapeuticCategoryName} · {entry.manufacturerName}
      </p>
      {entry.suggestedByPharmacyName && (
        <p className="text-sm break-words text-muted-foreground">
          {t("admin.suggestions.suggestedBy", {
            pharmacy: entry.suggestedByPharmacyName,
            interpolation: { escapeValue: false },
          })}
        </p>
      )}
    </>
  )
}

function CategoryDetails({ entry }: { entry: AdminCategory }) {
  const { t } = useTranslation()
  return (
    <>
      {!entry.active && (
        <div className="flex flex-wrap gap-1.5">
          <InactiveBadge />
        </div>
      )}
      {entry.parentCategoryName && (
        <p className="text-sm break-words text-muted-foreground">
          {t("admin.catalog.under", {
            name: entry.parentCategoryName,
            interpolation: { escapeValue: false },
          })}
        </p>
      )}
      {entry.description && (
        <p className="text-sm break-words text-muted-foreground">
          {entry.description}
        </p>
      )}
    </>
  )
}

function ManufacturerDetails({ entry }: { entry: AdminManufacturer }) {
  return (
    <>
      {!entry.active && (
        <div className="flex flex-wrap gap-1.5">
          <InactiveBadge />
        </div>
      )}
      <p className="flex flex-col text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3">
        {[entry.country, entry.licenseNumber, entry.contactEmail, entry.phone]
          .filter(Boolean)
          .map((value) => (
            <span key={value} className="break-all">
              {value}
            </span>
          ))}
      </p>
    </>
  )
}
