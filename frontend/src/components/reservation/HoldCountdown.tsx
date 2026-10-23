import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

/** The current time, refreshed every `intervalMs`. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

/** "5 h 30 min left" until `expiresAt` (a zone-less local time). */
export function HoldCountdown({
  expiresAt,
  className,
}: {
  expiresAt: string
  className?: string
}) {
  const { t } = useTranslation()
  const now = useNow()
  const left = new Date(expiresAt).getTime() - now
  const hours = Math.floor(left / 3_600_000)
  const minutes = Math.floor((left % 3_600_000) / 60_000)
  return (
    <span className={className}>
      {left <= 0
        ? t("reservations.holdEnded")
        : hours > 0
          ? t("reservations.leftHours", { hours, minutes })
          : t("reservations.leftMinutes", { minutes })}
    </span>
  )
}
