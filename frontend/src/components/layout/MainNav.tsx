import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { Role } from "@/api/types"
import { useSessionStore } from "@/stores/sessionStore"

type NavTarget =
  | "/search"
  | "/prescriptions"
  | "/reservations"
  | "/saved"
  | "/pharmacy"
  | "/admin"

const VISITOR: Array<[NavTarget, string]> = [["/search", "nav.findMedicine"]]

const BY_ROLE: Record<Role, Array<[NavTarget, string]>> = {
  CUSTOMER: [
    ["/search", "nav.findMedicine"],
    ["/prescriptions", "nav.prescriptions"],
    ["/reservations", "nav.reservations"],
    ["/saved", "nav.saved"],
  ],
  PHARMACY_OWNER: [["/pharmacy", "nav.dashboard"]],
  ADMIN: [["/admin", "nav.admin"]],
}

/** Primary links for whoever is signed in (or a visitor); AppShell lays them out. */
export function MainNav() {
  const { t } = useTranslation()
  const role = useSessionStore((state) => state.user?.role)
  const links = role ? BY_ROLE[role] : VISITOR
  return (
    <>
      {links.map(([to, label]) => (
        <Link
          key={to}
          to={to}
          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
        >
          {t(label)}
        </Link>
      ))}
    </>
  )
}
