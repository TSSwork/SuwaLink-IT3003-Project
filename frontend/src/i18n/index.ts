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
  lng: useLanguageStore.getState().language,
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
 * Applies the stored language now and keeps i18next and <html lang> in step
 * with later choices. Returns a cleanup.
 */
export function startLanguageSync(): () => void {
  apply(getCurrentLanguage())
  return useLanguageStore.subscribe((state, previous) => {
    if (state.language !== previous.language) apply(state.language)
  })
}

export default i18n
