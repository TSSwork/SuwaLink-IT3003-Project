import { CircleAlertIcon, RotateCwIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  /** What went wrong, e.g. "Pharmacies could not be loaded". */
  title: string
  /** How to fix it; usually the translated ApiError message. */
  description?: string
  /** When given, shows a retry button that calls it. */
  onRetry?: () => void
  /** Becomes t("common.retry") in Task 3. */
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlertIcon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {onRetry && (
        <div className="col-start-2 mt-3">
          <Button variant="outline" className="min-h-11" onClick={onRetry}>
            <RotateCwIcon aria-hidden />
            {retryLabel}
          </Button>
        </div>
      )}
    </Alert>
  )
}
