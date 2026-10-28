import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Reservation } from "@/api/types"
import { ReservationDetailPage } from "@/features/reservations/ReservationDetailPage"
import { useSessionStore } from "@/stores/sessionStore"
import { localIso, reservation } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))
// The QR itself is the library's job; the test checks what it encodes.
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, title }: { value: string; title?: string }) => (
    <svg role="img" aria-label={title} data-value={value} />
  ),
}))

const HOUR = 3_600_000
let api: ReturnType<typeof mockApi>
let current: Reservation

function signIn(role: "CUSTOMER" | "PHARMACY_OWNER" = "CUSTOMER") {
  // The owner is someone else, so seeing "Nimal" proves the customer is shown.
  const user =
    role === "CUSTOMER"
      ? { id: "u1", name: "Nimal", role }
      : { id: "o1", name: "Sunil Pharmacist", role }
  useSessionStore.getState().setSession("t", user)
}

async function renderDetail() {
  const view = renderRoutes(
    [
      { path: "/reservations/$id", component: ReservationDetailPage },
      { path: "/reservations" },
      { path: "/pharmacies/$id" },
    ],
    "/reservations/r1"
  )
  await screen.findByRole("heading", { level: 1 })
  return view
}

beforeEach(() => {
  signIn()
  current = reservation({
    pickupCode: "K7Q2MXH4PA",
    expiresAt: localIso(5.5 * HOUR + 20_000),
  })
  vi.mocked(toast.error).mockClear()
  api = mockApi({
    "/reservations/r1": () => current,
    "/reservations/r1/cancel": ({ data }) => {
      current = {
        ...current,
        status: "CANCELLED",
        cancelledBy: "PATIENT",
        cancelReason: (data as { reason?: string }).reason ?? null,
      }
      return current
    },
    "/reservations/r1/complete": () => {
      current = { ...current, status: "COMPLETED" }
      return current
    },
  })
})
afterEach(() => api.restore())

describe("ReservationDetailPage", () => {
  it("shows a QR that opens the order page, with the code in words", async () => {
    await renderDetail()
    const qr = screen.getByRole("img", { name: /QR code for pickup/ })
    expect(qr).toHaveAttribute(
      "data-value",
      `${window.location.origin}/r/K7Q2MXH4PA`
    )
    expect(screen.getByText("K7Q2MXH4PA")).toHaveClass("font-mono")
  })

  it("counts down the hold", async () => {
    await renderDetail()
    expect(screen.getByText("Confirmed")).toBeVisible()
    expect(screen.getByText("5 h 30 min left")).toBeVisible()
  })

  it("lists the items, the total and where to collect", async () => {
    await renderDetail()
    expect(screen.getByText("Panadol 500 mg")).toBeVisible()
    expect(screen.getByText(/30 × LKR\s?12\.50/)).toBeVisible()
    expect(screen.getByText("Total").parentElement).toHaveTextContent(/375\.00/)
    expect(screen.getByRole("link", { name: "City Pharmacy" })).toHaveAttribute(
      "href",
      "/pharmacies/p1"
    )
    expect(screen.getByText("12 Galle Road")).toBeVisible()
    expect(screen.getByText("8am - 10pm")).toBeVisible()
    expect(screen.getByRole("link", { name: /Directions/ })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/directions?to=6.9,79.85"
    )
    expect(
      screen.queryByText("Bring your prescription when you collect")
    ).toBeNull()
  })

  it("says when the pharmacy has not listed its hours", async () => {
    current = {
      ...current,
      pharmacy: { ...current.pharmacy, openingHours: null },
    }
    await renderDetail()
    expect(screen.getByText("Hours not listed")).toBeVisible()
  })

  it("hides the actions once the hold has run out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      current = { ...current, expiresAt: localIso(60_000) }
      signIn("PHARMACY_OWNER")
      await renderDetail()
      expect(
        screen.getByRole("button", { name: "Cancel reservation" })
      ).toBeVisible()
      expect(
        screen.getByRole("button", { name: "Mark as collected" })
      ).toBeVisible()
      await act(() => vi.advanceTimersByTimeAsync(61_000))
      expect(screen.getByText("The hold has ended")).toBeVisible()
      expect(
        screen.queryByRole("button", { name: "Cancel reservation" })
      ).toBeNull()
      expect(
        screen.queryByRole("button", { name: "Mark as collected" })
      ).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it("reminds the customer to bring a prescription", async () => {
    current = { ...current, requiresPrescription: true }
    await renderDetail()
    expect(
      screen.getByText("Bring your prescription when you collect")
    ).toBeVisible()
  })

  it("lets the customer cancel with a reason", async () => {
    await renderDetail()
    expect(
      screen.queryByRole("button", { name: "Mark as collected" })
    ).toBeNull()
    await userEvent.click(
      screen.getByRole("button", { name: "Cancel reservation" })
    )
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.type(
      within(dialog).getByLabelText("Reason (optional)"),
      "Bought elsewhere"
    )
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel reservation" })
    )
    await waitFor(() =>
      expect(api.callsTo("/reservations/r1/cancel")[0]).toMatchObject({
        method: "patch",
        data: { reason: "Bought elsewhere" },
      })
    )
    expect(await screen.findByText("Cancelled")).toBeVisible()
    expect(screen.getByText(/Bought elsewhere/)).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Cancel reservation" })
    ).toBeNull()
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull()
  })

  it("shows a failed cancel translated", async () => {
    api.restore()
    api = mockApi({
      "/reservations/r1": () => current,
      "/reservations/r1/cancel": () => fail(409, "RESERVATION_STATE"),
    })
    await renderDetail()
    await userEvent.click(
      screen.getByRole("button", { name: "Cancel reservation" })
    )
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel reservation" })
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This reservation cannot be changed in its current state."
      )
    )
  })

  it("lets the pharmacy owner mark it as collected", async () => {
    signIn("PHARMACY_OWNER")
    await renderDetail()
    expect(screen.getByText("Nimal")).toBeVisible()
    await userEvent.click(
      screen.getByRole("button", { name: "Mark as collected" })
    )
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Mark as collected" })
    )
    expect(await screen.findByText("Collected")).toBeVisible()
    expect(api.callsTo("/reservations/r1/complete")).toHaveLength(1)
  })

  it("shows not found for a reservation that is not yours", async () => {
    api.restore()
    api = mockApi({ "/reservations/r1": () => fail(404, "NOT_FOUND") })
    renderRoutes(
      [
        { path: "/reservations/$id", component: ReservationDetailPage },
        { path: "/reservations" },
      ],
      "/reservations/r1"
    )
    expect(await screen.findByText("Reservation not found")).toBeVisible()
  })

  it("links the customer back to their reservations", async () => {
    await renderDetail()
    expect(
      screen.getByRole("link", { name: "Back to reservations" })
    ).toHaveAttribute("href", "/reservations")
  })

  it("links the pharmacy owner back to the pharmacy's reservations", async () => {
    signIn("PHARMACY_OWNER")
    await renderDetail()
    expect(
      screen.getByRole("link", { name: "Back to reservations" })
    ).toHaveAttribute("href", "/pharmacy/reservations")
  })
})
