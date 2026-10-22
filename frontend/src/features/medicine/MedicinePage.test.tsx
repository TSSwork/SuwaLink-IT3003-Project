import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Bookmark, Offer } from "@/api/types"
import { MedicinePage } from "@/features/medicine/MedicinePage"
import { useCartStore } from "@/stores/cartStore"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"
import { bookmark, medicineDetail, offer } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>
let offers: Array<Offer>
let saved: Array<Bookmark>

const NEAR = offer({
  inventoryId: "inv-near",
  unitPrice: 15,
  stockQuantity: 3,
  distanceKm: 0.42,
  pharmacy: { id: "p-near", name: "Near Pharmacy", city: "Colombo 03" },
})
const CHEAP = offer({
  inventoryId: "inv-cheap",
  unitPrice: 10,
  stockQuantity: 40,
  distanceKm: 4.26,
  pharmacy: { id: "p-cheap", name: "Cheap Pharmacy", city: "Dehiwala" },
})

function renderMedicine() {
  return renderRoutes(
    [
      { path: "/medicines/$id", component: MedicinePage },
      { path: "/pharmacies/$id" },
      { path: "/search" },
      { path: "/login" },
    ],
    "/medicines/m1"
  )
}

const offerCalls = () => api.callsTo("/medicines/m1/offers").map((c) => c.params)
const card = (name: string) =>
  screen.getByRole("link", { name }).closest("li") as HTMLElement

function signInCustomer() {
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
}

beforeEach(() => {
  useLocationStore.getState().clear()
  useSessionStore.getState().clear()
  useCartStore.getState().clear()
  offers = [NEAR, CHEAP]
  saved = []
  api = mockApi({
    "/medicines/m1": () => medicineDetail(),
    "/medicines/m1/offers": ({ params }) =>
      params.sort === "price" ? [CHEAP, NEAR] : offers,
    "/bookmarks": () => saved,
    "/bookmarks/inv-near": ({ method }) => {
      if (method === "post") {
        saved = [bookmark({ inventory: { id: "inv-near" } })]
        return saved[0]
      }
      saved = []
      return null
    },
  })
})
afterEach(() => api.restore())

describe("MedicinePage", () => {
  it("shows what the medicine is", async () => {
    renderMedicine()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Panadol" })
    ).toBeVisible()
    expect(screen.getByText("Paracetamol")).toBeVisible()
    expect(screen.getByText("500 mg · Tablet")).toBeVisible()
    expect(screen.getByText("GSK")).toBeVisible()
    expect(screen.getByText("Pain relief")).toBeVisible()
    expect(
      screen.getByText("For mild to moderate pain and fever.")
    ).toBeVisible()
    expect(
      screen.queryByText("Bring your prescription when you collect")
    ).toBeNull()
  })

  it("tells the customer to bring a prescription when one is needed", async () => {
    api.restore()
    api = mockApi({
      "/medicines/m1": () =>
        medicineDetail({ requiresPrescription: true, legalCategory: "PRESCRIPTION" }),
      "/medicines/m1/offers": () => [],
    })
    renderMedicine()
    expect(
      await screen.findByText("Bring your prescription when you collect")
    ).toBeVisible()
  })

  it("sorts by price with no toggle when no point is known", async () => {
    useLocationStore.getState().setDistrict("COLOMBO")
    renderMedicine()
    await screen.findByRole("link", { name: "Cheap Pharmacy" })
    expect(offerCalls()).toEqual([{ district: "COLOMBO", sort: "price" }])
    expect(screen.queryByRole("radio", { name: "Nearest" })).toBeNull()
  })

  it("sorts by distance near a point, and toggles to price", async () => {
    useLocationStore.getState().setPoint(6.9, 79.85, "device")
    renderMedicine()
    await screen.findByRole("link", { name: "Near Pharmacy" })
    expect(offerCalls()).toEqual([{ lat: 6.9, lng: 79.85, sort: "distance" }])
    expect(screen.getByRole("radio", { name: "Nearest" })).toBeChecked()
    const names = () =>
      within(screen.getByRole("list", { name: /Where to get it/ }))
        .getAllByRole("link")
        .map((link) => link.textContent)
    expect(names()).toEqual(["Near Pharmacy", "Cheap Pharmacy"])
    expect(within(card("Near Pharmacy")).getByText(/400\s?m/)).toBeVisible()
    expect(within(card("Cheap Pharmacy")).getByText(/4\.3\s?km/)).toBeVisible()

    await userEvent.click(screen.getByRole("radio", { name: "Lowest price" }))
    await waitFor(() => expect(names()).toEqual(["Cheap Pharmacy", "Near Pharmacy"]))
    expect(offerCalls().at(-1)).toEqual({ lat: 6.9, lng: 79.85, sort: "price" })
  })

  it("links each pharmacy and shows where it is", async () => {
    renderMedicine()
    const link = await screen.findByRole("link", { name: "Near Pharmacy" })
    expect(link).toHaveAttribute("href", "/pharmacies/p-near")
    expect(within(card("Near Pharmacy")).getByText("Colombo 03, Colombo")).toBeVisible()
  })

  it("says how much stock is left", async () => {
    renderMedicine()
    await screen.findByRole("link", { name: "Near Pharmacy" })
    expect(within(card("Near Pharmacy")).getByText("Only 3 left")).toBeVisible()
    expect(within(card("Cheap Pharmacy")).getByText("In stock")).toBeVisible()
  })

  it("adds an offer to the cart at its price", async () => {
    renderMedicine()
    await screen.findByRole("link", { name: "Near Pharmacy" })
    await userEvent.click(
      within(card("Near Pharmacy")).getByRole("button", { name: "Add to cart" })
    )
    expect(useCartStore.getState().lines).toEqual([
      {
        inventoryItemId: "inv-near",
        pharmacyId: "p-near",
        pharmacyName: "Near Pharmacy",
        medicineId: "m1",
        medicineName: "Panadol",
        strength: "500 mg",
        unitPrice: 15,
        quantity: 1,
        maxQuantity: 3,
        requiresPrescription: false,
      },
    ])
  })

  it("offers no Save button to signed-out visitors", async () => {
    renderMedicine()
    await screen.findByRole("link", { name: "Near Pharmacy" })
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(api.callsTo("/bookmarks")).toEqual([])
  })

  it("lets a customer save and unsave an offer", async () => {
    signInCustomer()
    renderMedicine()
    await screen.findByRole("link", { name: "Near Pharmacy" })
    const save = await within(card("Near Pharmacy")).findByRole("button", {
      name: "Save",
    })
    expect(save).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute("aria-pressed", "true"))
    expect(save).toHaveAccessibleName("Saved")

    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute("aria-pressed", "false"))
    expect(
      api.callsTo("/bookmarks/inv-near").map((c) => c.method)
    ).toEqual(["post", "delete"])
  })

  it("shows a not-found state for an unknown medicine", async () => {
    api.restore()
    api = mockApi({
      "/medicines/m1": () => fail(404, "NOT_FOUND"),
      "/medicines/m1/offers": () => fail(404, "NOT_FOUND"),
    })
    renderMedicine()
    expect(await screen.findByText("Medicine not found")).toBeVisible()
    expect(screen.getByRole("link", { name: "Search medicines" })).toHaveAttribute(
      "href",
      "/search"
    )
  })

  it("explains what to do when no pharmacy stocks it", async () => {
    offers = []
    renderMedicine()
    expect(
      await screen.findByText("No pharmacy has this in stock right now")
    ).toBeVisible()
  })

  it("retries offers after an error", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/medicines/m1": () => medicineDetail(),
      "/medicines/m1/offers": () => (failing ? fail(500, "INTERNAL_ERROR") : [NEAR]),
    })
    renderMedicine()
    expect(await screen.findByText("Pharmacies could not be loaded")).toBeVisible()
    failing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("link", { name: "Near Pharmacy" })).toBeVisible()
  })
})
