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

/** setTimeout's longest delay (~24.8 days); holds are far shorter. */
const MAX_TIMEOUT = 2_147_483_647

/** True once `expiresAt` (a zone-less local time) has passed; flips at that moment. */
export function useHasPassed(expiresAt: string): boolean {
  const at = new Date(expiresAt).getTime()
  const [passed, setPassed] = useState(() => Date.now() >= at)
  useEffect(() => {
    const left = at - Date.now()
    setPassed(left <= 0)
    if (left <= 0 || left > MAX_TIMEOUT) return
    const timer = window.setTimeout(() => setPassed(true), left)
    return () => window.clearTimeout(timer)
  }, [at])
  return passed
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
  const ended = useHasPassed(expiresAt)
  const left = new Date(expiresAt).getTime() - now
  const hours = Math.floor(left / 3_600_000)
  const minutes = Math.floor((left % 3_600_000) / 60_000)
  return (
    <span className={className}>
      {ended || left <= 0
        ? t("reservations.holdEnded")
        : hours > 0
          ? t("reservations.leftHours", { hours, minutes })
          : t("reservations.leftMinutes", { minutes })}
    </span>
  )
}
