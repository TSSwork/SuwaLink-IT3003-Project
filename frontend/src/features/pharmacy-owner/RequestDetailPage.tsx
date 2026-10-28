import { useId, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import {
  CircleAlertIcon,
  LockIcon,
  PackageIcon,
  SearchXIcon,
  SendIcon,
  XIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type {
  InventoryItem,
  PrescriptionReply,
  PrescriptionRequest,
} from "@/api/types"
import { ApiError } from "@/api/client"
import {
  pharmacyOwnerKey,
  useMyInventory,
  useMyReply,
  usePharmacyRequest,
  useSendReply,
  useUpdateReply,
} from "@/api/pharmacyOwner"
import { QuantityStepper } from "@/components/cart/QuantityStepper"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { PrescriptionImage } from "@/components/prescription/PrescriptionImage"
import { ScopeSummary } from "@/components/prescription/ScopeSummary"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { isExpired } from "@/features/pharmacy-owner/stock"
import { formatDateTime, formatPrice } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

const route = getRouteApi("/pharmacy/requests/$id")

/** CreatePrescriptionResponseRequest.message: @Size(max = 1000). */
export const REPLY_MESSAGE_MAX = 1000

/** Names are rendered by React, which escapes them already. */
const unescaped = { interpolation: { escapeValue: false } }

const isOpen = (request: PrescriptionRequest) =>
  request.status === "PENDING" || request.status === "RESPONDED"

/** What a pharmacy can quote: shown to customers, in stock and not past its expiry. */
const isOfferable = (item: InventoryItem) =>
  item.available && item.stockQuantity > 0 && !isExpired(item)

const displayName = (item: InventoryItem) =>
  `${item.medicine.brandName} ${item.medicine.strength}`

export function RequestDetailPage() {
  const { t } = useTranslation()
  const { id } = route.useParams()
  const request = usePharmacyRequest(id)

  if (request.isPending) {
    return <LoadingState label={t("pharmacyOwner.request.loading")} rows={5} />
  }
  if (request.isError) {
    const status = (request.error as { status?: number }).status
    // A request sent to other pharmacies answers 403; here it does not exist.
    return status === 403 || status === 404 ? (
      <EmptyState
        icon={SearchXIcon}
        title={t("pharmacyOwner.request.notFound")}
        description={t("pharmacyOwner.request.notFoundBody")}
        action={
          <Button asChild variant="outline">
            <Link to="/pharmacy/requests">
              {t("pharmacyOwner.request.back")}
            </Link>
          </Button>
        }
      />
    ) : (
      <ErrorState
        title={t("pharmacyOwner.request.loadError")}
        description={translateError(t, request.error)}
        onRetry={() => void request.refetch()}
      />
    )
  }
  return (
    // Phones: details, photo, reply. Desktop: photo on the left throughout.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div className="lg:col-start-2">
        <RequestSummary request={request.data} />
      </div>
      <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <PrescriptionImage
          imageUrl={request.data.imageUrl}
          alt={t("pharmacyOwner.request.imageAlt")}
        />
      </div>
      <div className="lg:col-start-2">
        <ReplySection request={request.data} />
      </div>
    </div>
  )
}

function RequestSummary({ request }: { request: PrescriptionRequest }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("pharmacyOwner.request.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("pharmacyOwner.request.received", {
            date: formatDateTime(request.createdAt, language),
            ...unescaped,
          })}
        </p>
        <ScopeSummary
          request={request}
          className="text-sm text-muted-foreground"
        />
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("prescriptions.age")}</dt>
        <dd>{request.patientAge}</dd>
        {request.expiresAt && isOpen(request) && (
          <>
            <dt className="text-muted-foreground">
              {t("prescriptions.openUntil")}
            </dt>
            <dd>{formatDateTime(request.expiresAt, language)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">
          {t("prescriptions.noteLabel")}
        </dt>
        <dd className="break-words whitespace-pre-line">
          {request.note ?? t("pharmacyOwner.overview.noNote")}
        </dd>
      </dl>
    </section>
  )
}

function ReplySection({ request }: { request: PrescriptionRequest }) {
  const { t } = useTranslation()
  const inventory = useMyInventory()
  const mine = useMyReply(request.id)

  const error = inventory.error ?? mine.error
  if (error) {
    return (
      <ErrorState
        title={t(
          inventory.isError
            ? "pharmacyOwner.reply.inventoryError"
            : "pharmacyOwner.reply.loadError"
        )}
        description={translateError(t, error)}
        onRetry={() => {
          if (inventory.isError) void inventory.refetch()
          if (mine.isError) void mine.refetch()
        }}
      />
    )
  }
  if (!inventory.data || mine.data === undefined) {
    return <LoadingState label={t("pharmacyOwner.reply.loading")} rows={4} />
  }
  return (
    <ReplyBuilder
      request={request}
      inventory={inventory.data}
      existing={mine.data}
    />
  )
}

interface DraftLine {
  inventoryItemId: string
  quantity: number
  /** From the existing reply, for an item no longer in the inventory. */
  name: string
}

function initialLines(
  existing: PrescriptionReply | null,
  byId: Map<string, InventoryItem>
): Array<DraftLine> {
  return (existing?.items ?? []).map((item) => {
    const stocked = byId.get(item.inventoryItemId)
    return {
      inventoryItemId: item.inventoryItemId,
      quantity:
        stocked && isOfferable(stocked)
          ? Math.min(item.quantity, stocked.stockQuantity)
          : item.quantity,
      name: item.medicineBrandName,
    }
  })
}

/**
 * Builds the reply from the pharmacy's own stock. It stays mounted while the
 * request is refetched, so a draft survives the request closing meanwhile
 * (it then turns read-only).
 */
function ReplyBuilder({
  request,
  inventory,
  existing,
}: {
  request: PrescriptionRequest
  inventory: Array<InventoryItem>
  existing: PrescriptionReply | null
}) {
  const { t, i18n } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const queryClient = useQueryClient()
  const titleId = useId()
  const messageId = useId()
  const send = useSendReply(request.id)
  const update = useUpdateReply(request.id)
  const saving = send.isPending || update.isPending

  const byId = useMemo(
    () => new Map(inventory.map((item) => [item.id, item])),
    [inventory]
  )
  const [lines, setLines] = useState(() => initialLines(existing, byId))
  const [message, setMessage] = useState(existing?.message ?? "")
  const [failure, setFailure] = useState<string | null>(null)

  const readOnly = !isOpen(request)
  const picked = new Set(lines.map((line) => line.inventoryItemId))
  const collator = new Intl.Collator(i18n.language)
  const offerable = inventory
    .filter(isOfferable)
    .sort((a, b) => collator.compare(displayName(a), displayName(b)))
  const options = offerable.filter((item) => !picked.has(item.id))

  const usable = (line: DraftLine) => {
    const item = byId.get(line.inventoryItemId)
    return item && isOfferable(item) ? item : undefined
  }
  const nameOf = (line: DraftLine) => {
    const item = byId.get(line.inventoryItemId)
    return item ? displayName(item) : line.name
  }
  // Editing quotes today's inventory price (the server re-prices on save);
  // a read-only reply shows what the customer was quoted.
  const quoted = new Map(
    existing?.items.map((item) => [item.inventoryItemId, item.unitPrice])
  )
  const priceOf = (line: DraftLine) =>
    (readOnly ? quoted.get(line.inventoryItemId) : undefined) ??
    usable(line)?.unitPrice
  const total = lines.reduce(
    (sum, line) => sum + (priceOf(line) ?? 0) * line.quantity,
    0
  )
  const canSend =
    !readOnly &&
    !saving &&
    lines.length > 0 &&
    lines.every((line) => usable(line)) &&
    message.length <= REPLY_MESSAGE_MAX

  const setQuantity = (id: string, quantity: number) =>
    setLines((current) =>
      current.map((line) =>
        line.inventoryItemId === id ? { ...line, quantity } : line
      )
    )
  const remove = (id: string) =>
    setLines((current) => current.filter((line) => line.inventoryItemId !== id))
  const add = (item: InventoryItem) =>
    setLines((current) => [
      ...current,
      { inventoryItemId: item.id, quantity: 1, name: displayName(item) },
    ])

  const submit = () => {
    setFailure(null)
    const body = {
      message: message.trim(),
      items: lines.map(({ inventoryItemId, quantity }) => ({
        inventoryItemId,
        quantity,
      })),
    }
    const mutation = existing ? update : send
    mutation.mutate(body, {
      onSuccess: () =>
        toast.success(
          t(
            existing
              ? "pharmacyOwner.reply.updated"
              : "pharmacyOwner.reply.sent"
          )
        ),
      onError: (error) => {
        const code = error instanceof ApiError ? error.code : undefined
        setFailure(
          code === "DUPLICATE"
            ? t(
                existing
                  ? "pharmacyOwner.reply.locked"
                  : "pharmacyOwner.reply.alreadyReplied"
              )
            : translateError(t, error)
        )
        // Closed meanwhile, or replied from another tab: show the server's view,
        // keeping what was typed.
        if (code === "REQUEST_CLOSED" || code === "DUPLICATE") {
          void queryClient.invalidateQueries({
            queryKey: [...pharmacyOwnerKey, "requests", request.id],
          })
        }
      },
    })
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-lg font-semibold">
          {t("pharmacyOwner.reply.title")}
        </h3>
        {!readOnly && (
          <p className="text-sm text-muted-foreground">
            {t(
              existing
                ? "pharmacyOwner.reply.subtitleUpdate"
                : "pharmacyOwner.reply.subtitleNew"
            )}
          </p>
        )}
      </div>

      {readOnly && (
        <Alert>
          <LockIcon aria-hidden />
          <AlertDescription>
            {t(
              request.status === "EXPIRED"
                ? "pharmacyOwner.reply.expiredNotice"
                : "pharmacyOwner.reply.closedNotice"
            )}
          </AlertDescription>
        </Alert>
      )}

      {!readOnly &&
        (offerable.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title={t("pharmacyOwner.reply.noStockTitle")}
            description={t("pharmacyOwner.reply.noStockBody")}
            action={
              <Button asChild variant="outline">
                <Link to="/pharmacy/inventory">
                  {t("pharmacyOwner.reply.toInventory")}
                </Link>
              </Button>
            }
          />
        ) : (
          <Command
            label={t("pharmacyOwner.reply.searchLabel")}
            className="rounded-2xl border bg-transparent"
          >
            <CommandInput
              placeholder={t("pharmacyOwner.reply.searchPlaceholder")}
            />
            <CommandList className="max-h-56">
              <CommandEmpty className="px-3 py-5 text-center text-sm">
                {t(
                  options.length === 0
                    ? "pharmacyOwner.reply.allPicked"
                    : "pharmacyOwner.reply.noMatch"
                )}
              </CommandEmpty>
              {options.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  keywords={[
                    item.medicine.brandName,
                    item.medicine.genericName,
                    item.medicine.strength,
                  ]}
                  onSelect={() => add(item)}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium break-words">
                      {displayName(item)}
                    </span>
                    <span className="text-xs break-words text-muted-foreground">
                      {item.medicine.genericName}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end text-xs tabular-nums">
                    <span className="font-medium">
                      {formatPrice(item.unitPrice, language)}
                    </span>
                    <span className="text-muted-foreground">
                      {t("pharmacyOwner.reply.inStock", {
                        count: item.stockQuantity,
                      })}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        ))}

      {lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          {t(
            readOnly
              ? "pharmacyOwner.reply.notReplied"
              : "pharmacyOwner.reply.noItems"
          )}
        </p>
      ) : (
        <ul
          aria-label={t("pharmacyOwner.reply.itemsLabel")}
          className="flex flex-col divide-y rounded-3xl border bg-card px-4"
        >
          {lines.map((line) => (
            <ReplyLine
              key={line.inventoryItemId}
              line={line}
              name={nameOf(line)}
              unitPrice={priceOf(line)}
              stock={usable(line)?.stockQuantity}
              readOnly={readOnly}
              onQuantity={(quantity) =>
                setQuantity(line.inventoryItemId, quantity)
              }
              onRemove={() => remove(line.inventoryItemId)}
            />
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <dl className="flex items-baseline justify-between gap-3 px-1">
          <dt className="text-sm text-muted-foreground">
            {t("pharmacyOwner.reply.total")}
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatPrice(total, language)}
          </dd>
        </dl>
      )}

      <Field>
        <FieldLabel htmlFor={messageId}>
          {t("pharmacyOwner.reply.message")}
        </FieldLabel>
        <Textarea
          id={messageId}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={REPLY_MESSAGE_MAX}
          rows={3}
          disabled={readOnly}
          placeholder={t("pharmacyOwner.reply.messagePlaceholder")}
        />
        <FieldDescription>
          {t("prescriptions.noteHint", {
            used: message.length,
            max: REPLY_MESSAGE_MAX,
          })}
        </FieldDescription>
      </Field>

      {failure && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className="w-full sm:w-auto"
        >
          <SendIcon data-icon="inline-start" aria-hidden />
          {saving
            ? t("pharmacyOwner.reply.sending")
            : t(
                existing
                  ? "pharmacyOwner.reply.update"
                  : "pharmacyOwner.reply.send"
              )}
        </Button>
      </div>
    </section>
  )
}

function ReplyLine({
  line,
  name,
  unitPrice,
  stock,
  readOnly,
  onQuantity,
  onRemove,
}: {
  line: DraftLine
  name: string
  /** Undefined when there is no price to show (item gone and never quoted). */
  unitPrice: number | undefined
  /** Undefined once the item is hidden, sold out, expired or deleted. */
  stock: number | undefined
  readOnly: boolean
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const capped = stock !== undefined && line.quantity >= stock

  return (
    <li aria-label={name} className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium break-words">{name}</span>
          {unitPrice !== undefined && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("prescriptions.quoteLine", {
                quantity: line.quantity,
                price: formatPrice(unitPrice, language),
                ...unescaped,
              })}
            </span>
          )}
        </div>
        {readOnly ? (
          unitPrice !== undefined && (
            <span className="shrink-0 font-semibold tabular-nums">
              {formatPrice(unitPrice * line.quantity, language)}
            </span>
          )
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("pharmacyOwner.reply.remove", {
              name,
              ...unescaped,
            })}
            onClick={onRemove}
            className="-mr-2 shrink-0"
          >
            <XIcon aria-hidden />
          </Button>
        )}
      </div>

      {readOnly ? null : stock !== undefined && unitPrice !== undefined ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <QuantityStepper
              value={line.quantity}
              onChange={onQuantity}
              max={stock}
            />
            <span
              className={
                capped
                  ? "text-xs font-medium text-foreground"
                  : "text-xs text-muted-foreground"
              }
            >
              {t(
                capped
                  ? "pharmacyOwner.reply.allInStock"
                  : "pharmacyOwner.reply.inStock",
                { count: stock }
              )}
            </span>
          </div>
          <span className="font-semibold tabular-nums">
            {formatPrice(unitPrice * line.quantity, language)}
          </span>
        </div>
      ) : (
        <p className="flex gap-2 rounded-2xl bg-muted px-3 py-2 text-sm">
          <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("pharmacyOwner.reply.gone")}
        </p>
      )}
    </li>
  )
}
