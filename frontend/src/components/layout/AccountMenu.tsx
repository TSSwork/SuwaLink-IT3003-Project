import { Link, useRouter } from "@tanstack/react-router"
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

/** Header account area: compact "Sign in" when signed out, avatar menu when in. */
export function AccountMenu() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useSessionStore((state) => state.user)
  const clear = useSessionStore((state) => state.clear)

  if (!user) {
    return (
      // Plain anchor until the /login route exists (Task 5).
      <Button asChild variant="default" className="h-11 min-w-11 px-3">
        <a href="/login" aria-label={t("auth.signIn")}>
          <LogInIcon className="size-5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{t("auth.signIn")}</span>
        </a>
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
