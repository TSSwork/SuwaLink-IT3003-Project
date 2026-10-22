import { Link } from "@tanstack/react-router"
import { ShoppingBasketIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"

/** Header link to the cart with a line count; for visitors and customers. */
export function CartButton() {
  const { t } = useTranslation()
  const role = useSessionStore((state) => state.user?.role)
  const count = useCartStore((state) => state.lines.length)
  if (role && role !== "CUSTOMER") return null

  return (
    <Button asChild variant="ghost" size="icon" className="relative size-11">
      <Link
        to="/cart"
        aria-label={
          count === 0 ? t("cart.buttonEmpty") : t("cart.button", { count })
        }
      >
        <ShoppingBasketIcon className="size-5" aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6875rem] leading-5 font-semibold text-primary-foreground"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
