import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PrescriptionReply, PrescriptionRequest } from "@/api/types"
import { PrescriptionDetailPage } from "@/features/prescriptions/PrescriptionDetailPage"
import { useCartStore } from "@/stores/cartStore"
import { useSessionStore } from "@/stores/sessionStore"
import { prescriptionReply, prescriptionRequest } from "@/test/fixtures"
import { fail, mockApi, raw } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

let api: ReturnType<typeof mockApi>
let request: PrescriptionRequest
let replies: Array<PrescriptionReply>

function handlers(
  over: Record<string, Parameters<typeof mockApi>[0][string]> = {}
) {
  return {
    "/prescriptions/rx1": ({ method }: { method: string }) => {
      if (method === "delete") return null
      return request
    },
    "/prescriptions/rx1/responses": () => replies,
    "/prescriptions/rx1/close": () => {
      request = { ...request, status: "CLOSED" as const }
      return request
    },
    "/images/img1/content": () =>
      raw(new Blob(["image"], { type: "image/webp" })),
    ...over,
  }
}

async function renderDetail() {
  const view = renderRoutes(
    [
      { path: "/prescriptions/$id", component: PrescriptionDetailPage },
      { path: "/prescriptions" },
      { path: "/pharmacies/$id" },
      { path: "/cart" },
    ],
    "/prescriptions/rx1"
  )
  await screen.findByRole("heading", { level: 1 })
  return view
}

const reply = (name: string) => screen.getByRole("region", { name })

beforeEach(() => {
  useCartStore.getState().clear()
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  request = prescriptionRequest({ status: "RESPONDED" })
  replies = [
    prescriptionReply(),
    prescriptionReply({
      id: "resp2",
      pharmacyId: "p2",
      pharmacyName: "Lanka Medicals",
      message: null,
      items: [
        {
          id: "ri3",
          inventoryItemId: "inv3",
          medicineBrandName: "Amoxil 250 mg",
          quantity: 21,
          unitPrice: 42,
        },
      ],
    }),
  ]
  URL.createObjectURL = vi.fn(() => "blob:rx1")
  URL.revokeObjectURL = vi.fn()
  vi.mocked(toast.error).mockClear()
  vi.mocked(toast.warning).mockClear()
  api = mockApi(handlers())
})
afterEach(() => api.restore())

describe("PrescriptionDetailPage", () => {
  it("shows the private image fetched with the token, and frees it on leaving", async () => {
    const { unmount } = await renderDetail()
    const image = await screen.findByRole("img", { name: "Your prescription" })
    expect(image).toHaveAttribute("src", "blob:rx1")
    expect(api.callsTo("/images/img1/content")[0].authorization).toBe(
      "Bearer t"
    )
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:rx1")
  })

  it("offers zoom controls on the image", async () => {
    await renderDetail()
    await screen.findByRole("img", { name: "Your prescription" })
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Reset zoom" })).toBeVisible()
  })

  it("shows status, who received it and the note", async () => {
    await renderDetail()
    expect(screen.getByText("Replies received")).toBeVisible()
    expect(screen.getByText("Sent to 8 pharmacies in Colombo")).toBeVisible()
    expect(screen.getByText("Need the full course.")).toBeVisible()
  })

  it("compares replies with quoted prices and totals", async () => {
    await renderDetail()
    const city = await screen.findByRole("region", { name: "City Pharmacy" })
    expect(
      within(city).getByRole("link", { name: "City Pharmacy" })
    ).toHaveAttribute("href", "/pharmacies/p1")
    expect(within(city).getByText("Ready in 15 minutes.")).toBeVisible()
    const amoxil = within(city)
      .getByText("Amoxil 250 mg")
      .closest("li") as HTMLElement
    expect(amoxil).toHaveTextContent(/21 × LKR\s?45\.00/)
    expect(within(city).getByText(/Total/).parentElement).toHaveTextContent(
      /1,070\.00/
    )
    expect(
      within(reply("Lanka Medicals")).getByText(/Total/).parentElement
    ).toHaveTextContent(/882\.00/)
  })

  it("adds a whole reply to the cart at the quoted prices", async () => {
    await renderDetail()
    await screen.findByRole("region", { name: "City Pharmacy" })
    await userEvent.click(
      within(reply("City Pharmacy")).getByRole("button", {
        name: "Add all to cart",
      })
    )
    expect(useCartStore.getState().lines).toEqual([
      expect.objectContaining({
        inventoryItemId: "inv1",
        pharmacyId: "p1",
        pharmacyName: "City Pharmacy",
        medicineName: "Amoxil 250 mg",
        unitPrice: 45,
        quantity: 21,
        maxQuantity: 21,
        requiresPrescription: true,
        prescriptionResponseItemId: "ri1",
        prescriptionRequestId: "rx1",
      }),
      expect.objectContaining({
        inventoryItemId: "inv2",
        quantity: 10,
        maxQuantity: 10,
        prescriptionResponseItemId: "ri2",
      }),
    ])
    expect(
      within(reply("City Pharmacy")).getByRole("link", { name: "Go to cart" })
    ).toHaveAttribute("href", "/cart")
  })

  it("says how many were added when the cart limit is hit partway", async () => {
    useCartStore.setState({
      lines: Array.from({ length: 19 }, (_, i) => ({
        inventoryItemId: `x${i}`,
        pharmacyId: "p1",
        pharmacyName: "City Pharmacy",
        medicineId: "m1",
        medicineName: `Medicine ${i}`,
        strength: "",
        unitPrice: 1,
        quantity: 1,
        maxQuantity: 5,
        requiresPrescription: false,
      })),
    })
    await renderDetail()
    await screen.findByRole("region", { name: "City Pharmacy" })
    await userEvent.click(
      within(reply("City Pharmacy")).getByRole("button", {
        name: "Add all to cart",
      })
    )
    expect(useCartStore.getState().lines).toHaveLength(20)
    expect(toast.error).toHaveBeenCalledWith(
      "Added 1 of 2 items. A reservation can hold at most 20 different medicines from one pharmacy."
    )
  })

  it("warns when a quoted item replaces the same item already in the cart", async () => {
    useCartStore.getState().add({
      inventoryItemId: "inv1",
      pharmacyId: "p1",
      pharmacyName: "City Pharmacy",
      medicineId: "m1",
      medicineName: "Amoxil 250 mg",
      strength: "",
      unitPrice: 50,
      quantity: 1,
      maxQuantity: 30,
      requiresPrescription: true,
    })
    await renderDetail()
    await screen.findByRole("region", { name: "City Pharmacy" })
    await userEvent.click(
      within(reply("City Pharmacy")).getByRole("button", {
        name: "Add all to cart",
      })
    )
    expect(useCartStore.getState().lines[0]).toMatchObject({
      inventoryItemId: "inv1",
      unitPrice: 45,
      prescriptionResponseItemId: "ri1",
    })
    expect(toast.warning).toHaveBeenCalledWith(
      "This medicine was already in your cart at another price, so that line was replaced."
    )
  })

  it("keeps the downloaded image when the request is closed", async () => {
    await renderDetail()
    await screen.findByRole("img", { name: "Your prescription" })
    await userEvent.click(screen.getByRole("button", { name: "Close request" }))
    const confirm = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Close request" })
    )
    expect(await screen.findByText("Closed")).toBeVisible()
    // Let any refetch the close triggered run.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(api.callsTo("/images/img1/content")).toHaveLength(1)
  })

  it("adds one quoted item, capped at the quoted quantity", async () => {
    await renderDetail()
    const lanka = await screen.findByRole("region", { name: "Lanka Medicals" })
    const input = within(lanka).getByRole("spinbutton", { name: "Quantity" })
    await userEvent.clear(input)
    await userEvent.type(input, "50")
    await userEvent.tab()
    expect(input).toHaveValue(21)
    await userEvent.click(
      within(lanka).getByRole("button", { name: "Add to cart" })
    )
    expect(useCartStore.getState().lines).toEqual([
      expect.objectContaining({
        inventoryItemId: "inv3",
        quantity: 21,
        maxQuantity: 21,
        unitPrice: 42,
        prescriptionResponseItemId: "ri3",
      }),
    ])
  })

  it("explains the wait when no pharmacy has replied", async () => {
    request = prescriptionRequest({ status: "PENDING" })
    replies = []
    await renderDetail()
    expect(await screen.findByText("No replies yet")).toBeVisible()
  })

  it("marks a pharmacy that is no longer available", async () => {
    replies = [prescriptionReply({ pharmacyActive: false })]
    await renderDetail()
    const city = await screen.findByRole("region", { name: "City Pharmacy" })
    expect(
      within(city).getByText("This pharmacy is no longer available.")
    ).toBeVisible()
    expect(within(city).queryByRole("button", { name: /Add/ })).toBeNull()
  })

  it("closes the request after confirming", async () => {
    await renderDetail()
    await userEvent.click(screen.getByRole("button", { name: "Close request" }))
    const confirm = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Close request" })
    )
    await waitFor(() =>
      expect(
        api.callsTo("/prescriptions/rx1/close").map((c) => c.method)
      ).toEqual(["patch"])
    )
    expect(await screen.findByText("Closed")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Close request" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add all to cart" })).toBeNull()
  })

  it("shows why a request with reservations cannot be deleted", async () => {
    api.restore()
    api = mockApi(
      handlers({
        "/prescriptions/rx1": ({ method }: { method: string }) =>
          method === "delete" ? fail(409, "REQUEST_HAS_RESERVATIONS") : request,
      })
    )
    await renderDetail()
    await userEvent.click(
      screen.getByRole("button", { name: "Delete request" })
    )
    const confirm = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Delete" })
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This request has reservations. Close it instead of deleting it."
      )
    )
  })

  it("goes back to the list after deleting", async () => {
    const { router } = await renderDetail()
    await userEvent.click(
      screen.getByRole("button", { name: "Delete request" })
    )
    const confirm = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Delete" })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/prescriptions")
    )
  })

  it("shows not found for someone else's request", async () => {
    api.restore()
    api = mockApi(
      handlers({ "/prescriptions/rx1": () => fail(403, "ACCESS_DENIED") })
    )
    renderRoutes(
      [{ path: "/prescriptions/$id", component: PrescriptionDetailPage }],
      "/prescriptions/rx1"
    )
    expect(await screen.findByText("Prescription not found")).toBeVisible()
  })
})
