import { useId, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  CircleAlertIcon,
  ClockIcon,
  FileTextIcon,
  ShoppingBasketIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { CartGroup, CartLine } from "@/stores/cartStore"
import type { CheckoutOutcome } from "@/features/cart/useCheckout"
import { QuantityStepper } from "@/components/cart/QuantityStepper"
import { EmptyState } from "@/components/feedback/EmptyState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckoutSummary } from "@/features/cart/CheckoutSummary"
import { isOverLimit, useCheckout } from "@/features/cart/useCheckout"
import { formatPrice } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { CART_LINE_LIMIT, groupLines, useCartStore } from "@/stores/cartStore"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"

/** Backend default (`app.reservation.hold-hours`). */
const HOLD_HOURS = 24

const subtotal = (lines: Array<CartLine>) =>
  lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

export function CartPage() {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const lines = useCartStore((state) => state.lines)
  const groups = useMemo(() => groupLines(lines), [lines])
  const { checkout, errors, busy } = useCheckout()
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null)

  const reserve = async (targets: Array<CartGroup>) => {
    const result = await checkout(targets)
    if (result.created.length > 0) setOutcome(result)
    else if (result.failed.length > 0) toast.error(t("cart.noneMade"))
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t("cart.title")}
      </h1>

      {groups.length === 0 ? (
        <EmptyState
          icon={ShoppingBasketIcon}
          title={t("cart.emptyTitle")}
          description={t("cart.emptyBody")}
          action={
            <Button asChild>
              <Link to="/search">{t("nav.findMedicine")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <PharmacyGroup
                key={group.pharmacyId}
                group={group}
                error={errors[group.pharmacyId]}
                busy={busy}
                onReserve={() => void reserve([group])}
              />
            ))}
          </div>

          <aside className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5 lg:sticky lg:top-24">
            <dl className="flex items-baseline justify-between gap-4">
              <dt className="text-base font-semibold">{t("cart.total")}</dt>
              <dd className="text-xl font-bold tabular-nums">
                {formatPrice(subtotal(lines), language)}
              </dd>
            </dl>
            <p className="text-sm text-muted-foreground">
              {t("cart.reservationCount", { count: groups.length })}
            </p>
            <p className="flex gap-2 text-sm text-muted-foreground">
              <ClockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{t("cart.holdNotice", { hours: HOLD_HOURS })}</span>
            </p>
            <ReserveAll busy={busy} onReserve={() => void reserve(groups)} />
          </aside>
        </div>
      )}

      <CheckoutSummary outcome={outcome} onClose={() => setOutcome(null)} />
    </div>
  )
}

/** "Reserve all" for customers, sign-in for visitors, a note for other roles. */
function ReserveAll({
  busy,
  onReserve,
}: {
  busy: boolean
  onReserve: () => void
}) {
  const { t } = useTranslation()
  const role = useSessionStore((state) => state.user?.role)
  if (!role) {
    return (
      <Button asChild size="lg">
        <Link to="/login" search={{ redirect: "/cart" }}>
          {t("cart.signInToReserve")}
        </Link>
      </Button>
    )
  }
  if (role !== "CUSTOMER") {
    return (
      <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
        {t("cart.customersOnly")}
      </p>
    )
  }
  return (
    <Button size="lg" disabled={busy} onClick={onReserve}>
      {busy ? t("cart.reserving") : t("cart.reserveAll")}
    </Button>
  )
}

function PharmacyGroup({
  group,
  error,
  busy,
  onReserve,
}: {
  group: CartGroup
  error: unknown
  busy: boolean
  onReserve: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const isCustomer = useSessionStore((state) => state.user?.role === "CUSTOMER")
  const titleId = useId()
  const needsRx = group.lines.some((line) => line.requiresPrescription)
  const overLimit = isOverLimit(group)

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        <Link
          to="/pharmacies/$id"
          params={{ id: group.pharmacyId }}
          className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {group.pharmacyName}
        </Link>
      </h2>

      {error !== undefined && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>{t("cart.groupFailed")}</AlertTitle>
          <AlertDescription>
            {translateError(t, error as Error)}
          </AlertDescription>
        </Alert>
      )}
      {overLimit && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertDescription>
            {t("cart.limit", { limit: CART_LINE_LIMIT })}
          </AlertDescription>
        </Alert>
      )}

      <ul className="flex flex-col divide-y">
        {group.lines.map((line) => (
          <CartLineRow key={line.inventoryItemId} line={line} />
        ))}
      </ul>

      {needsRx && (
        <p className="flex gap-2 rounded-2xl border border-highlight/40 px-4 py-3 text-sm">
          <FileTextIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-highlight"
          />
          <span>{t("medicine.rxNotice")}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <dl className="flex items-baseline gap-3">
          <dt className="text-sm text-muted-foreground">
            {t("cart.subtotal")}
          </dt>
          <dd className="font-semibold tabular-nums">
            {formatPrice(subtotal(group.lines), language)}
          </dd>
        </dl>
        {isCustomer && (
          <Button
            variant="outline"
            disabled={busy || overLimit}
            onClick={onReserve}
            aria-label={t("cart.reserveAt", {
              name: group.pharmacyName,
              interpolation: { escapeValue: false },
            })}
          >
            {t("cart.reserveHere")}
          </Button>
        )}
      </div>
    </section>
  )
}

function CartLineRow({ line }: { line: CartLine }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const remove = useCartStore((state) => state.remove)

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {line.medicineId ? (
            <Link
              to="/medicines/$id"
              params={{ id: line.medicineId }}
              className="rounded-md font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {line.medicineName}
            </Link>
          ) : (
            // A quoted line names the medicine but carries no catalogue id.
            <span className="font-medium">{line.medicineName}</span>
          )}
          {line.prescriptionResponseItemId && (
            <Badge variant="secondary" className="h-auto whitespace-normal">
              {t("cart.quoted")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[line.strength, formatPrice(line.unitPrice, language)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <QuantityStepper
          value={line.quantity}
          max={line.maxQuantity}
          onChange={(quantity) => setQuantity(line.inventoryItemId, quantity)}
        />
        <span className="min-w-24 text-right font-semibold tabular-nums">
          {formatPrice(line.unitPrice * line.quantity, language)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("cart.remove", {
            name: line.medicineName,
            interpolation: { escapeValue: false },
          })}
          onClick={() => remove(line.inventoryItemId)}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
    </li>
  )
}
