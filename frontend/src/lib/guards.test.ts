import { beforeEach, describe, expect, it } from "vitest"
import { homeFor, requireAuth, requireRole } from "@/lib/guards"
import { useSessionStore } from "@/stores/sessionStore"
import type { Role } from "@/api/types"

const location = { href: "/pharmacy?x=1" }

function signInAs(role: Role) {
  useSessionStore.getState().setSession("t", { id: "1", name: "A", role })
}

/** The href of the redirect a guard throws, or undefined when it lets the visit through. */
function redirectOf(fn: () => void): string | undefined {
  try {
    fn()
  } catch (thrown) {
    return (thrown as { options: { href: string } }).options.href
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
    expect(redirectOf(() => requireAuth({ location }))).toBe(
      "/login?redirect=%2Fpharmacy%3Fx%3D1"
    )
  })

  it("lets a signed-in user through", () => {
    signInAs("CUSTOMER")
    expect(redirectOf(() => requireAuth({ location }))).toBeUndefined()
  })
})

describe("requireRole", () => {
  const guard = requireRole("PHARMACY_OWNER")

  it("sends signed-out visitors to /login", () => {
    expect(redirectOf(() => guard({ location }))).toContain("/login?redirect=")
  })

  it("sends the wrong role to its own home", () => {
    signInAs("ADMIN")
    expect(redirectOf(() => guard({ location }))).toBe("/admin")
    signInAs("CUSTOMER")
    expect(redirectOf(() => guard({ location }))).toBe("/")
  })

  it("lets a permitted role through", () => {
    signInAs("PHARMACY_OWNER")
    expect(redirectOf(() => guard({ location }))).toBeUndefined()
  })
})
