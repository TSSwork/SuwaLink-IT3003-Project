import { RotateCwIcon, WifiOffIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * For a query that failed to refresh while its last data is still on screen.
 * The rule: an error replaces the content only when there is no data yet;
 * otherwise the content (and anything typed into it) stays, with this notice.
 */
export function RefreshFailedNotice({
  onRetry,
  className,
}: {
  onRetry: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-muted px-4 py-2 text-sm",
        className
      )}
    >
      <span className="flex items-center gap-2">
        <WifiOffIcon aria-hidden className="size-4 shrink-0" />
        {t("common.refreshFailed")}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="-mr-2"
      >
        <RotateCwIcon data-icon="inline-start" aria-hidden />
        {t("common.retry")}
      </Button>
    </div>
  )
}

/** True when `query` failed but still holds data from an earlier load. */
export function failedWithData(query: { isError: boolean; data: unknown }) {
  return query.isError && query.data !== undefined
}
