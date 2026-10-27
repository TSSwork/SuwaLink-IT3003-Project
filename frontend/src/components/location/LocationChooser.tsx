import { useState } from "react"
import { LocateFixedIcon, MapPinIcon, MapIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { DistrictSelect } from "@/components/forms/DistrictSelect"
import { LocationPicker } from "@/components/map/LocationPicker"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useLocationStore } from "@/stores/locationStore"

const GEOLOCATION_TIMEOUT_MS = 10_000

type LocateStatus =
  "idle" | "locating" | "denied" | "unavailable" | "unsupported"

/**
 * Compact control showing the customer's search location as a chip ("Near me",
 * "Kandy"); opens a bottom sheet to use the device location, pick a district
 * or choose a point on the map. Location access is never required: a denial
 * leaves the district picker and the map working.
 */
export function LocationChooser() {
  const { t } = useTranslation()
  const location = useLocationStore()
  const [open, setOpen] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [status, setStatus] = useState<LocateStatus>("idle")

  const place =
    location.mode === "point"
      ? location.label === "pinned"
        ? t("location.pinned")
        : t("location.nearMe")
      : location.mode === "district" && location.district
        ? t(`districts.${location.district}`)
        : null

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
        location.setPoint(coords.latitude, coords.longitude, "device")
        setOpen(false)
      },
      (error) =>
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"
        ),
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0,
      }
    )
  }

  const hint =
    status === "denied" || status === "unavailable" || status === "unsupported"
      ? t(`location.${status}`)
      : undefined

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* SuwaLink: pointer-coarse:min-h-11 keeps the chip a 44 px target. */}
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-8 max-w-full rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
        >
          <MapPinIcon data-icon="inline-start" aria-hidden />
          {place ?? t("location.setPrompt")}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-dvh overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("location.title")}</SheetTitle>
          <SheetDescription>{t("location.description")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <Button
            type="button"
            onClick={locate}
            disabled={status === "locating"}
            className="h-auto min-h-8 py-1.5 whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11"
          >
            <LocateFixedIcon data-icon="inline-start" aria-hidden />
            {status === "locating" ? t("map.locating") : t("map.useMyLocation")}
          </Button>
          <div aria-live="polite" className="empty:hidden">
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" id="location-district">
              {t("location.orDistrict")}
            </span>
            <DistrictSelect
              aria-labelledby="location-district"
              value={location.mode === "district" ? location.district : ""}
              onValueChange={(district) => {
                location.setDistrict(district)
                setOpen(false)
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMap((shown) => !shown)}
            aria-expanded={showMap}
            className="h-auto min-h-8 py-1.5 whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11"
          >
            <MapIcon data-icon="inline-start" aria-hidden />
            {t("location.chooseOnMap")}
          </Button>
          {showMap && (
            <LocationPicker
              value={
                location.mode === "point" &&
                location.lat !== undefined &&
                location.lng !== undefined
                  ? { lat: location.lat, lng: location.lng }
                  : undefined
              }
              onChange={(lat, lng) => location.setPoint(lat, lng, "pinned")}
              height={240}
            />
          )}

          <div className="flex flex-wrap justify-between gap-2">
            {location.mode !== "none" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  location.clear()
                  setStatus("idle")
                  setOpen(false)
                }}
                className="h-auto min-h-8 py-1.5 whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11"
              >
                {t("location.clear")}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="ml-auto h-auto min-h-8 py-1.5 pointer-coarse:h-auto pointer-coarse:min-h-11"
            >
              {t("location.done")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
