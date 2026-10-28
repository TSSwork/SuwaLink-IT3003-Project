import { Outlet } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useMyPharmacy } from "@/api/pharmacyOwner"
import { SectionNav } from "@/components/layout/SectionNav"
import { Skeleton } from "@/components/ui/skeleton"

const SECTIONS = [
  ["/pharmacy", "pharmacyOwner.nav.overview"],
  ["/pharmacy/requests", "pharmacyOwner.nav.requests"],
  ["/pharmacy/reservations", "pharmacyOwner.nav.reservations"],
  ["/pharmacy/scan", "pharmacyOwner.nav.scan"],
  ["/pharmacy/inventory", "pharmacyOwner.nav.inventory"],
  ["/pharmacy/suggest-medicine", "pharmacyOwner.nav.suggest"],
  ["/pharmacy/settings", "pharmacyOwner.nav.settings"],
] as const

/** Header and sub-navigation around every /pharmacy page. */
export function PharmacyLayout() {
  const { t } = useTranslation()
  const pharmacy = useMyPharmacy()

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
        <SectionNav
          label={t("pharmacyOwner.nav.label")}
          sections={SECTIONS.map(([to, label]) => ({ to, label: t(label) }))}
        />
      </header>
      <Outlet />
    </div>
  )
}
