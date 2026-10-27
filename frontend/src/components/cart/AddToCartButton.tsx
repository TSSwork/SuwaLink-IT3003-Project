import { useState } from "react"
import { ShoppingBasketIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { QuantityStepper } from "@/components/cart/QuantityStepper"
import { Button } from "@/components/ui/button"
import type { CartLine } from "@/stores/cartStore"
import {
  CART_LINE_LIMIT,
  MAX_LINE_QUANTITY,
  useCartStore,
} from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"
import { cn } from "@/lib/utils"

export interface AddToCartButtonProps {
  /** The line to add, minus what the person chooses here. */
  item: Omit<CartLine, "quantity" | "maxQuantity">
  /** Stock shown to the customer (or the quoted quantity); caps the quantity. */
  stock: number
  className?: string
}

/**
 * Quantity stepper and "Add to cart" for one offer. Shown to visitors and
 * customers only (pharmacy owners and admins do not reserve).
 */
export function AddToCartButton({
  item,
  stock,
  className,
}: AddToCartButtonProps) {
  const { t } = useTranslation()
  const role = useSessionStore((state) => state.user?.role)
  const add = useCartStore((state) => state.add)
  const inCart = useCartStore(
    (state) =>
      state.lines.find((l) => l.inventoryItemId === item.inventoryItemId)
        ?.quantity
  )
  const [quantity, setQuantity] = useState(1)
  const max = Math.min(stock, MAX_LINE_QUANTITY)

  if (role && role !== "CUSTOMER") return null
  if (max < 1) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {t("medicine.outOfStock")}
      </p>
    )
  }

  const submit = () => {
    const result = add({ ...item, quantity, maxQuantity: max })
    if (result === "limit") {
      toast.error(t("cart.limit", { limit: CART_LINE_LIMIT }))
    } else if (result === "capped") {
      toast.info(t("cart.capped", { max }))
    } else if (result === "replaced") {
      toast.warning(t("cart.replaced"))
    } else {
      toast.success(t("cart.added"))
    }
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <QuantityStepper value={quantity} onChange={setQuantity} max={max} />
        <Button
          type="button"
          onClick={submit}
          // Wraps instead of overflowing when the label runs long (ta/si).
          className="h-auto min-h-8 py-1.5 whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11"
        >
          <ShoppingBasketIcon data-icon="inline-start" aria-hidden />
          {t("cart.add")}
        </Button>
      </div>
      <p
        aria-live="polite"
        className="text-xs text-muted-foreground empty:hidden"
      >
        {inCart ? t("cart.inCart", { count: inCart }) : null}
      </p>
    </div>
  )
}
