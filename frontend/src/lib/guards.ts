import { redirect } from "@tanstack/react-router"
import type { Role } from "@/api/types"
import { useSessionStore } from "@/stores/sessionStore"

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  switch (role) {
    case "CUSTOMER":
      return "/"
    case "PHARMACY_OWNER":
      return "/pharmacy"
    case "ADMIN":
      return "/admin"
  }
}

/** The part of a route's `beforeLoad` context the guards use. */
interface GuardContext {
  location: { href: string }
}

/** `beforeLoad` helper: signed-out visitors go to /login and return afterwards. */
export function requireAuth({ location }: GuardContext): void {
  if (!useSessionStore.getState().user) {
    throw redirect({
      href: `/login?redirect=${encodeURIComponent(location.href)}`,
    })
  }
}

/** `beforeLoad` helper: signed-out go to /login, the wrong role goes to its own home. */
export function requireRole(...roles: Array<Role>) {
  return (context: GuardContext): void => {
    requireAuth(context)
    const user = useSessionStore.getState().user
    if (user && !roles.includes(user.role)) {
      throw redirect({ href: homeFor(user.role) })
    }
  }
}
