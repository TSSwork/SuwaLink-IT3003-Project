import { Link } from "@tanstack/react-router"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { CheckoutOutcome } from "@/features/cart/useCheckout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatPrice } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

/** What checkout did: the reservations made (with pickup codes) and what stayed in the cart. */
export function CheckoutSummary({
  outcome,
  onClose,
}: {
  outcome: CheckoutOutcome | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const created = outcome?.created ?? []
  const failed = outcome?.failed ?? []
  const total = created.length + failed.length

  const title =
    total === 1
      ? t("cart.summaryOne")
      : failed.length === 0
        ? t("cart.summaryAll", { count: created.length })
        : t("cart.summarySome", { made: created.length, total })

  return (
    <Dialog open={outcome !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("cart.summaryBody")}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          {created.map(({ group, reservation }) => (
            <li
              key={reservation.id}
              className="flex flex-col gap-2 rounded-2xl border bg-card p-4"
            >
              <p className="flex items-center gap-2 font-medium">
                <CircleCheckIcon aria-hidden className="size-4 text-primary" />
                {group.pharmacyName}
              </p>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  {t("home.pickupCode")}
                </span>
                <span className="font-mono text-base tracking-wider">
                  {reservation.pickupCode}
                </span>
                <span className="tabular-nums">
                  {formatPrice(reservation.total, language)}
                </span>
              </p>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link
                  to="/reservations/$id"
                  params={{ id: reservation.id }}
                  onClick={onClose}
                >
                  {t("cart.viewReservation")}
                </Link>
              </Button>
            </li>
          ))}
          {failed.map(({ group, error }) => (
            <li
              key={group.pharmacyId}
              className="flex gap-2 rounded-2xl border border-destructive/40 p-4 text-sm"
            >
              <CircleAlertIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-destructive"
              />
              <span>
                {t("cart.stillInCart", {
                  name: group.pharmacyName,
                  reason: translateError(t, error as Error),
                  interpolation: { escapeValue: false },
                })}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
