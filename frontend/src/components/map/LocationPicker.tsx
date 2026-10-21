import { Suspense, lazy, useEffect, useState } from "react"
import { CircleAlertIcon, InfoIcon, LocateFixedIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { CentreRequest } from "@/components/map/MapView"
import type { LatLng } from "@/components/map/sriLanka"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatLatLng,
  isInSriLanka,
  roundCoordinate,
} from "@/components/map/sriLanka"

// Leaflet touches `window` on import, so the map loads only in the browser,
// after mount (never during prerender).
const MapView = lazy(() => import("@/components/map/MapView"))

const GEOLOCATION_TIMEOUT_MS = 10_000

type LocateStatus =
  "idle" | "locating" | "denied" | "unavailable" | "unsupported"

export interface LocationPickerProps {
  /** The chosen point; undefined shows Colombo with no pin. */
  value?: LatLng
  /**
   * Called with the new point (rounded to 6 dp) when the person taps the
   * map, drags the pin or uses their location. Points outside Sri Lanka are
   * reported too, and flagged under the map; the caller's schema decides.
   */
  onChange: (lat: number, lng: number) => void
  /** Map height in px (default 280). */
  height?: number
}

/**
 * Map for choosing one point: tap to place the pin, drag to adjust, or
 * "Use my location". Shows the chosen coordinates, and keeps working when
 * location access is denied, times out or is unsupported.
 */
export function LocationPicker({
  value,
  onChange,
  height = 280,
}: LocationPickerProps) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<LocateStatus>("idle")
  const [centreRequest, setCentreRequest] = useState<CentreRequest>()
  useEffect(() => setMounted(true), [])

  const pick = (lat: number, lng: number) => {
    setStatus("idle")
    onChange(roundCoordinate(lat), roundCoordinate(lng))
  }

  const locate = () => {
    // Missing on insecure origins and some embedded browsers, despite the DOM types.
    const geolocation = navigator.geolocation as Geolocation | undefined
    if (!geolocation) {
      setStatus("unsupported")
      return
    }
    setStatus("locating")
    geolocation.getCurrentPosition(
      ({ coords }) => {
        setStatus("idle")
        setCentreRequest((previous) => ({
          lat: coords.latitude,
          lng: coords.longitude,
          seq: (previous?.seq ?? 0) + 1,
        }))
        pick(coords.latitude, coords.longitude)
      },
      (error) => {
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"
        )
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0,
      }
    )
  }

  const outside = value !== undefined && !isInSriLanka(value.lat, value.lng)
  const hint =
    status === "denied" || status === "unavailable" || status === "unsupported"
      ? t(`map.${status}`)
      : undefined

  return (
    <div className="flex flex-col gap-3">
      {/* isolate: keeps Leaflet's z-indexed panes under the header and menus. */}
      <div
        className="isolate overflow-hidden rounded-2xl border bg-muted"
        style={{ height }}
      >
        {mounted && (
          <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
            <MapView
              value={value}
              onPick={pick}
              centreRequest={centreRequest}
              height={height}
              label={t("map.label")}
            />
          </Suspense>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 text-sm" aria-live="polite">
          {value ? (
            <>
              <span className="text-muted-foreground">{t("map.chosen")}: </span>
              <span className="font-mono tabular-nums">
                {formatLatLng(value)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{t("map.noneChosen")}</span>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={locate}
          // Wraps instead of overflowing when the label runs long (ta/si).
          className="h-auto min-h-8 max-w-full py-1.5 whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11"
          disabled={status === "locating"}
        >
          <LocateFixedIcon data-icon="inline-start" aria-hidden />
          {status === "locating" ? t("map.locating") : t("map.useMyLocation")}
        </Button>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {hint && (
          <p className="flex gap-2 text-sm text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {hint}
          </p>
        )}
      </div>
      {outside && (
        <p className="flex gap-2 text-sm text-destructive">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("validation.coordinatesRange")}
        </p>
      )}
    </div>
  )
}
