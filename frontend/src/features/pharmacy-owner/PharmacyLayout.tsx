import { useEffect, useRef } from "react"
import { Link, Outlet, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useMyPharmacy } from "@/api/pharmacyOwner"
import { Skeleton } from "@/components/ui/skeleton"

type Section =
  | "/pharmacy"
  | "/pharmacy/requests"
  | "/pharmacy/reservations"
  | "/pharmacy/scan"
  | "/pharmacy/inventory"
  | "/pharmacy/suggest-medicine"
  | "/pharmacy/settings"

const SECTIONS: Array<[Section, string]> = [
  ["/pharmacy", "pharmacyOwner.nav.overview"],
  ["/pharmacy/requests", "pharmacyOwner.nav.requests"],
  ["/pharmacy/reservations", "pharmacyOwner.nav.reservations"],
  ["/pharmacy/scan", "pharmacyOwner.nav.scan"],
  ["/pharmacy/inventory", "pharmacyOwner.nav.inventory"],
  ["/pharmacy/suggest-medicine", "pharmacyOwner.nav.suggest"],
  ["/pharmacy/settings", "pharmacyOwner.nav.settings"],
]

/** Header and sub-navigation around every /pharmacy page. */
export function PharmacyLayout() {
  const { t } = useTranslation()
  const pharmacy = useMyPharmacy()
  const nav = useRef<HTMLElement>(null)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // On phones the row scrolls; keep the current section in view.
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [pathname])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          {pharmacy.isError ? (
            // The page below shows the error; the heading stays generic.
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("pharmacyOwner.sectionLabel")}
            </h1>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                {t("pharmacyOwner.sectionLabel")}
              </p>
              {pharmacy.data ? (
                <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
                  {pharmacy.data.name}
                </h1>
              ) : (
                <Skeleton aria-hidden className="h-8 w-56 sm:h-9" />
              )}
            </>
          )}
        </div>
        <nav
          ref={nav}
          aria-label={t("pharmacyOwner.nav.label")}
          // Scrolls sideways on phones; wraps from md up.
          className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-4 md:mx-0 md:flex-wrap md:px-0"
        >
          {SECTIONS.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/pharmacy" }}
              className="-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:border-primary aria-[current=page]:text-foreground"
            >
              {t(label)}
            </Link>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
