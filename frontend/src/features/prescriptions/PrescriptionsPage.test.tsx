import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { PrescriptionRequest } from "@/api/types"
import { PrescriptionsPage } from "@/features/prescriptions/PrescriptionsPage"
import { useSessionStore } from "@/stores/sessionStore"
import { prescriptionRequest } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

let api: ReturnType<typeof mockApi>
let list: Array<PrescriptionRequest>

function renderList() {
  return renderRoutes(
    [
      { path: "/prescriptions", component: PrescriptionsPage },
      { path: "/prescriptions/new" },
      { path: "/prescriptions/$id" },
    ],
    "/prescriptions"
  )
}

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  list = [
    prescriptionRequest({
      id: "rx2",
      status: "PENDING",
      targetScope: "RADIUS_10KM",
      district: null,
      targetCount: 3,
    }),
    prescriptionRequest({ id: "rx1", status: "RESPONDED" }),
    prescriptionRequest({
      id: "rx3",
      status: "CLOSED",
      targetScope: "ALL",
      district: null,
      targetCount: 42,
    }),
  ]
  api = mockApi({ "/prescriptions/me": () => list })
})
afterEach(() => api.restore())

describe("PrescriptionsPage", () => {
  it("lists requests with status and who received them", async () => {
    renderList()
    const links = await screen.findAllByRole("link", { name: /Request from/ })
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/prescriptions/rx2",
      "/prescriptions/rx1",
      "/prescriptions/rx3",
    ])
    const card = (i: number) => links[i].closest("li") as HTMLElement
    expect(within(card(0)).getByText("Waiting for replies")).toBeVisible()
    expect(
      within(card(0)).getByText("Sent to 3 pharmacies within 10 km")
    ).toBeVisible()
    expect(within(card(1)).getByText("Replies received")).toBeVisible()
    expect(
      within(card(1)).getByText("Sent to 8 pharmacies in Colombo")
    ).toBeVisible()
    expect(within(card(2)).getByText("Closed")).toBeVisible()
    expect(within(card(2)).getByText("Sent to all 42 pharmacies")).toBeVisible()
    // No prescription image is downloaded for the list.
    expect(api.calls.map((c) => c.url)).toEqual(["/prescriptions/me"])
  })

  it("links to a new upload", async () => {
    renderList()
    await screen.findAllByRole("link", { name: /Request from/ })
    expect(
      screen.getByRole("link", { name: "Upload a prescription" })
    ).toHaveAttribute("href", "/prescriptions/new")
  })

  it("explains an empty list", async () => {
    list = []
    renderList()
    expect(await screen.findByText("No prescriptions yet")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Upload a prescription" })
    ).toHaveAttribute("href", "/prescriptions/new")
  })

  it("offers a retry when loading fails", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/prescriptions/me": () => (failing ? fail(500, "INTERNAL_ERROR") : list),
    })
    renderList()
    expect(
      await screen.findByText("Your prescriptions could not be loaded")
    ).toBeVisible()
    failing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findAllByRole("link", { name: /Request from/ })
    ).toHaveLength(3)
  })
})
