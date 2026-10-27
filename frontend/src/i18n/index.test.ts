import { afterEach, describe, expect, it, vi } from "vitest"

const STORED_SI = JSON.stringify({ state: { language: "si" }, version: 0 })

afterEach(async () => {
  localStorage.clear()
  const i18n = (await import("i18next")).default
  await i18n.changeLanguage("en")
  document.documentElement.lang = "en"
})

/** Loads the stores and i18n afresh, as a page load does, with `stored` in localStorage. */
async function loadWith(stored: string | null) {
  localStorage.clear()
  if (stored) localStorage.setItem("suwalink.lang", stored)
  vi.resetModules()
  const { startLanguageSync, getCurrentLanguage } = await import("@/i18n")
  const { useLanguageStore } = await import("@/stores/languageStore")
  const i18n = (await import("i18next")).default
  return { startLanguageSync, getCurrentLanguage, useLanguageStore, i18n }
}

describe("language start-up", () => {
  it("renders English first, like the prerendered shell, then applies the stored language", async () => {
    const { startLanguageSync, getCurrentLanguage, useLanguageStore, i18n } =
      await loadWith(STORED_SI)
    // Hydration must match the English shell (React #418 otherwise).
    expect(i18n.language).toBe("en")
    expect(useLanguageStore.getState().language).toBe("en")

    const stop = startLanguageSync()
    expect(getCurrentLanguage()).toBe("si")
    expect(i18n.language).toBe("si")
    expect(document.documentElement.lang).toBe("si")

    useLanguageStore.getState().setLanguage("ta")
    expect(i18n.language).toBe("ta")
    expect(document.documentElement.lang).toBe("ta")
    stop()
  })

  it("falls back to the browser's language when nothing is stored, without saving it", async () => {
    const spy = vi.spyOn(navigator, "language", "get").mockReturnValue("ta-LK")
    const { startLanguageSync, getCurrentLanguage } = await loadWith(null)
    expect(getCurrentLanguage()).toBe("en")
    const stop = startLanguageSync()
    expect(getCurrentLanguage()).toBe("ta")
    expect(localStorage.getItem("suwalink.lang")).toBeNull()
    stop()
    spy.mockRestore()
  })
})
