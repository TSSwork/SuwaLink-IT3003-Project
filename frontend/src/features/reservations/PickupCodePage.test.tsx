import { screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PickupCodePage } from "@/features/reservations/PickupCodePage"
import { Route } from "@/routes/r/$code"
import { useSessionStore } from "@/stores/sessionStore"
import { reservation } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, title }: { value: string; title?: string }) => (
    <svg role="img" aria-label={title} data-value={value} />
  ),
}))

let api: ReturnType<typeof mockApi>

function renderCode(code: string) {
  return renderRoutes(
    [
      { path: "/r/$code", component: PickupCodePage },
      { path: "/pharmacies/$id" },
      { path: "/reservations" },
    ],
    `/r/${code}`
  )
}

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Owner", role: "PHARMACY_OWNER" })
  api = mockApi({
    "/reservations/by-code/K7Q2MXH4PA": () =>
      reservation({ pickupCode: "K7Q2MXH4PA" }),
    "/reservations/by-code/NOPE": () => fail(404, "NOT_FOUND"),
  })
})
afterEach(() => api.restore())

describe("PickupCodePage", () => {
  it("opens the reservation for a scanned code", async () => {
    renderCode("K7Q2MXH4PA")
    expect(await screen.findByText("K7Q2MXH4PA")).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Mark as collected" })
    ).toBeVisible()
  })

  it("says not found for an unknown or someone else's code", async () => {
    renderCode("NOPE")
    expect(await screen.findByText("Reservation not found")).toBeVisible()
  })

  it("sends signed-out visitors to sign in and back", () => {
    useSessionStore.getState().clear()
    const beforeLoad = Route.options.beforeLoad as unknown as (context: {
      location: { href: string }
    }) => void
    let thrown: unknown
    try {
      beforeLoad({ location: { href: "/r/K7Q2MXH4PA" } })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toMatchObject({
      options: { to: "/login", search: { redirect: "/r/K7Q2MXH4PA" } },
    })
  })
})
