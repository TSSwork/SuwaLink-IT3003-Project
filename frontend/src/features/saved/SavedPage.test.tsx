import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Bookmark } from "@/api/types"
import { SavedPage } from "@/features/saved/SavedPage"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"
import { bookmark } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>
let saved: Array<Bookmark>

const GONE = bookmark({
  id: "b2",
  inventory: {
    id: "inv2",
    available: false,
    stockQuantity: 0,
    medicine: {
      id: "m2",
      brandName: "Amoxil",
      genericName: "Amoxicillin",
      dosageForm: "Capsule",
      strength: "250 mg",
      unitOfMeasure: "CAPSULE",
      legalCategory: "PRESCRIPTION",
      category: "Antibiotics",
      manufacturer: "GSK",
    },
  },
})

function renderSaved() {
  return renderRoutes(
    [
      { path: "/saved", component: SavedPage },
      { path: "/search" },
      { path: "/medicines/$id" },
      { path: "/pharmacies/$id" },
    ],
    "/saved"
  )
}

const row = (name: string) =>
  screen.getByRole("link", { name }).closest("li") as HTMLElement

beforeEach(() => {
  useCartStore.getState().clear()
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  saved = [bookmark(), GONE]
  vi.mocked(toast.error).mockClear()
  api = mockApi({
    "/bookmarks": () => saved,
    "/bookmarks/inv1": () => {
      saved = saved.filter((b) => b.inventory.id !== "inv1")
      return null
    },
  })
})
afterEach(() => api.restore())

describe("SavedPage", () => {
  it("lists saved offers with their pharmacy and price", async () => {
    renderSaved()
    expect(
      await screen.findByRole("link", { name: "Panadol" })
    ).toHaveAttribute("href", "/medicines/m1")
    const panadol = row("Panadol")
    expect(
      within(panadol).getByText("Paracetamol · 500 mg · Tablet")
    ).toBeVisible()
    expect(
      within(panadol).getByRole("link", { name: "City Pharmacy" })
    ).toHaveAttribute("href", "/pharmacies/p1")
    expect(within(panadol).getByText(/12\.50/)).toBeVisible()
    expect(within(row("Amoxil")).getByText("Prescription needed")).toBeVisible()
  })

  it("adds a saved offer to the cart", async () => {
    renderSaved()
    await screen.findByRole("link", { name: "Panadol" })
    await userEvent.click(
      within(row("Panadol")).getByRole("button", { name: "Add to cart" })
    )
    expect(useCartStore.getState().lines).toEqual([
      {
        inventoryItemId: "inv1",
        pharmacyId: "p1",
        pharmacyName: "City Pharmacy",
        medicineId: "m1",
        medicineName: "Panadol",
        strength: "500 mg",
        unitPrice: 12.5,
        quantity: 1,
        maxQuantity: 40,
        requiresPrescription: false,
      },
    ])
  })

  it("marks an offer that can no longer be reserved", async () => {
    renderSaved()
    await screen.findByRole("link", { name: "Amoxil" })
    const amoxil = row("Amoxil")
    expect(within(amoxil).getByText("No longer available")).toBeVisible()
    expect(
      within(amoxil).queryByRole("button", { name: "Add to cart" })
    ).toBeNull()
  })

  it("removes a saved offer", async () => {
    renderSaved()
    await screen.findByRole("link", { name: "Panadol" })
    await userEvent.click(
      within(row("Panadol")).getByRole("button", {
        name: "Remove Panadol from saved",
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Panadol" })).toBeNull()
    )
    expect(api.callsTo("/bookmarks/inv1").map((c) => c.method)).toEqual([
      "delete",
    ])
  })

  it("shows a translated toast when removing fails", async () => {
    api.restore()
    api = mockApi({
      "/bookmarks": () => saved,
      "/bookmarks/inv1": () => fail(404, "NOT_FOUND"),
    })
    renderSaved()
    await screen.findByRole("link", { name: "Panadol" })
    await userEvent.click(
      within(row("Panadol")).getByRole("button", {
        name: "Remove Panadol from saved",
      })
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We could not find what you were looking for."
      )
    )
  })

  it("shows what to do when nothing is saved", async () => {
    saved = []
    renderSaved()
    expect(await screen.findByText("Nothing saved yet")).toBeVisible()
    expect(screen.getByRole("link", { name: "Find medicine" })).toHaveAttribute(
      "href",
      "/search"
    )
  })

  it("offers a retry when the list fails", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/bookmarks": () => (failing ? fail(500, "INTERNAL_ERROR") : saved),
    })
    renderSaved()
    expect(
      await screen.findByText("Saved items could not be loaded")
    ).toBeVisible()
    failing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("link", { name: "Panadol" })).toBeVisible()
  })
})
