import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Call } from "@/test/mockApi"
import { OverviewPage } from "@/features/pharmacy-owner/OverviewPage"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import {
  inventoryItem,
  localDate,
  localIso,
  prescriptionReply,
  prescriptionRequest,
  reservation,
} from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

const HOUR = 3_600_000

let api: ReturnType<typeof mockApi>

type Handlers = Record<string, (call: Call) => unknown>

const fullData: Handlers = {
  "/prescriptions": () => [
    prescriptionRequest({ id: "rx1", patientAge: 61, note: "Replied one" }),
    prescriptionRequest({
      id: "rx2",
      patientAge: 34,
      note: "Need the full course.",
      status: "RESPONDED",
    }),
    prescriptionRequest({ id: "rx3", patientAge: 8, note: null }),
  ],
  // This pharmacy already replied to rx1.
  "/prescriptions/responses/me": () => [
    prescriptionReply({ prescriptionRequestId: "rx1" }),
  ],
  "/reservations": () => [
    reservation({
      id: "res-late",
      customer: { id: "c1", name: "Late Customer" },
      expiresAt: localIso(20 * HOUR),
    }),
    reservation({ id: "res-done", status: "COMPLETED" }),
    reservation({
      id: "res-soon",
      pickupCode: "ABCDEFGH23",
      customer: { id: "c2", name: "Soon Customer" },
      expiresAt: localIso(2 * HOUR),
    }),
  ],
  "/inventory": () => [
    inventoryItem({ id: "low3", stockQuantity: 3 }),
    inventoryItem({ id: "low5", stockQuantity: 5 }),
    inventoryItem({ id: "ok6", stockQuantity: 6 }),
    inventoryItem({ id: "exp10", expireDate: localDate(10) }),
    inventoryItem({ id: "exp30", expireDate: localDate(30) }),
    inventoryItem({ id: "exp31", expireDate: localDate(31) }),
  ],
}

const ROUTES = [
  { path: "/pharmacy", component: OverviewPage },
  { path: "/pharmacy/requests" },
  { path: "/pharmacy/requests/$id" },
  { path: "/pharmacy/reservations" },
  { path: "/pharmacy/inventory" },
  { path: "/reservations/$id" },
]

function renderOverview(handlers: Handlers = fullData) {
  api = mockApi(handlers)
  return renderRoutes(ROUTES, "/pharmacy")
}

function stat(name: RegExp) {
  return screen.getByRole("link", { name })
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
})
afterEach(() => api.restore())

describe("OverviewPage", () => {
  it("counts what needs attention from the lists", async () => {
    renderOverview()
    await waitFor(() =>
      expect(stat(/Requests waiting for a reply/)).toHaveTextContent("2")
    )
    // Only CONFIRMED reservations; stock at 5 or fewer; expiring within 30 days.
    await waitFor(() =>
      expect(stat(/Reservations to collect/)).toHaveTextContent("2")
    )
    await waitFor(() =>
      expect(stat(/Items low on stock/)).toHaveTextContent("2")
    )
    expect(stat(/Expired or expiring within 30 days/)).toHaveTextContent("2")
  })

  it("links each count to its page", async () => {
    renderOverview()
    await waitFor(() =>
      expect(stat(/Requests waiting for a reply/)).toHaveTextContent("2")
    )
    expect(stat(/Requests waiting for a reply/)).toHaveAttribute(
      "href",
      "/pharmacy/requests"
    )
    expect(stat(/Reservations to collect/)).toHaveAttribute(
      "href",
      "/pharmacy/reservations"
    )
    expect(stat(/Items low on stock/)).toHaveAttribute(
      "href",
      "/pharmacy/inventory"
    )
    expect(stat(/Expired or expiring within 30 days/)).toHaveAttribute(
      "href",
      "/pharmacy/inventory"
    )
  })

  it("lists the requests without a reply, each opening its page", async () => {
    const { router } = renderOverview()
    const list = await screen.findByRole("list", {
      name: "Requests waiting for you",
    })
    const links = await within(list).findAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/pharmacy/requests/rx2",
      "/pharmacy/requests/rx3",
    ])
    expect(within(list).getByText("Need the full course.")).toBeVisible()
    expect(within(list).queryByText("Replied one")).toBeNull()

    await userEvent.click(links[0])
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/pharmacy/requests/rx2")
    )
  })

  it("lists confirmed pickups, soonest hold end first", async () => {
    renderOverview()
    const list = await screen.findByRole("list", { name: "Today's pickups" })
    const links = await within(list).findAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/reservations/res-soon",
      "/reservations/res-late",
    ])
    expect(within(list).getByText("ABCDEFGH23")).toBeVisible()
    expect(within(list).getByText("Soon Customer")).toBeVisible()
  })

  it("shows at most five of each list", async () => {
    renderOverview({
      ...fullData,
      "/prescriptions": () =>
        Array.from({ length: 7 }, (_, i) =>
          prescriptionRequest({ id: `rx${i + 10}` })
        ),
      "/reservations": () =>
        Array.from({ length: 7 }, (_, i) =>
          reservation({ id: `res${i}`, expiresAt: localIso((i + 1) * HOUR) })
        ),
    })
    const requests = await screen.findByRole("list", {
      name: "Requests waiting for you",
    })
    await waitFor(() =>
      expect(within(requests).getAllByRole("link")).toHaveLength(5)
    )
    const pickups = screen.getByRole("list", { name: "Today's pickups" })
    expect(within(pickups).getAllByRole("link")).toHaveLength(5)
    expect(stat(/Requests waiting for a reply/)).toHaveTextContent("7")
  })

  it("says what to expect when nothing is waiting", async () => {
    renderOverview({
      "/prescriptions": () => [],
      "/prescriptions/responses/me": () => [],
      "/reservations": () => [reservation({ status: "COMPLETED" })],
      "/inventory": () => [],
    })
    expect(await screen.findByText("No requests are waiting")).toBeVisible()
    expect(await screen.findByText("No pickups are due")).toBeVisible()
    await waitFor(() =>
      expect(stat(/Requests waiting for a reply/)).toHaveTextContent("0")
    )
    expect(stat(/Items low on stock/)).toHaveTextContent("0")
  })

  it("shows a load error with a retry that recovers", async () => {
    let failing = true
    renderOverview({
      ...fullData,
      "/reservations": (call) =>
        failing ? fail(500, "INTERNAL_ERROR") : fullData["/reservations"](call),
    })
    expect(
      await screen.findByText("Reservations could not be loaded")
    ).toBeVisible()
    failing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("list", { name: "Today's pickups" })
    ).toBeVisible()
    expect(api.callsTo("/reservations").length).toBeGreaterThan(1)
  })
})
