import { THEME_STORAGE_KEY, useThemeStore } from "@/stores/themeStore"
import type { Theme } from "@/stores/themeStore"

export { THEME_STORAGE_KEY }

const DARK_QUERY = "(prefers-color-scheme: dark)"

/** Browser-chrome colour per mode: the --background surface (Cornsilk / #161B0F). */
export const THEME_COLORS = { light: "#FEFAE0", dark: "#161B0F" } as const

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

/** Puts `.dark` on <html> when the choice (or, for "system", the OS) is dark. */
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle("dark", dark)
  root.style.colorScheme = dark ? "dark" : "light"
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.name = "theme-color"
    document.head.append(meta)
  }
  meta.content = dark ? THEME_COLORS.dark : THEME_COLORS.light
}

/**
 * Applies the stored theme now and keeps <html> in sync with later choices
 * and, in system mode, with OS colour-scheme changes. Returns a cleanup.
 */
export function startThemeSync(): () => void {
  const media = window.matchMedia(DARK_QUERY)
  const reapply = () => applyTheme(useThemeStore.getState().theme)
  reapply()
  const unsubscribe = useThemeStore.subscribe(reapply)
  media.addEventListener("change", reapply)
  return () => {
    unsubscribe()
    media.removeEventListener("change", reapply)
  }
}

/**
 * Runs in <head> before first paint so a dark choice never flashes light.
 * Mirrors applyTheme; must stay dependency-free and tolerate bad storage.
 */
export const themeInitScript = `(function(){try{var t="system";var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(s){var p=JSON.parse(s);if(p&&p.state&&p.state.theme)t=p.state.theme}var d=t==="dark"||(t==="system"&&window.matchMedia(${JSON.stringify(
  DARK_QUERY
)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=(d?${JSON.stringify(
  THEME_COLORS.dark
)}:${JSON.stringify(THEME_COLORS.light)})}catch(e){}})();`
