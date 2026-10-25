import { Link, useRouter, useRouterState } from "@tanstack/react-router"
import { LogInIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { homeFor } from "@/lib/guards"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSessionStore } from "@/stores/sessionStore"
import type { Role } from "@/api/types"

const HOME_LABEL: Record<Role, string> = {
  CUSTOMER: "nav.home",
  PHARMACY_OWNER: "nav.dashboard",
  ADMIN: "nav.admin",
}

/** Initials for the avatar; works for any script (first letter of up to two words). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase()
}

/** Pages a visitor should not be sent back to after signing in. */
const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]

/** Header account area: compact "Sign in" when signed out, avatar menu when in. */
export function AccountMenu() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useSessionStore((state) => state.user)
  const clear = useSessionStore((state) => state.clear)
  const location = useRouterState({ select: (state) => state.location })

  if (!user) {
    const returnTo =
      location.pathname === "/" ||
      AUTH_PATHS.some((path) => location.pathname.startsWith(path))
        ? undefined
        : location.href
    return (
      <Button asChild variant="default" className="h-11 min-w-11 px-3">
        <Link
          to="/login"
          search={{ redirect: returnTo }}
          aria-label={t("auth.signIn")}
        >
          <LogInIcon className="size-5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{t("auth.signIn")}</span>
        </Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-11 rounded-full p-0"
          aria-label={t("auth.accountMenu", { name: user.name })}
        >
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11">
          <Link to={homeFor(user.role)}>{t(HOME_LABEL[user.role])}</Link>
        </DropdownMenuItem>
        {user.role === "CUSTOMER" && (
          <DropdownMenuItem asChild className="min-h-11">
            <Link to="/settings">{t("nav.settings")}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => {
            clear()
            void router.navigate({ to: "/" })
          }}
        >
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
