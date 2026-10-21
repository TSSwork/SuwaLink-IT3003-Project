import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { District } from "@/api/types"

/** localStorage key for the customer's search location. */
export const LOCATION_STORAGE_KEY = "suwalink.location"

export type LocationMode = "none" | "point" | "district"

interface LocationData {
  mode: LocationMode
  lat?: number
  lng?: number
  district?: District
  /** Display label for a point, e.g. "Near me". */
  label?: string
}

interface LocationState extends LocationData {
  setPoint: (lat: number, lng: number, label?: string) => void
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
