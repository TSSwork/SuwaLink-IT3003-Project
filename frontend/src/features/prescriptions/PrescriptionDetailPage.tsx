import { useId } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import {
  CircleAlertIcon,
  HourglassIcon,
  SearchXIcon,
  ShoppingBasketIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { PrescriptionReply, PrescriptionRequest } from "@/api/types"
import type { CartLine } from "@/stores/cartStore"
import {
  prescriptionsKey,
  useClosePrescription,
  useDeletePrescription,
  usePrescription,
  usePrescriptionResponses,
} from "@/api/prescriptions"
import { AddToCartButton } from "@/components/cart/AddToCartButton"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { PrescriptionImage } from "@/components/prescription/PrescriptionImage"
import { PrescriptionStatusBadge } from "@/components/prescription/PrescriptionStatusBadge"
import { ScopeSummary } from "@/components/prescription/ScopeSummary"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatPrice } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useCartStore } from "@/stores/cartStore"
import { useLanguageStore } from "@/stores/languageStore"

const route = getRouteApi("/prescriptions/$id")

const isOpen = (request: PrescriptionRequest) =>
  request.status === "PENDING" || request.status === "RESPONDED"

export function PrescriptionDetailPage() {
  const { t } = useTranslation()
  const { id } = route.useParams()
  const prescription = usePrescription(id)

  if (prescription.isPending) {
    return <LoadingState label={t("prescriptions.loading")} rows={5} />
  }
  if (prescription.isError) {
    const status = (prescription.error as { status?: number }).status
    // Someone else's request answers 403; to them it does not exist.
    return status === 403 || status === 404 ? (
      <EmptyState
        icon={SearchXIcon}
        title={t("prescriptions.notFound")}
        description={t("prescriptions.notFoundBody")}
        action={
          <Button asChild variant="outline">
            <Link to="/prescriptions">{t("prescriptions.backToList")}</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState
        title={t("prescriptions.detailError")}
        description={translateError(t, prescription.error)}
        onRetry={() => void prescription.refetch()}
      />
    )
  }
  const request = prescription.data
  return (
    // Phones: details, photo, replies. Desktop: photo on the left throughout.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div className="lg:col-start-2">
        <RequestSummary request={request} />
      </div>
      <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <PrescriptionImage imageUrl={request.imageUrl} />
      </div>
      <div className="lg:col-start-2">
        <Replies request={request} />
      </div>
    </div>
  )
}

function RequestSummary({ request }: { request: PrescriptionRequest }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const close = useClosePrescription()
  const remove = useDeletePrescription()

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("prescriptions.detailTitle")}
          </h1>
          <PrescriptionStatusBadge status={request.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(request.createdAt, language)}
        </p>
        <ScopeSummary request={request} className="text-sm" />
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
        {request.note && (
          <>
            <dt className="text-muted-foreground">
              {t("prescriptions.noteLabel")}
            </dt>
            <dd className="whitespace-pre-line">{request.note}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2">
        {isOpen(request) && (
          <ConfirmButton
            label={t("prescriptions.close")}
            title={t("prescriptions.closeTitle")}
            description={t("prescriptions.closeBody")}
            disabled={close.isPending}
            onConfirm={() =>
              close.mutate(request.id, {
                onSuccess: (closed) => {
                  queryClient.setQueryData(
                    [...prescriptionsKey, request.id],
                    closed
                  )
                  toast.success(t("prescriptions.closed"))
                },
                onError: (error) => toast.error(translateError(t, error)),
              })
            }
          />
        )}
        <ConfirmButton
          label={t("prescriptions.delete")}
          confirmLabel={t("prescriptions.deleteConfirm")}
          title={t("prescriptions.deleteTitle")}
          description={t("prescriptions.deleteBody")}
          variant="ghost"
          destructive
          disabled={remove.isPending}
          onConfirm={() =>
            remove.mutate(request.id, {
              onSuccess: () => {
                toast.success(t("prescriptions.deleted"))
                void navigate({ to: "/prescriptions" })
              },
              onError: (error) => toast.error(translateError(t, error)),
            })
          }
        />
      </div>
    </section>
  )
}

function Replies({ request }: { request: PrescriptionRequest }) {
  const { t } = useTranslation()
  const replies = usePrescriptionResponses(request.id)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{t("prescriptions.replies")}</h2>
        {replies.data && replies.data.length > 1 && (
          <p className="text-sm text-muted-foreground">
            {t("prescriptions.compare")}
          </p>
        )}
      </div>
      {replies.isPending ? (
        <LoadingState rows={3} />
      ) : replies.isError ? (
        <ErrorState
          title={t("prescriptions.repliesError")}
          description={translateError(t, replies.error)}
          onRetry={() => void replies.refetch()}
        />
      ) : replies.data.length === 0 ? (
        <EmptyState
          icon={HourglassIcon}
          title={t("prescriptions.noRepliesTitle")}
          description={
            isOpen(request)
              ? t("prescriptions.noRepliesBody")
              : t("prescriptions.noRepliesClosed")
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {replies.data.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              reservable={isOpen(request)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/** A quoted line as a cart line: reserved at the quoted price, at most the quoted quantity. */
function toCartLine(
  reply: PrescriptionReply,
  item: PrescriptionReply["items"][number]
): Omit<CartLine, "quantity" | "maxQuantity"> {
  return {
    inventoryItemId: item.inventoryItemId,
    pharmacyId: reply.pharmacyId,
    pharmacyName: reply.pharmacyName,
    // The reply names the medicine but not its catalogue id.
    medicineId: "",
    medicineName: item.medicineBrandName,
    strength: "",
    unitPrice: item.unitPrice,
    // It answers a prescription, so the pharmacy will ask to see it.
    requiresPrescription: true,
    prescriptionResponseItemId: item.id,
    prescriptionRequestId: reply.prescriptionRequestId,
  }
}

function ReplyCard({
  reply,
  reservable,
}: {
  reply: PrescriptionReply
  reservable: boolean
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const titleId = useId()
  const add = useCartStore((state) => state.add)
  const inCart = useCartStore((state) =>
    state.lines.some((line) =>
      reply.items.some((item) => item.id === line.prescriptionResponseItemId)
    )
  )
  const total = reply.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )
  const canAdd = reservable && reply.pharmacyActive && reply.items.length > 0

  const addAll = () => {
    const results = reply.items.map((item) =>
      add({
        ...toCartLine(reply, item),
        quantity: item.quantity,
        maxQuantity: item.quantity,
      })
    )
    if (results.includes("limit")) toast.error(t("cart.limit", { limit: 20 }))
    else toast.success(t("cart.added"))
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-lg font-semibold">
          <Link
            to="/pharmacies/$id"
            params={{ id: reply.pharmacyId }}
            className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {reply.pharmacyName}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(reply.createdAt, language)}
        </p>
      </div>
      {!reply.pharmacyActive && (
        <p className="flex gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
          <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("prescriptions.pharmacyGone")}
        </p>
      )}
      {reply.message && (
        <blockquote className="border-l-2 border-primary/50 pl-3 text-sm whitespace-pre-line">
          {reply.message}
        </blockquote>
      )}

      <ul className="flex flex-col divide-y">
        {reply.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{item.medicineBrandName}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("prescriptions.quoteLine", {
                  quantity: item.quantity,
                  price: formatPrice(item.unitPrice, language),
                  interpolation: { escapeValue: false },
                })}
                {" · "}
                {formatPrice(item.unitPrice * item.quantity, language)}
              </span>
            </div>
            {canAdd && (
              <AddToCartButton
                className="shrink-0"
                stock={item.quantity}
                item={toCartLine(reply, item)}
              />
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <dl className="flex items-baseline gap-3">
          <dt className="text-sm text-muted-foreground">
            {t("prescriptions.replyTotal")}
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatPrice(total, language)}
          </dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          {inCart && (
            <Button asChild variant="ghost">
              <Link to="/cart">{t("prescriptions.goToCart")}</Link>
            </Button>
          )}
          {canAdd && (
            <Button onClick={addAll}>
              <ShoppingBasketIcon data-icon="inline-start" aria-hidden />
              {t("prescriptions.addAll")}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
