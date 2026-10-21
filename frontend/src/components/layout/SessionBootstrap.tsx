import { useEffect } from "react"
import { useRouter } from "@tanstack/react-router"
import { ApiError } from "@/api/client"
import { getMe } from "@/api/auth"
import { withExpiredNotice } from "@/lib/guards"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

/**
 * Renders nothing. When a token is stored at startup, checks it once with
 * GET /users/me: an expired token ends the session quietly (the visitor stays
 * on a public page; a protected page is sent to /login), and a live one refreshes the stored name
 * and role and seeds the search location from the preferred district.
 * Other failures (offline) keep the session; the next request decides.
 */
export function SessionBootstrap() {
  const router = useRouter({ warn: false }) as
    ReturnType<typeof useRouter> | undefined
  useEffect(() => {
    if (!useSessionStore.getState().token) return
    let cancelled = false
    getMe({ skipLoginRedirect: true })
      .then((me) => {
        const { token, setSession } = useSessionStore.getState()
        // Signed out or in as someone else while the request was in flight.
        if (cancelled || !token) return
        setSession(token, { id: me.id, name: me.name, role: me.role })
        if (me.district)
          useLocationStore.getState().defaultToDistrict(me.district)
      })
      .catch((error: unknown) => {
        // Expired: the client already cleared the session without navigating.
        // Re-run the route guards: protected pages send the visitor to /login,
        // public pages stay where they are.
        if (cancelled || !(error instanceof ApiError) || error.status !== 401)
          return
        void withExpiredNotice(() => router?.invalidate() ?? Promise.resolve())
      })
    return () => {
      cancelled = true
    }
  }, [router])
  return null
}
