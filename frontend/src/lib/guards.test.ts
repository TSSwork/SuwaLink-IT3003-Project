import { beforeEach, describe, expect, it } from "vitest"
import { homeFor, requireAuth, requireRole } from "@/lib/guards"
import { useSessionStore } from "@/stores/sessionStore"
import type { Role } from "@/api/types"

const location = { href: "/pharmacy?x=1" }

function signInAs(role: Role) {
  useSessionStore.getState().setSession("t", { id: "1", name: "A", role })
}

interface RedirectTarget {
  to: string
  search?: Record<string, unknown>
}

/** Where the redirect a guard throws points, or undefined when it lets the visit through. */
function redirectOf(fn: () => void): RedirectTarget | undefined {
  try {
    fn()
  } catch (thrown) {
    const { to, search } = (thrown as { options: RedirectTarget }).options
    return search ? { to, search } : { to }
  }
  return undefined
}

beforeEach(() => useSessionStore.getState().clear())

describe("homeFor", () => {
  it("maps each role to its home", () => {
    expect(homeFor("CUSTOMER")).toBe("/")
    expect(homeFor("PHARMACY_OWNER")).toBe("/pharmacy")
    expect(homeFor("ADMIN")).toBe("/admin")
  })
})

describe("requireAuth", () => {
  it("sends signed-out visitors to /login with the return path", () => {
    expect(redirectOf(() => requireAuth({ location }))).toEqual({
      to: "/login",
      search: { redirect: "/pharmacy?x=1" },
    })
  })

  it("lets a signed-in user through", () => {
    signInAs("CUSTOMER")
    expect(redirectOf(() => requireAuth({ location }))).toBeUndefined()
  })
})

describe("requireRole", () => {
  const guard = requireRole("PHARMACY_OWNER")

  it("sends signed-out visitors to /login", () => {
    expect(redirectOf(() => guard({ location }))?.to).toBe("/login")
  })

  it("sends the wrong role to its own home", () => {
    signInAs("ADMIN")
    expect(redirectOf(() => guard({ location }))).toEqual({ to: "/admin" })
    signInAs("CUSTOMER")
    expect(redirectOf(() => guard({ location }))).toEqual({ to: "/" })
  })

  it("lets a permitted role through", () => {
    signInAs("PHARMACY_OWNER")
    expect(redirectOf(() => guard({ location }))).toBeUndefined()
  })
})
