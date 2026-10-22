import { useState } from "react"
import { MinusIcon, PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface QuantityStepperProps {
  value: number
  /** Called with a whole number in 1..max. */
  onChange: (value: number) => void
  max: number
  className?: string
}

/** − / number / + for a quantity in 1..max. Typed values settle on blur. */
export function QuantityStepper({
  value,
  onChange,
  max,
  className,
}: QuantityStepperProps) {
  const { t } = useTranslation()
  // What the person is typing; null while it equals `value`.
  const [draft, setDraft] = useState<string | null>(null)
  const top = Math.max(1, max)
  const settle = (raw: number) =>
    onChange(Math.min(Math.max(1, Math.floor(raw) || 1), top))

  return (
    <div
      role="group"
      aria-label={t("cart.quantity")}
      className={cn(
        "inline-flex items-center rounded-2xl border bg-background",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("cart.decrease")}
        disabled={value <= 1}
        onClick={() => settle(value - 1)}
      >
        <MinusIcon aria-hidden />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={top}
        aria-label={t("cart.quantity")}
        value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) settle(Number(draft))
          setDraft(null)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
        // No browser spinner: the buttons do that job at a touchable size.
        className="h-8 w-10 [appearance:textfield] bg-transparent text-center text-sm font-medium tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/30 pointer-coarse:h-11 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("cart.increase")}
        disabled={value >= top}
        onClick={() => settle(value + 1)}
      >
        <PlusIcon aria-hidden />
      </Button>
    </div>
  )
}
