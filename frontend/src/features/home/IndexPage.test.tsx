import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Reservation, Role } from "@/api/types"
import { IndexPage } from "@/features/home/IndexPage"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"
import { reservation } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

let api: ReturnType<typeof mockApi>
let mine: () => Array<Reservation>

function renderHome() {
  return renderRoutes(
    [
      { path: "/", component: IndexPage },
      { path: "/search" },
      { path: "/login" },
      { path: "/prescriptions/new" },
      { path: "/reservations" },
      { path: "/reservations/$id" },
    ],
    "/"
  )
}

function signIn(role: Role) {
  useSessionStore
    .getState()
    .setSession("jwt", { id: "u1", name: "Nimal", role })
}

beforeEach(() => {
  useSessionStore.getState().clear()
  useLocationStore.getState().clear()
  mine = () => []
  api = mockApi({ "/reservations/me": () => mine() })
})
afterEach(() => api.restore())

describe("IndexPage", () => {
  it("sends the search to /search?q=", async () => {
    const user = userEvent.setup()
    const { router } = renderHome()
    await user.type(
      await screen.findByLabelText("Medicine or generic name"),
      "  panadol {Enter}"
    )
    expect(await screen.findByText("page:/search")).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ q: "panadol" })
  })

  it("browses everything when the box is empty", async () => {
    const user = userEvent.setup()
    const { router } = renderHome()
    await user.click(await screen.findByRole("button", { name: "Search" }))
    expect(await screen.findByText("page:/search")).toBeInTheDocument()
    expect(router.state.location.search).toEqual({})
  })

  it("offers the location chooser", async () => {
    renderHome()
    expect(
      await screen.findByRole("button", { name: /Set your location/ })
    ).toBeVisible()
  })

  it("sends signed-out visitors to sign in before uploading, and loads no reservations", async () => {
    renderHome()
    expect(
      await screen.findByRole("link", { name: "Upload a prescription" })
    ).toHaveAttribute("href", "/login?redirect=%2Fprescriptions%2Fnew")
    expect(
      screen.queryByRole("heading", { name: "Your recent reservations" })
    ).not.toBeInTheDocument()
    expect(api.calls).toEqual([])
  })

  it("explains how it works in three ordered steps", async () => {
    renderHome()
    const steps = await screen.findByRole("list", { name: "How SuwaLink works" })
    expect(steps.tagName).toBe("OL")
    const items = within(steps).getAllByRole("listitem")
    expect(items.map((item) => item.querySelector("h3")?.textContent)).toEqual(
      ["Search or upload", "Pharmacies reply", "Reserve and pick up"]
    )
  })

  it("shows a signed-in customer their three latest reservations", async () => {
    signIn("CUSTOMER")
    mine = () => [
      reservation({ id: "r1", pickupCode: "AAA111" }),
      reservation({
        id: "r2",
        pickupCode: "BBB222",
        status: "COMPLETED",
        pharmacy: { ...reservation().pharmacy, name: "Hill Pharmacy" },
      }),
      reservation({ id: "r3", pickupCode: "CCC333", status: "EXPIRED" }),
      reservation({ id: "r4", pickupCode: "DDD444" }),
    ]
    renderHome()
    const section = (
      await screen.findByRole("heading", { name: "Your recent reservations" })
    ).closest("section")!
    const list = await within(section).findByRole("list")
    const rows = within(list).getAllByRole("listitem")
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("City Pharmacy")
    expect(rows[0]).toHaveTextContent("Confirmed")
    expect(rows[0]).toHaveTextContent("AAA111")
    expect(rows[1]).toHaveTextContent("Hill Pharmacy")
    expect(rows[1]).toHaveTextContent("Collected")
    expect(rows[2]).toHaveTextContent("Expired")
    expect(section).not.toHaveTextContent("DDD444")
    expect(within(rows[0]).getByRole("link")).toHaveAttribute(
      "href",
      "/reservations/r1"
    )
    expect(
      within(section).getByRole("link", { name: "See all reservations" })
    ).toHaveAttribute("href", "/reservations")
    expect(
      screen.getByRole("link", { name: "Upload a prescription" })
    ).toHaveAttribute("href", "/prescriptions/new")
  })

  it("tells a customer with no reservations how to make one", async () => {
    signIn("CUSTOMER")
    renderHome()
    expect(
      await screen.findByText(
        "No reservations yet. Search for a medicine and reserve it at a pharmacy near you."
      )
    ).toBeVisible()
  })

  it("lets the customer retry when reservations fail to load", async () => {
    signIn("CUSTOMER")
    let attempts = 0
    mine = () => {
      attempts += 1
      if (attempts === 1) fail(500, "INTERNAL_ERROR")
      return [reservation()]
    }
    const user = userEvent.setup()
    renderHome()
    expect(
      await screen.findByText("Your reservations could not be loaded")
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("K7Q2MX")).toBeVisible()
  })

  it("shows no reservations block to pharmacy owners", async () => {
    signIn("PHARMACY_OWNER")
    renderHome()
    await screen.findByRole("link", { name: "Upload a prescription" })
    await waitFor(() => expect(api.calls).toEqual([]))
    expect(
      screen.queryByRole("heading", { name: "Your recent reservations" })
    ).not.toBeInTheDocument()
  })
})
