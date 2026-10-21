import { useEffect } from "react"
import { getMe } from "@/api/auth"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

/**
 * Renders nothing. When a token is stored at startup, checks it once with
 * GET /users/me: an expired token ends the session quietly (the visitor stays
 * on the public page they opened), and a live one refreshes the stored name
 * and role and seeds the search location from the preferred district.
 * Other failures (offline) keep the session; the next request decides.
 */
export function SessionBootstrap() {
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
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return null
}
