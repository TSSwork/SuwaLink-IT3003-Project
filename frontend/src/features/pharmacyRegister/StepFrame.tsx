import { useEffect, useId, useRef } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const STEPS = ["owner", "pharmacy", "location", "review"] as const

interface StepFrameProps {
  index: number
  /** Move focus to the heading on open (after Next/Back, not on first load). */
  focusHeading: boolean
  children: ReactNode
}

/** One wizard step: progress, heading and intro, then the step's form. */
export function StepFrame({ index, focusHeading, children }: StepFrameProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const step = STEPS[index]

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("pharmacyRegister.stepOf", {
            current: index + 1,
            total: STEPS.length,
          })}
        </p>
        <ol
          aria-label={t("pharmacyRegister.progress")}
          className="grid grid-cols-4 gap-1.5"
        >
          {STEPS.map((name, position) => (
            <li
              key={name}
              aria-current={position === index ? "step" : undefined}
              className={cn(
                "h-1.5 rounded-full",
                position <= index ? "bg-primary" : "bg-muted"
              )}
            >
              <span className="sr-only">
                {t(`pharmacyRegister.steps.${name}`)}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-1">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold tracking-tight outline-none"
          >
            {t(`pharmacyRegister.steps.${step}`)}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {t(`pharmacyRegister.intro.${step}`)}
          </p>
        </div>
      </header>
      {children}
    </section>
  )
}

const wrapClass =
  "h-auto min-h-9 min-w-0 flex-1 py-2 text-center whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11"

/** Back (except on step 1) and the step's submit button. */
export function StepNav({
  onBack,
  submitLabel,
  pending = false,
}: {
  onBack?: () => void
  submitLabel?: string
  pending?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-3 pt-1">
      {onBack && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="h-auto min-h-9 py-2 pointer-coarse:h-auto pointer-coarse:min-h-11"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          {t("common.back")}
        </Button>
      )}
      {/* Wraps instead of overflowing: Sinhala/Tamil labels run long at 360 px. */}
      <Button type="submit" size="lg" className={wrapClass} disabled={pending}>
        {submitLabel ?? t("common.next")}
      </Button>
    </div>
  )
}
