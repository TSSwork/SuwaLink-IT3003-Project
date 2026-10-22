import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** At or below this, the exact count is shown so customers hurry or look elsewhere. */
export const LOW_STOCK = 5

/** "In stock", or "Only N left" when stock is low; a dot marks it beyond colour. */
export function StockIndicator({
  stock,
  className,
}: {
  stock: number
  className?: string
}) {
  const { t } = useTranslation()
  const low = stock <= LOW_STOCK
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          low ? "bg-highlight" : "bg-primary"
        )}
      />
      {low ? t("medicine.onlyLeft", { count: stock }) : t("medicine.inStock")}
    </span>
  )
}
