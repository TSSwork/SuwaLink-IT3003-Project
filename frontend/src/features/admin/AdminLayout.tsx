import { Outlet } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { SectionNav } from "@/components/layout/SectionNav"

const SECTIONS = [
  ["/admin", "admin.nav.dashboard"],
  ["/admin/pharmacies", "admin.nav.pharmacies"],
  ["/admin/users", "admin.nav.users"],
  ["/admin/catalog", "admin.nav.catalog"],
  ["/admin/suggestions", "admin.nav.suggestions"],
  ["/admin/settings", "admin.nav.settings"],
] as const

/** Header and sub-navigation around every /admin page. */
export function AdminLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("admin.title")}
        </h1>
        <SectionNav
          label={t("admin.nav.label")}
          sections={SECTIONS.map(([to, label]) => ({ to, label: t(label) }))}
        />
      </header>
      <Outlet />
    </div>
  )
}
