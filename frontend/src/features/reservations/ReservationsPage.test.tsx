import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Reservation } from "@/api/types"
import { ReservationsPage } from "@/features/reservations/ReservationsPage"
import { useSessionStore } from "@/stores/sessionStore"
import { localIso, reservation } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

let api: ReturnType<typeof mockApi>
let list: Array<Reservation>

function renderList() {
  return renderRoutes(
    [
      { path: "/reservations", component: ReservationsPage },
      { path: "/reservations/$id" },
      { path: "/search" },
    ],
    "/reservations"
  )
}

const links = () => screen.queryAllByRole("link", { name: /Reservation at/ })

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  list = [
    reservation({ id: "r1", expiresAt: localIso(2 * 3_600_000 + 20_000) }),
    reservation({
      id: "r2",
      status: "COMPLETED",
      pickupCode: "B8N3TRW6ZE",
      pharmacy: { ...reservation().pharmacy, name: "Lanka Medicals" },
    }),
    reservation({ id: "r3", status: "CANCELLED" }),
  ]
  api = mockApi({ "/reservations/me": () => list })
})
afterEach(() => api.restore())

describe("ReservationsPage", () => {
  it("lists reservations with code, total and hold time", async () => {
    renderList()
    await screen.findAllByRole("link", { name: /Reservation at/ })
    expect(links().map((l) => l.getAttribute("href"))).toEqual([
      "/reservations/r1",
      "/reservations/r2",
      "/reservations/r3",
    ])
    const first = links()[0].closest("li") as HTMLElement
    expect(within(first).getByText("K7Q2MX")).toBeVisible()
    expect(within(first).getByText("2 h 0 min left")).toBeVisible()
    expect(within(first).getByText(/375\.00/)).toBeVisible()
    expect(within(first).getByText("1 item")).toBeVisible()
  })

  it("filters by status", async () => {
    renderList()
    await screen.findAllByRole("link", { name: /Reservation at/ })
    await userEvent.click(screen.getByRole("button", { name: "Collected" }))
    expect(screen.getByRole("button", { name: "Collected" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(links().map((l) => l.getAttribute("href"))).toEqual([
      "/reservations/r2",
    ])
    await userEvent.click(screen.getByRole("button", { name: "Expired" }))
    expect(screen.getByText("No expired reservations")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "All" }))
    expect(links()).toHaveLength(3)
  })

  it("explains an empty list", async () => {
    list = []
    renderList()
    expect(await screen.findByText("No reservations yet")).toBeVisible()
    expect(screen.getByRole("link", { name: "Find medicine" })).toHaveAttribute(
      "href",
      "/search"
    )
  })

  it("offers a retry when loading fails", async () => {
    api.restore()
    api = mockApi({ "/reservations/me": () => fail(500, "INTERNAL_ERROR") })
    renderList()
    expect(
      await screen.findByText("Your reservations could not be loaded")
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible()
  })
})
