import { THEME_STORAGE_KEY, useThemeStore } from "@/stores/themeStore"
import type { Theme } from "@/stores/themeStore"

export { THEME_STORAGE_KEY }

const DARK_QUERY = "(prefers-color-scheme: dark)"

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

/** Puts `.dark` on <html> when the choice (or, for "system", the OS) is dark. */
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle("dark", dark)
  root.style.colorScheme = dark ? "dark" : "light"
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
)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})();`
