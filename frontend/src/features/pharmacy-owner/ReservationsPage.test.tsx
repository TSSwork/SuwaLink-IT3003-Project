import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Call } from "@/test/mockApi"
import { ReservationsPage } from "@/features/pharmacy-owner/ReservationsPage"
import { useSessionStore } from "@/stores/sessionStore"
import { localIso, reservation } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

type Handlers = Record<string, (call: Call) => unknown>

const HOUR = 3_600_000
let api: ReturnType<typeof mockApi>

const rxLine = {
  id: "i2",
  inventoryItemId: "inv2",
  medicineName: "Amoxicillin 500 mg",
  quantity: 21,
  unitPrice: 20,
  lineTotal: 420,
  requiresPrescription: true,
}

const fullData: Handlers = {
  "/reservations": () => [
    reservation({
      id: "r1",
      pickupCode: "K7Q2MXH4PA",
      customer: { id: "u1", name: "Nimal Perera" },
      expiresAt: localIso(2 * HOUR + 20_000),
    }),
    reservation({
      id: "r2",
      pickupCode: "M3NB7RTW9X",
      customer: { id: "u2", name: "Fathima Rizvi" },
      requiresPrescription: true,
      total: 795,
      items: [reservation().items[0], rxLine],
      expiresAt: localIso(0.5 * HOUR + 20_000),
    }),
    reservation({
      id: "r3",
      pickupCode: "PQ8ZZC4D2E",
      status: "COMPLETED",
      customer: { id: "u3", name: "Kumar Selvam" },
    }),
    reservation({
      id: "r4",
      status: "EXPIRED",
      customer: { id: "u4", name: "Saman Silva" },
    }),
  ],
}

function renderReservations(handlers: Handlers = fullData) {
  api = mockApi(handlers)
  return renderRoutes(
    [
      { path: "/pharmacy/reservations", component: ReservationsPage },
      { path: "/pharmacy/scan" },
      { path: "/pharmacy/inventory" },
      { path: "/reservations/$id" },
    ],
    "/pharmacy/reservations"
  )
}

const rows = () =>
  within(screen.getByRole("list", { name: "Reservations" })).getAllByRole(
    "listitem"
  )

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
})
afterEach(() => api.restore())

describe("pharmacy ReservationsPage", () => {
  it("shows reservations waiting for pickup first", async () => {
    renderReservations()
    await screen.findByRole("list", { name: "Reservations" })
    expect(
      screen.getByRole("button", { name: "Confirmed", pressed: true })
    ).toBeVisible()
    const shown = rows()
    expect(shown).toHaveLength(2)

    expect(within(shown[0]).getByText("Nimal Perera")).toBeVisible()
    expect(within(shown[0]).getByText("K7Q2MXH4PA")).toHaveClass("font-mono")
    expect(within(shown[0]).getByText("1 item")).toBeVisible()
    expect(within(shown[0]).getByText(/375\.00/)).toBeVisible()
    expect(within(shown[0]).getByText("2 h 0 min left")).toBeVisible()
    expect(within(shown[0]).queryByText("Prescription needed")).toBeNull()

    expect(within(shown[1]).getByText("Fathima Rizvi")).toBeVisible()
    expect(within(shown[1]).getByText("2 items")).toBeVisible()
    expect(within(shown[1]).getByText(/795\.00/)).toBeVisible()
    expect(within(shown[1]).getByText("30 min left")).toBeVisible()
    expect(within(shown[1]).getByText("Prescription needed")).toBeVisible()
  })

  it("filters by status and shows everything under All", async () => {
    const user = userEvent.setup()
    renderReservations()
    await screen.findByRole("list", { name: "Reservations" })

    await user.click(screen.getByRole("button", { name: "Collected" }))
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText("Kumar Selvam")).toBeVisible()
    expect(within(rows()[0]).queryByText(/left$/)).toBeNull()

    await user.click(screen.getByRole("button", { name: "Expired" }))
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText("Saman Silva")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "All" }))
    expect(rows()).toHaveLength(4)
  })

  it("says so when a filter has nothing, and offers all reservations", async () => {
    const user = userEvent.setup()
    renderReservations()
    await screen.findByRole("list", { name: "Reservations" })
    await user.click(screen.getByRole("button", { name: "Cancelled" }))
    expect(screen.getByText("No cancelled reservations")).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Show all reservations" })
    )
    expect(rows()).toHaveLength(4)
  })

  it("opens a reservation where it can be collected or cancelled", async () => {
    const user = userEvent.setup()
    const { router } = renderReservations()
    await screen.findByRole("list", { name: "Reservations" })
    await user.click(screen.getByRole("link", { name: "Fathima Rizvi" }))
    expect(await screen.findByText("page:/reservations/$id")).toBeVisible()
    expect(router.state.location.pathname).toBe("/reservations/r2")
  })

  it("links to the pickup scanner", async () => {
    const user = userEvent.setup()
    renderReservations()
    await screen.findByRole("list", { name: "Reservations" })
    await user.click(screen.getByRole("link", { name: "Scan a pickup code" }))
    expect(await screen.findByText("page:/pharmacy/scan")).toBeVisible()
  })

  it("says what happens next when there are no reservations yet", async () => {
    renderReservations({ "/reservations": () => [] })
    expect(await screen.findByText("No reservations yet")).toBeVisible()
    expect(
      screen.getByText(
        "When a customer reserves medicines at your pharmacy, they appear here and in your notifications. Keep your stock up to date so customers can find you."
      )
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Update stock" })).toHaveAttribute(
      "href",
      "/pharmacy/inventory"
    )
  })

  it("shows an error with a retry", async () => {
    const user = userEvent.setup()
    let failing = true
    renderReservations({
      "/reservations": () => {
        if (failing) fail(500, "INTERNAL_ERROR")
        return [reservation()]
      },
    })
    expect(
      await screen.findByText("Reservations could not be loaded")
    ).toBeVisible()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("list", { name: "Reservations" })
    ).toBeVisible()
  })
})
