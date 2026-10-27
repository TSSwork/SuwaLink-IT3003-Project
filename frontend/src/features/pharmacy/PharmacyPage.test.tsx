import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PublicPharmacy } from "@/api/types"
import { PharmacyPage } from "@/features/pharmacy/PharmacyPage"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"
import { pharmacyItem, publicPharmacy } from "@/test/fixtures"
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
    height,
  }: {
    value: { lat: number; lng: number }
    label: string
    onPick?: unknown
    height: number | string
  }) => (
    <p
      data-testid="map"
      data-readonly={String(onPick === undefined)}
      data-height={String(height)}
    >
      {label}: {value.lat},{value.lng}
    </p>
  ),
}))

let api: ReturnType<typeof mockApi>
let pharmacy: PublicPharmacy

function renderPharmacy() {
  return renderRoutes(
    [
      { path: "/pharmacies/$id", component: PharmacyPage },
      { path: "/medicines/$id" },
      { path: "/search" },
    ],
    "/pharmacies/p1"
  )
}

const row = (name: string) =>
  screen.getByRole("link", { name }).closest("li") as HTMLElement

beforeEach(() => {
  useSessionStore.getState().clear()
  useCartStore.getState().clear()
  pharmacy = publicPharmacy({
    items: [
      pharmacyItem(),
      pharmacyItem({
        inventoryId: "inv2",
        medicineId: "m2",
        brandName: "Amoxil",
        genericName: "Amoxicillin",
        strength: "250 mg",
        dosageForm: "Capsule",
        requiresPrescription: true,
        unitPrice: 45,
        stockQuantity: 2,
      }),
    ],
  })
  api = mockApi({ "/pharmacies/p1": () => pharmacy })
})
afterEach(() => api.restore())

describe("PharmacyPage", () => {
  it("shows where the pharmacy is and how to reach it", async () => {
    renderPharmacy()
    expect(
      await screen.findByRole("heading", { level: 1, name: "City Pharmacy" })
    ).toBeVisible()
    expect(screen.getByText("12 Galle Road")).toBeVisible()
    expect(screen.getByText("Colombo 03, Colombo")).toBeVisible()
    expect(screen.getByText("8am - 10pm")).toBeVisible()
    expect(screen.getByRole("link", { name: /0112345678/ })).toHaveAttribute(
      "href",
      "tel:0112345678"
    )
    const directions = screen.getByRole("link", { name: /Directions/ })
    expect(directions).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/directions?to=6.9271,79.8612"
    )
    expect(directions).toHaveAttribute("target", "_blank")
    expect(directions).toHaveAttribute(
      "rel",
      expect.stringContaining("noopener")
    )
    const map = await screen.findByTestId("map")
    expect(map).toHaveTextContent("Map of City Pharmacy: 6.9271,79.8612")
    expect(map).toHaveAttribute("data-readonly", "true")
    // Fills its responsive box (h-56 / sm:h-72) so the attribution stays visible.
    expect(map).toHaveAttribute("data-height", "100%")
  })

  it("lists its medicines with price, stock and the prescription badge", async () => {
    renderPharmacy()
    await screen.findByRole("link", { name: "Amoxil" })
    expect(screen.getByRole("link", { name: "Amoxil" })).toHaveAttribute(
      "href",
      "/medicines/m2"
    )
    const amoxil = row("Amoxil")
    expect(
      within(amoxil).getByText("Amoxicillin · 250 mg · Capsule")
    ).toBeVisible()
    expect(within(amoxil).getByText("Prescription needed")).toBeVisible()
    expect(within(amoxil).getByText("Only 2 left")).toBeVisible()
    expect(within(amoxil).getByText(/45\.00/)).toBeVisible()
    expect(within(row("Panadol")).getByText("In stock")).toBeVisible()
    expect(within(row("Panadol")).queryByText("Prescription needed")).toBeNull()
  })

  it("filters the list by brand or generic name", async () => {
    renderPharmacy()
    await screen.findByRole("link", { name: "Amoxil" })
    const filter = screen.getByRole("searchbox", { name: "Filter medicines" })
    await userEvent.type(filter, "amoxi")
    expect(screen.getByRole("link", { name: "Amoxil" })).toBeVisible()
    expect(screen.queryByRole("link", { name: "Panadol" })).toBeNull()

    await userEvent.clear(filter)
    await userEvent.type(filter, "PARACET")
    expect(screen.getByRole("link", { name: "Panadol" })).toBeVisible()

    await userEvent.clear(filter)
    await userEvent.type(filter, "zzz")
    expect(screen.getByText("No medicines match “zzz”")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Clear filter" }))
    expect(filter).toHaveValue("")
    expect(screen.getByRole("link", { name: "Panadol" })).toBeVisible()
  })

  it("adds an item to the cart", async () => {
    renderPharmacy()
    await screen.findByRole("link", { name: "Amoxil" })
    await userEvent.click(
      within(row("Amoxil")).getByRole("button", { name: "Add to cart" })
    )
    expect(useCartStore.getState().lines).toEqual([
      {
        inventoryItemId: "inv2",
        pharmacyId: "p1",
        pharmacyName: "City Pharmacy",
        medicineId: "m2",
        medicineName: "Amoxil",
        strength: "250 mg",
        unitPrice: 45,
        quantity: 1,
        maxQuantity: 2,
        requiresPrescription: true,
      },
    ])
  })

  it("explains an empty shelf", async () => {
    pharmacy = publicPharmacy({ items: [], phone: null, openingHours: null })
    renderPharmacy()
    expect(
      await screen.findByText("No medicines in stock right now")
    ).toBeVisible()
    expect(screen.getByText("Hours not listed")).toBeVisible()
    expect(screen.queryByRole("link", { name: /tel/ })).toBeNull()
  })

  it("shows a not-found state for an unknown or hidden pharmacy", async () => {
    api.restore()
    api = mockApi({ "/pharmacies/p1": () => fail(404, "NOT_FOUND") })
    renderPharmacy()
    expect(await screen.findByText("Pharmacy not found")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Search medicines" })
    ).toHaveAttribute("href", "/search")
  })

  it("offers a retry for other errors", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/pharmacies/p1": () =>
        failing ? fail(500, "INTERNAL_ERROR") : pharmacy,
    })
    renderPharmacy()
    expect(
      await screen.findByText("Pharmacy could not be loaded")
    ).toBeVisible()
    failing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("heading", { level: 1, name: "City Pharmacy" })
    ).toBeVisible()
  })
})
