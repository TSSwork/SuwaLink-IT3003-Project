import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { getCurrentLanguage, startLanguageSync } from "@/i18n"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { useLanguageStore } from "@/stores/languageStore"

describe("LanguageSwitcher", () => {
  afterEach(() => {
    useLanguageStore.setState({ language: "en" })
    localStorage.clear()
  })

  it("lists native names, switches language, updates <html lang> and persists", async () => {
    const user = userEvent.setup()
    const stop = startLanguageSync()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole("button", { name: "Language: English" }))
    expect(screen.getByRole("menuitemradio", { name: "සිංහල" })).toBeVisible()
    expect(screen.getByRole("menuitemradio", { name: "தமிழ்" })).toBeVisible()
    await user.click(screen.getByRole("menuitemradio", { name: "සිංහල" }))

    expect(getCurrentLanguage()).toBe("si")
    expect(document.documentElement.lang).toBe("si")
    expect(screen.getByRole("button", { name: "භාෂාව: සිංහල" })).toBeVisible()
    expect(localStorage.getItem("suwalink.lang")).toContain('"si"')
    stop()
  })
})
