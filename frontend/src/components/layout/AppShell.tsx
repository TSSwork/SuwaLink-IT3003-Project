import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface AppShellProps {
  /** Primary navigation links; inline from 1024 px, inside a Sheet below. */
  nav?: ReactNode
  /** Sign-in button or user menu (AccountMenu). */
  account?: ReactNode
  children: ReactNode
}

export function AppShell({ nav, account, children }: AppShellProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("common.skipToContent")}
      </a>

      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
          <Wordmark />

          {nav && (
            <nav
              aria-label={t("common.mainNav")}
              className="ml-6 hidden items-center gap-1 lg:flex"
            >
              {nav}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            {/* Below 1024 px the theme choice moves into the menu sheet so the header fits (360 px, long ta labels). */}
            <div className={nav ? "hidden lg:flex" : "flex"}>
              <ThemeToggle />
            </div>
            {account}

            {nav && (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 lg:hidden"
                    aria-label={t("common.openMenu")}
                  >
                    <MenuIcon className="size-5" aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>{t("common.menu")}</SheetTitle>
                    <SheetDescription className="sr-only">
                      {t("common.mainNavigation")}
                    </SheetDescription>
                  </SheetHeader>
                  {/* Any link chosen inside the sheet closes it. */}
                  <nav
                    aria-label={t("common.mainMenuNav")}
                    className="flex flex-col gap-1 px-4"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a")) {
                        setMenuOpen(false)
                      }
                    }}
                  >
                    {nav}
                  </nav>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t px-4 pt-4">
                    <span className="text-sm font-medium">
                      {t("theme.label")}
                    </span>
                    <ThemeToggle />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none"
      >
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-sm text-muted-foreground">
          <p>{t("common.footerTagline")}</p>
          <nav aria-label={t("common.legalNav")} className="flex gap-2">
            <Link
              to="/privacy"
              className="inline-flex min-h-11 items-center rounded-lg px-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t("legal.privacy")}
            </Link>
            <Link
              to="/terms"
              className="inline-flex min-h-11 items-center rounded-lg px-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t("legal.terms")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/**
 * Brand mark: the Sinhala syllable "සු" (from සුව, "healing") on an Olive
 * Leaf tile, with a Copperwood dot - the one decorative accent in the shell.
 */
function Wordmark() {
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      aria-label={t("common.homeLink")}
      className="-ml-1 flex min-h-11 items-center gap-2.5 rounded-xl px-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="relative grid size-9 place-items-center rounded-xl bg-primary text-lg leading-none font-semibold text-primary-foreground"
      >
        සු
        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-highlight ring-2 ring-background" />
      </span>
      {/* Phones under 420 px keep only the tile so every header control fits. */}
      <span
        aria-hidden
        className="hidden text-xl font-extrabold tracking-tight min-[420px]:inline"
      >
        Suwa<span className="text-primary">Link</span>
      </span>
    </Link>
  )
}
