import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { District } from "@/api/types"

/** localStorage key for the customer's search location. */
export const LOCATION_STORAGE_KEY = "suwalink.location"

export type LocationLabel = "device" | "pinned"
export type LocationMode = "none" | "point" | "district"

interface LocationData {
  mode: LocationMode
  lat?: number
  lng?: number
  district?: District
  /** What a point is, translated when shown so a language switch updates it. */
  label?: LocationLabel
}

interface LocationState extends LocationData {
  setPoint: (lat: number, lng: number, label?: LocationLabel) => void
  setDistrict: (district: District) => void
  clear: () => void
  /** Sets the signed-in user's preferred district, only if nothing is chosen yet. */
  defaultToDistrict: (district: District) => void
}

const EMPTY: LocationData = {
  mode: "none",
  lat: undefined,
  lng: undefined,
  district: undefined,
  label: undefined,
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      setPoint: (lat, lng, label) =>
        set({ ...EMPTY, mode: "point", lat, lng, label }),
      setDistrict: (district) => set({ ...EMPTY, mode: "district", district }),
      clear: () => set(EMPTY),
      defaultToDistrict: (district) => {
        if (get().mode === "none") get().setDistrict(district)
      },
    }),
    {
      name: LOCATION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ mode, lat, lng, district, label }) => ({
        mode,
        lat,
        lng,
        district,
        label,
      }),
      // A tampered entry must never leave a half-formed location.
      merge: (persisted, current) => {
        const stored = persisted as Partial<LocationData> | undefined
        const point =
          stored?.mode === "point" &&
          typeof stored.lat === "number" &&
          typeof stored.lng === "number"
        const district =
          stored?.mode === "district" && typeof stored.district === "string"
        return point || district ? { ...current, ...stored } : current
      },
    }
  )
)

/** The chosen location as search parameters: a point, a district, or nothing. */
export function placeParams(
  location: Pick<LocationData, "mode" | "lat" | "lng" | "district">
): { lat?: number; lng?: number; district?: District } {
  if (
    location.mode === "point" &&
    location.lat !== undefined &&
    location.lng !== undefined
  ) {
    return { lat: location.lat, lng: location.lng }
  }
  if (location.mode === "district" && location.district) {
    return { district: location.district }
  }
  return {}
}
