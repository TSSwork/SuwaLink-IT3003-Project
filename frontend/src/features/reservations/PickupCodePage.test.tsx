import { screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PickupCodePage } from "@/features/reservations/PickupCodePage"
import { Route } from "@/routes/r/$code"
import { useSessionStore } from "@/stores/sessionStore"
import { localIso, reservation } from "@/test/fixtures"
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
      { path: "/pharmacy/scan" },
      { path: "/pharmacy/reservations" },
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
      // A live hold: the actions go once it runs out.
      reservation({ pickupCode: "K7Q2MXH4PA", expiresAt: localIso(3_600_000) }),
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

  it("tells the pharmacy an unknown or foreign code isn't theirs, with a way on", async () => {
    renderCode("NOPE")
    expect(
      await screen.findByText("This code isn't one of your reservations")
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Scan another code" })
    ).toHaveAttribute("href", "/pharmacy/scan")
    expect(
      screen.getByRole("link", { name: "See your reservations" })
    ).toHaveAttribute("href", "/pharmacy/reservations")
    expect(screen.queryByText("Reservation not found")).toBeNull()
  })

  it("tells a customer the reservation was not found and links to theirs", async () => {
    useSessionStore
      .getState()
      .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
    renderCode("NOPE")
    expect(await screen.findByText("Reservation not found")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "See all reservations" })
    ).toHaveAttribute("href", "/reservations")
    expect(screen.queryByRole("link", { name: "Scan another code" })).toBeNull()
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
