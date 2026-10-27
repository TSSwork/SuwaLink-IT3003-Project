import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "@/locales/en.json"
import si from "@/locales/si.json"
import ta from "@/locales/ta.json"
import { useLanguageStore } from "@/stores/languageStore"
import type { Language } from "@/stores/languageStore"

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    si: { translation: si },
    ta: { translation: ta },
  },
  // The prerendered shell is English; the stored language follows after
  // mount (startLanguageSync) so hydration matches.
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: true },
  react: { useSuspense: false },
})

/** The active language; Task 4 sends it as `Accept-Language`. */
export function getCurrentLanguage(): Language {
  return useLanguageStore.getState().language
}

function apply(language: Language): void {
  void i18n.changeLanguage(language)
  document.documentElement.lang = language
}

/**
 * Reads the stored language (or the browser's), applies it, and keeps
 * i18next and <html lang> in step with later choices. Called from a layout
 * effect in the root, so it lands before paint and before any request.
 * Returns a cleanup.
 */
export function startLanguageSync(): () => void {
  // localStorage is synchronous, so this has hydrated when it returns.
  void useLanguageStore.persist.rehydrate()
  apply(getCurrentLanguage())
  return useLanguageStore.subscribe((state, previous) => {
    if (state.language !== previous.language) apply(state.language)
  })
}

export default i18n
