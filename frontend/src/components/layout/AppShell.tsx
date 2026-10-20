import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import type { ReactNode } from "react"
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
  /** Primary navigation links; inline from 768 px, inside a Sheet below. */
  nav?: ReactNode
  /** LanguageSwitcher slot (Task 3). */
  languageSwitcher?: ReactNode
  /** Sign-in button or user menu (Task 4/5). */
  account?: ReactNode
  children: ReactNode
}

// Visible strings become t() calls in Task 3.
export function AppShell({
  nav,
  languageSwitcher,
  account,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
          <Wordmark />

          {nav && (
            <nav
              aria-label="Main"
              className="ml-6 hidden items-center gap-1 md:flex"
            >
              {nav}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1">
            {languageSwitcher}
            <ThemeToggle />
            {account}

            {nav && (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:hidden"
                    aria-label="Open menu"
                  >
                    <MenuIcon className="size-5" aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      Main navigation
                    </SheetDescription>
                  </SheetHeader>
                  {/* Any link chosen inside the sheet closes it. */}
                  <nav
                    aria-label="Main"
                    className="flex flex-col gap-1 px-4"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a")) {
                        setMenuOpen(false)
                      }
                    }}
                  >
                    {nav}
                  </nav>
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
          <p>SuwaLink · Sri Lanka</p>
          <nav aria-label="Legal" className="flex gap-2">
            {/* Plain anchors until the routes exist (Task 5). */}
            <a
              href="/privacy"
              className="inline-flex min-h-11 items-center rounded-lg px-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="inline-flex min-h-11 items-center rounded-lg px-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Terms
            </a>
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
  return (
    <Link
      to="/"
      aria-label="SuwaLink home"
      className="-ml-1 flex min-h-11 items-center gap-2.5 rounded-xl px-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="relative grid size-9 place-items-center rounded-xl bg-primary text-lg leading-none font-semibold text-primary-foreground"
      >
        සු
        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-highlight ring-2 ring-background" />
      </span>
      <span aria-hidden className="text-xl font-extrabold tracking-tight">
        Suwa<span className="text-primary">Link</span>
      </span>
    </Link>
  )
}
