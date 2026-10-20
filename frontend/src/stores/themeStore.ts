import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Theme = "light" | "dark" | "system"

/** localStorage key; also read by the inline pre-paint script in lib/theme.ts. */
export const THEME_STORAGE_KEY = "suwalink.theme"

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme }) => ({ theme }),
    }
  )
)
