import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  /** Announced to screen readers; becomes t("common.loading") in Task 3. */
  label?: string
  /** Number of placeholder rows to sketch the content being loaded. */
  rows?: number
  className?: string
}

export function LoadingState({
  label = "Loading…",
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col gap-3", className)}
    >
      <span className="sr-only">{label}</span>
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
