import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Call } from "@/test/mockApi"
import { RequestsPage } from "@/features/pharmacy-owner/RequestsPage"
import { useSessionStore } from "@/stores/sessionStore"
import { prescriptionReply, prescriptionRequest } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

type Handlers = Record<string, (call: Call) => unknown>

let api: ReturnType<typeof mockApi>

const fullData: Handlers = {
  "/prescriptions": () => [
    prescriptionRequest({
      id: "rx1",
      patientAge: 61,
      note: "Replied one",
      // RESPONDED because some pharmacy replied; here it is this one.
      status: "RESPONDED",
      createdAt: "2026-10-21T09:30:00",
    }),
    prescriptionRequest({
      id: "rx2",
      patientAge: 34,
      note: "Need the full course.",
      // Another pharmacy replied; this one has not.
      status: "RESPONDED",
      targetScope: "ALL",
      district: null,
      targetCount: 42,
      createdAt: "2026-10-22T09:30:00",
    }),
    prescriptionRequest({
      id: "rx3",
      patientAge: 8,
      note: null,
      createdAt: "2026-10-23T09:30:00",
    }),
  ],
  "/prescriptions/responses/me": () => [
    prescriptionReply({ prescriptionRequestId: "rx1" }),
  ],
}

function renderRequests(handlers: Handlers = fullData) {
  api = mockApi(handlers)
  return renderRoutes(
    [
      { path: "/pharmacy/requests", component: RequestsPage },
      { path: "/pharmacy/requests/$id" },
    ],
    "/pharmacy/requests"
  )
}

const rows = () =>
  within(
    screen.getByRole("list", { name: "Prescription requests" })
  ).getAllByRole("listitem")

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
})
afterEach(() => api.restore())

describe("RequestsPage", () => {
  it("shows the requests waiting for this pharmacy first, newest on top", async () => {
    renderRequests()
    await screen.findByRole("list", { name: "Prescription requests" })
    expect(
      screen.getByRole("button", { name: "Waiting", pressed: true })
    ).toBeVisible()
    const shown = rows()
    expect(shown).toHaveLength(2)
    // rx2 is RESPONDED (someone else replied) yet still waits for this pharmacy.
    expect(within(shown[0]).getByText("Patient aged 8")).toBeVisible()
    expect(within(shown[0]).getByText("No note from the patient")).toBeVisible()
    expect(within(shown[1]).getByText("Patient aged 34")).toBeVisible()
    expect(within(shown[1]).getByText("Need the full course.")).toBeVisible()
    expect(
      within(shown[1]).getByText("Sent to all 42 pharmacies")
    ).toBeVisible()
    expect(within(shown[1]).getByText("Waiting for your reply")).toBeVisible()
    expect(screen.queryByText("Patient aged 61")).toBeNull()
  })

  it("filters to replied requests and to all of them", async () => {
    const user = userEvent.setup()
    renderRequests()
    await screen.findByRole("list", { name: "Prescription requests" })

    await user.click(screen.getByRole("button", { name: "Replied" }))
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText("Patient aged 61")).toBeVisible()
    expect(within(rows()[0]).getByText("You replied")).toBeVisible()
    expect(
      within(rows()[0]).getByText("Sent to 8 pharmacies in Colombo")
    ).toBeVisible()

    await user.click(screen.getByRole("button", { name: "All" }))
    expect(rows()).toHaveLength(3)
  })

  it("links each request to its detail page", async () => {
    const user = userEvent.setup()
    renderRequests()
    await screen.findByRole("list", { name: "Prescription requests" })
    await user.click(screen.getByRole("link", { name: /Patient aged 8/ }))
    expect(await screen.findByText("page:/pharmacy/requests/$id")).toBeVisible()
  })

  it("says what happens next when no requests were sent here", async () => {
    renderRequests({
      "/prescriptions": () => [],
      "/prescriptions/responses/me": () => [],
    })
    expect(
      await screen.findByText("No prescription requests yet")
    ).toBeVisible()
    expect(
      screen.getByText(
        "When a customer sends a prescription to your pharmacy, it appears here and in your notifications."
      )
    ).toBeVisible()
  })

  it("offers all requests when none are waiting", async () => {
    const user = userEvent.setup()
    renderRequests({
      "/prescriptions": () => [prescriptionRequest({ id: "rx1" })],
      "/prescriptions/responses/me": () => [
        prescriptionReply({ prescriptionRequestId: "rx1" }),
      ],
    })
    expect(
      await screen.findByText("You have replied to every request")
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Show all requests" }))
    expect(rows()).toHaveLength(1)
  })

  it("shows an error with a retry", async () => {
    const user = userEvent.setup()
    let failing = true
    renderRequests({
      "/prescriptions": () => {
        if (failing) fail(500, "INTERNAL_ERROR")
        return [prescriptionRequest()]
      },
      "/prescriptions/responses/me": () => [],
    })
    expect(
      await screen.findByText("Requests could not be loaded")
    ).toBeVisible()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("list", { name: "Prescription requests" })
    ).toBeVisible()
  })
})
