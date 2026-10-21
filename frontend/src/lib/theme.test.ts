import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  startThemeSync,
  themeInitScript,
} from "@/lib/theme"
import { useThemeStore } from "@/stores/themeStore"

type Listener = (event: { matches: boolean }) => void

/** jsdom has no matchMedia; this fake lets a test flip the OS colour scheme. */
function mockSystemScheme(initiallyDark: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initiallyDark,
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  }
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query)
  )
  return {
    setDark(dark: boolean) {
      query.matches = dark
      listeners.forEach((fn) => fn({ matches: dark }))
    },
  }
}

const html = () => document.documentElement

describe("theme", () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    localStorage.clear()
    html().classList.remove("dark")
    useThemeStore.setState({ theme: "system" })
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    vi.unstubAllGlobals()
  })

  it("follows the operating system in system mode, including later changes", () => {
    const system = mockSystemScheme(true)
    stop = startThemeSync()
    expect(html()).toHaveClass("dark")

    system.setDark(false)
    expect(html()).not.toHaveClass("dark")
  })

  it("adds .dark for an explicit dark choice even when the OS is light", () => {
    mockSystemScheme(false)
    stop = startThemeSync()
    expect(html()).not.toHaveClass("dark")

    useThemeStore.getState().setTheme("dark")
    expect(html()).toHaveClass("dark")

    useThemeStore.getState().setTheme("light")
    expect(html()).not.toHaveClass("dark")
  })

  it("keeps a single theme-color meta in step with the active mode", () => {
    const metas = () =>
      document.head.querySelectorAll<HTMLMetaElement>(
        'meta[name="theme-color"]'
      )
    metas().forEach((m) => m.remove())

    // The inline script creates the meta before the app loads...
    mockSystemScheme(false)
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { theme: "dark" }, version: 0 })
    )
    new Function(themeInitScript)()
    expect(metas()).toHaveLength(1)
    expect(metas()[0].content).toBe(THEME_COLORS.dark)

    // ...and the running app updates that same element.
    stop = startThemeSync()
    useThemeStore.getState().setTheme("light")
    expect(metas()).toHaveLength(1)
    expect(metas()[0].content).toBe(THEME_COLORS.light)
    metas().forEach((m) => m.remove())
  })

  it("persists the choice under suwalink.theme", () => {
    useThemeStore.getState().setTheme("dark")
    const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "{}")
    expect(stored.state).toEqual({ theme: "dark" })
  })

  it("restores a persisted choice into the store", async () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { theme: "dark" }, version: 0 })
    )
    await useThemeStore.persist.rehydrate()
    expect(useThemeStore.getState().theme).toBe("dark")
  })

  it("applies a persisted dark choice before the app loads (inline script)", () => {
    mockSystemScheme(false)
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { theme: "dark" }, version: 0 })
    )
    new Function(themeInitScript)()
    expect(html()).toHaveClass("dark")
  })

  it("inline script falls back to the OS scheme when nothing is stored", () => {
    mockSystemScheme(true)
    new Function(themeInitScript)()
    expect(html()).toHaveClass("dark")
  })
})
