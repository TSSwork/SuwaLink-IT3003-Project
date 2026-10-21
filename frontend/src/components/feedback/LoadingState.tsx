import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  /** Announced to screen readers; defaults to t("common.loading"). */
  label?: string
  /** Number of placeholder rows to sketch the content being loaded. */
  rows?: number
  className?: string
}

export function LoadingState({
  label,
  rows = 3,
  className,
}: LoadingStateProps) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col gap-3", className)}
    >
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton
          key={i}
          aria-hidden
          // Last row is shorter so the block reads as text, not a wall.
          className={cn("h-5", i === rows - 1 && rows > 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}
