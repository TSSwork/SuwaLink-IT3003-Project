import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const LANGUAGES = ["en", "si", "ta"] as const
export type Language = (typeof LANGUAGES)[number]

/** Native names, shown as-is in every language so a reader can always find theirs. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
}

export const LANGUAGE_STORAGE_KEY = "suwalink.lang"

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value)
}

/** si/ta when the browser prefers them, otherwise English. */
export function detectLanguage(): Language {
  const preferred =
    typeof navigator === "undefined" ? "" : navigator.language.toLowerCase()
  const base = preferred.split("-")[0]
  return base === "si" || base === "ta" ? base : "en"
}

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: detectLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ language }) => ({ language }),
      // A stale or tampered stored value must never leave the app on a
      // language it has no strings for.
      merge: (persisted, current) => {
        const stored = (persisted as Partial<LanguageState> | undefined)
          ?.language
        return {
          ...current,
          language: isLanguage(stored) ? stored : current.language,
        }
      },
    }
  )
)
