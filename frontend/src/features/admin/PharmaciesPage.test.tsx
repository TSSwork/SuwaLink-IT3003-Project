import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AdminPharmacy } from "@/api/types"
import { PharmaciesPage } from "@/features/admin/PharmaciesPage"
import { validatePharmaciesSearch } from "@/features/admin/pharmaciesSearch"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { adminPharmacy } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

// Leaflet needs a real browser; the test only checks what the map is given.
vi.mock("@/components/map/MapView", () => ({
  default: ({
    value,
    label,
    onPick,
  }: {
    value: { lat: number; lng: number }
    label: string
    onPick?: unknown
  }) => (
    <p data-testid="map" data-readonly={String(onPick === undefined)}>
      {label}: {value.lat},{value.lng}
    </p>
  ),
}))

let api: ReturnType<typeof mockApi>
let pharmacies: Array<AdminPharmacy>

function renderAt(path = "/admin/pharmacies") {
  return renderRoutes(
    [
      {
        path: "/admin/pharmacies",
        component: PharmaciesPage,
        validateSearch: validatePharmaciesSearch,
      },
    ],
    path
  )
}

function list() {
  return screen.findByRole("list", { name: "Pharmacies" })
}

function names(ul: HTMLElement) {
  return within(ul)
    .getAllByRole("button")
    .map((button) => button.querySelector("h3")?.textContent)
}

function setStatus(id: string, status: AdminPharmacy["status"]) {
  pharmacies = pharmacies.map((p) => (p.id === id ? { ...p, status } : p))
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  pharmacies = [
    adminPharmacy(),
    adminPharmacy({
      id: "p2",
      pharmacyName: "Hill Pharmacy",
      district: "KANDY",
      city: "Peradeniya",
      status: "VERIFIED",
      demo: true,
    }),
    adminPharmacy({
      id: "p3",
      pharmacyName: "Lake Pharmacy",
      status: "REJECTED",
      phone: null,
      openingHours: null,
    }),
  ]
  api = mockApi({
    "/admin/pharmacies": () => pharmacies,
    "/admin/pharmacies/p1/approve": () => setStatus("p1", "VERIFIED"),
    "/admin/pharmacies/p1/reject": () => setStatus("p1", "REJECTED"),
    "/admin/pharmacies/p3/approve": () => setStatus("p3", "VERIFIED"),
    "/admin/dashboard": () => ({}),
  })
})
afterEach(() => api.restore())

describe("admin PharmaciesPage", () => {
  it("shows the pharmacies waiting for approval by default", async () => {
    renderAt()
    expect(names(await list())).toEqual(["City Pharmacy"])
    expect(
      screen.getByRole("button", { name: "Waiting", pressed: true })
    ).toBeVisible()
  })

  it("keeps the status filter in the URL", async () => {
    const { router } = renderAt("/admin/pharmacies?status=VERIFIED")
    expect(names(await list())).toEqual(["Hill Pharmacy"])
    await userEvent.click(screen.getByRole("button", { name: "All" }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ status: "ALL" })
    )
    expect(names(await list())).toEqual([
      "City Pharmacy",
      "Hill Pharmacy",
      "Lake Pharmacy",
    ])
    await userEvent.click(screen.getByRole("button", { name: "Rejected" }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ status: "REJECTED" })
    )
    expect(names(await list())).toEqual(["Lake Pharmacy"])
  })

  it("falls back to waiting for an unknown status", async () => {
    renderAt("/admin/pharmacies?status=bogus")
    expect(names(await list())).toEqual(["City Pharmacy"])
  })

  it("shows each row's location, licence, email, demo badge and status", async () => {
    renderAt("/admin/pharmacies?status=ALL")
    const ul = await list()
    const [city, hill] = within(ul).getAllByRole("listitem")
    expect(city).toHaveTextContent("Colombo 03, Colombo")
    expect(city).toHaveTextContent("PH-2024-0012")
    expect(city).toHaveTextContent("kamal@example.lk")
    expect(city).toHaveTextContent("Waiting for approval")
    expect(within(city).queryByText("Demo")).toBeNull()
    expect(hill).toHaveTextContent("Peradeniya, Kandy")
    expect(within(hill).getByText("Demo")).toBeVisible()
    expect(hill).toHaveTextContent("Verified")
  })

  it("opens the details with a read-only map of the pin", async () => {
    renderAt()
    await userEvent.click(
      within(await list()).getByRole("button", { name: /City Pharmacy/ })
    )
    const sheet = await screen.findByRole("dialog", { name: "City Pharmacy" })
    expect(sheet).toHaveTextContent("12 Galle Road")
    expect(sheet).toHaveTextContent("0112345678")
    expect(sheet).toHaveTextContent("8am - 10pm")
    const map = await within(sheet).findByTestId("map")
    expect(map).toHaveTextContent("Map of City Pharmacy: 6.9271,79.8612")
    expect(map).toHaveAttribute("data-readonly", "true")
  })

  it("approves with a PUT and refetches the list", async () => {
    renderAt()
    await userEvent.click(
      within(await list()).getByRole("button", { name: /City Pharmacy/ })
    )
    const sheet = await screen.findByRole("dialog")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Approve" })
    )
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "City Pharmacy approved. The owner can now sign in."
      )
    )
    expect(api.callsTo("/admin/pharmacies/p1/approve")[0].method).toBe("put")
    await waitFor(() => expect(sheet).toHaveTextContent("Verified"))
    expect(api.callsTo("/admin/pharmacies").length).toBeGreaterThan(1)
  })

  it("asks before rejecting", async () => {
    renderAt()
    await userEvent.click(
      within(await list()).getByRole("button", { name: /City Pharmacy/ })
    )
    const sheet = await screen.findByRole("dialog")
    await userEvent.click(within(sheet).getByRole("button", { name: "Reject" }))
    const confirm = await screen.findByRole("alertdialog", {
      name: "Reject City Pharmacy?",
    })
    expect(api.callsTo("/admin/pharmacies/p1/reject")).toHaveLength(0)
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Reject" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/pharmacies/p1/reject")).toHaveLength(1)
    )
    expect(api.callsTo("/admin/pharmacies/p1/reject")[0].method).toBe("put")
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("City Pharmacy rejected.")
    )
  })

  it("offers approval again for a rejected pharmacy, and no reject", async () => {
    renderAt("/admin/pharmacies?status=REJECTED")
    await userEvent.click(
      within(await list()).getByRole("button", { name: /Lake Pharmacy/ })
    )
    const sheet = await screen.findByRole("dialog")
    expect(sheet).toHaveTextContent("Not added yet")
    expect(within(sheet).queryByRole("button", { name: "Reject" })).toBeNull()
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Approve" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/pharmacies/p3/approve")).toHaveLength(1)
    )
  })

  it("offers no actions for a verified pharmacy", async () => {
    renderAt("/admin/pharmacies?status=VERIFIED")
    await userEvent.click(
      within(await list()).getByRole("button", { name: /Hill Pharmacy/ })
    )
    const sheet = await screen.findByRole("dialog")
    expect(within(sheet).queryByRole("button", { name: "Approve" })).toBeNull()
    expect(within(sheet).queryByRole("button", { name: "Reject" })).toBeNull()
  })

  it("shows a failed action translated and keeps the sheet open", async () => {
    api.restore()
    api = mockApi({
      "/admin/pharmacies": () => pharmacies,
      "/admin/pharmacies/p1/approve": () => fail(404, "NOT_FOUND"),
    })
    renderAt()
    await userEvent.click(
      within(await list()).getByRole("button", { name: /City Pharmacy/ })
    )
    const sheet = await screen.findByRole("dialog")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Approve" })
    )
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).not.toBe("English")
    expect(sheet).toBeVisible()
  })

  it("says what to do when nothing is waiting", async () => {
    pharmacies = pharmacies.filter((p) => p.status !== "PENDING")
    renderAt()
    expect(
      await screen.findByText("No pharmacies waiting for approval")
    ).toBeVisible()
    await userEvent.click(
      screen.getByRole("button", { name: "Show all pharmacies" })
    )
    expect(names(await list())).toEqual(["Hill Pharmacy", "Lake Pharmacy"])
  })

  it("explains a failed load and retries", async () => {
    api.restore()
    let fails = true
    api = mockApi({
      "/admin/pharmacies": () =>
        fails ? fail(500, "INTERNAL_ERROR") : pharmacies,
    })
    renderAt()
    expect(await screen.findByText("Could not load pharmacies")).toBeVisible()
    fails = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(names(await list())).toEqual(["City Pharmacy"])
  })
})
