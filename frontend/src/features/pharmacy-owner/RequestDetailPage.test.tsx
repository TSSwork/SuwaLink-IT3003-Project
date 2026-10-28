import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  InventoryItem,
  PrescriptionReply,
  PrescriptionRequest,
} from "@/api/types"
import type { Call } from "@/test/mockApi"
import { useMyReplies, usePharmacyRequests } from "@/api/pharmacyOwner"
import { RequestDetailPage } from "@/features/pharmacy-owner/RequestDetailPage"
import { useSessionStore } from "@/stores/sessionStore"
import {
  inventoryItem,
  pharmacyProfile,
  prescriptionReply,
  prescriptionRequest,
} from "@/test/fixtures"
import { fail, mockApi, raw } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>
let request: PrescriptionRequest
let replies: Array<PrescriptionReply>
let inventory: Array<InventoryItem>
let onSend: (call: Call) => unknown

const medicine = (brandName: string, strength: string) => ({
  ...inventoryItem().medicine,
  brandName,
  genericName: `${brandName} generic`,
  strength,
})

function handlers() {
  return {
    "/prescriptions/rx1": () => request,
    "/prescriptions/rx1/responses": (call: Call) =>
      call.method === "post" ? onSend(call) : replies,
    "/prescriptions/rx1/responses/mine": (call: Call) => onSend(call),
    "/inventory": () => inventory,
    "/pharmacies/me": () => pharmacyProfile(),
    "/images/img1/content": () =>
      raw(new Blob(["image"], { type: "image/webp" })),
    // Read by the overview and the requests list (the probe below).
    "/prescriptions": () => [request],
    "/prescriptions/responses/me": () => replies,
  }
}

/** Stands in for the overview and requests list, which must refresh after a reply. */
function OtherPharmacyViews() {
  usePharmacyRequests()
  useMyReplies()
  return null
}

async function renderDetail() {
  const view = renderRoutes(
    [
      {
        path: "/pharmacy/requests/$id",
        component: () => (
          <>
            <RequestDetailPage />
            <OtherPharmacyViews />
          </>
        ),
      },
      { path: "/pharmacy/requests" },
      { path: "/pharmacy/inventory" },
    ],
    "/pharmacy/requests/rx1"
  )
  await screen.findByRole("heading", { name: "Prescription request" })
  return view
}

const user = () => userEvent.setup()

async function builder() {
  return screen.findByRole("region", { name: /Your reply/ })
}

async function pick(name: RegExp) {
  const region = await builder()
  await user().click(within(region).getByRole("option", { name }))
}

function line(name: string) {
  return within(
    screen.getByRole("list", { name: "Items in your reply" })
  ).getByRole("listitem", { name })
}

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
  request = prescriptionRequest({ status: "PENDING" })
  replies = []
  inventory = [
    inventoryItem({
      id: "inv1",
      unitPrice: 12.5,
      stockQuantity: 40,
      medicine: medicine("Panadol", "500 mg"),
    }),
    inventoryItem({
      id: "inv2",
      unitPrice: 45,
      stockQuantity: 3,
      medicine: medicine("Amoxil", "250 mg"),
    }),
    inventoryItem({
      id: "inv3",
      available: false,
      medicine: medicine("Hiddenol", "10 mg"),
    }),
    inventoryItem({
      id: "inv4",
      stockQuantity: 0,
      medicine: medicine("Emptycillin", "20 mg"),
    }),
  ]
  onSend = (call) =>
    prescriptionReply({
      message: (call.data as { message: string }).message,
    })
  URL.createObjectURL = vi.fn(() => "blob:rx1")
  URL.revokeObjectURL = vi.fn()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  api = mockApi(handlers())
})
afterEach(() => api.restore())

describe("RequestDetailPage", { timeout: 15_000 }, () => {
  it("shows the private image fetched with the token, with zoom", async () => {
    await renderDetail()
    const image = await screen.findByRole("img", {
      name: "The patient's prescription",
    })
    expect(image).toHaveAttribute("src", "blob:rx1")
    expect(api.callsTo("/images/img1/content")[0].authorization).toBe(
      "Bearer t"
    )
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeVisible()
  })

  it("shows the patient's age, note and when the request closes", async () => {
    await renderDetail()
    expect(screen.getByText("34")).toBeVisible()
    expect(screen.getByText("Need the full course.")).toBeVisible()
    expect(screen.getByText("Open until")).toBeVisible()
  })

  it("offers only available, in-stock items", async () => {
    await renderDetail()
    const region = await builder()
    expect(
      within(region).getByRole("option", { name: /Panadol 500 mg/ })
    ).toBeVisible()
    expect(
      within(region).getByRole("option", { name: /Amoxil 250 mg/ })
    ).toBeVisible()
    expect(
      within(region).queryByRole("option", { name: /Hiddenol/ })
    ).toBeNull()
    expect(
      within(region).queryByRole("option", { name: /Emptycillin/ })
    ).toBeNull()
  })

  it("sends the picked items with their quantities and the message", async () => {
    const u = user()
    await renderDetail()
    await pick(/Panadol 500 mg/)
    await pick(/Amoxil 250 mg/)

    await u.click(
      within(line("Panadol 500 mg")).getByRole("button", {
        name: "Increase quantity",
      })
    )
    const amoxil = within(line("Amoxil 250 mg")).getByRole("spinbutton", {
      name: "Quantity",
    })
    await u.clear(amoxil)
    await u.type(amoxil, "3")
    await u.tab()

    // 2 × 12.50 + 3 × 45 = 160.
    expect(within(line("Panadol 500 mg")).getByText(/25\.00/)).toBeVisible()
    expect(within(line("Amoxil 250 mg")).getByText(/135\.00/)).toBeVisible()
    expect(
      within(await builder()).getByText(/160\.00/, { selector: "dd" })
    ).toBeVisible()

    const message = screen.getByRole("textbox", {
      name: "Message to the customer (optional)",
    })
    await u.type(message, "Ready at 5 pm.")
    expect(screen.getByText("14 of 1000 characters")).toBeVisible()

    const before = {
      list: api.callsTo("/prescriptions").length,
      mine: api.callsTo("/prescriptions/responses/me").length,
    }
    await u.click(screen.getByRole("button", { name: "Send reply" }))

    await waitFor(() =>
      expect(
        api
          .callsTo("/prescriptions/rx1/responses")
          .find((call) => call.method === "post")?.data
      ).toEqual({
        message: "Ready at 5 pm.",
        items: [
          { inventoryItemId: "inv1", quantity: 2 },
          { inventoryItemId: "inv2", quantity: 3 },
        ],
      })
    )
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Reply sent")
    )
    // The requests list and the overview counts are refreshed.
    await waitFor(() => {
      expect(api.callsTo("/prescriptions").length).toBeGreaterThan(before.list)
      expect(api.callsTo("/prescriptions/responses/me").length).toBeGreaterThan(
        before.mine
      )
    })
  })

  it("caps the quantity at the stock and says so", async () => {
    const u = user()
    await renderDetail()
    await pick(/Amoxil 250 mg/)
    const quantity = within(line("Amoxil 250 mg")).getByRole("spinbutton", {
      name: "Quantity",
    })
    await u.clear(quantity)
    await u.type(quantity, "9")
    await u.tab()
    expect(quantity).toHaveValue(3)
    expect(
      within(line("Amoxil 250 mg")).getByText("All 3 you have in stock")
    ).toBeVisible()
    expect(
      within(line("Amoxil 250 mg")).getByRole("button", {
        name: "Increase quantity",
      })
    ).toBeDisabled()
  })

  it("removes a picked item and offers it again", async () => {
    const u = user()
    await renderDetail()
    await pick(/Panadol 500 mg/)
    const region = await builder()
    expect(within(region).queryByRole("option", { name: /Panadol/ })).toBeNull()
    await u.click(
      within(line("Panadol 500 mg")).getByRole("button", {
        name: "Remove Panadol 500 mg",
      })
    )
    expect(
      within(region).getByRole("option", { name: /Panadol 500 mg/ })
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled()
  })

  it("prefills an existing reply and sends changes with PUT", async () => {
    const u = user()
    replies = [
      prescriptionReply({
        message: "Ready in 15 minutes.",
        items: [
          {
            id: "ri1",
            inventoryItemId: "inv1",
            medicineBrandName: "Panadol 500 mg",
            quantity: 5,
            unitPrice: 12.5,
          },
        ],
      }),
    ]
    await renderDetail()
    const quantity = await waitFor(() =>
      within(line("Panadol 500 mg")).getByRole("spinbutton", {
        name: "Quantity",
      })
    )
    expect(quantity).toHaveValue(5)
    expect(
      screen.getByRole("textbox", {
        name: "Message to the customer (optional)",
      })
    ).toHaveValue("Ready in 15 minutes.")
    expect(screen.queryByRole("button", { name: "Send reply" })).toBeNull()

    await pick(/Amoxil 250 mg/)
    await u.click(screen.getByRole("button", { name: "Update reply" }))

    await waitFor(() =>
      expect(api.callsTo("/prescriptions/rx1/responses/mine")[0]).toMatchObject(
        {
          method: "put",
          data: {
            message: "Ready in 15 minutes.",
            items: [
              { inventoryItemId: "inv1", quantity: 5 },
              { inventoryItemId: "inv2", quantity: 1 },
            ],
          },
        }
      )
    )
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Reply updated")
    )
  })

  it("keeps the draft and explains when the request closed meanwhile", async () => {
    const u = user()
    onSend = () => {
      request = { ...request, status: "CLOSED" }
      fail(400, "REQUEST_CLOSED")
    }
    await renderDetail()
    await pick(/Panadol 500 mg/)
    const message = screen.getByRole("textbox", {
      name: "Message to the customer (optional)",
    })
    await u.type(message, "Ready at 5 pm.")
    await u.click(screen.getByRole("button", { name: "Send reply" }))

    expect(
      await screen.findByText("This prescription request is closed.")
    ).toBeVisible()
    // The typed reply stays on screen ...
    expect(message).toHaveValue("Ready at 5 pm.")
    expect(line("Panadol 500 mg")).toBeVisible()
    // ... and once the refetch reports it closed, it can no longer be sent.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled()
    )
    expect(
      screen.getByText("This request is closed. It can no longer be answered.")
    ).toBeVisible()
  })

  it("is read-only once the request is closed", async () => {
    request = prescriptionRequest({ status: "CLOSED" })
    replies = [prescriptionReply()]
    await renderDetail()
    expect(
      await screen.findByText(
        "This request is closed. It can no longer be answered."
      )
    ).toBeVisible()
    expect(
      screen.getByRole("textbox", {
        name: "Message to the customer (optional)",
      })
    ).toBeDisabled()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByRole("spinbutton")).toBeNull()
    // The prices the customer was quoted (45), not today's inventory price (12.50).
    expect(within(line("Panadol 500 mg")).getByText(/945\.00/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Update reply" })).toBeDisabled()
  })

  it("is read-only once the request expired", async () => {
    request = prescriptionRequest({ status: "EXPIRED" })
    await renderDetail()
    expect(
      await screen.findByText(
        "This request expired. It can no longer be answered."
      )
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled()
  })

  it("starts a fresh draft when moving to another request (B prefilled from its own reply)", async () => {
    const u = user()
    const other = prescriptionRequest({ id: "rx2", note: "Second request." })
    api.restore()
    api = mockApi({
      ...handlers(),
      "/prescriptions/rx2": () => other,
      "/prescriptions/rx2/responses": () => [
        prescriptionReply({
          id: "resp2",
          prescriptionRequestId: "rx2",
          message: "B's reply.",
          items: [
            {
              id: "ri2",
              inventoryItemId: "inv2",
              medicineBrandName: "Amoxil 250 mg",
              quantity: 2,
              unitPrice: 45,
            },
          ],
        }),
      ],
      "/prescriptions/rx2/responses/mine": (call: Call) =>
        prescriptionReply({
          prescriptionRequestId: "rx2",
          message: (call.data as { message: string }).message,
        }),
    })
    // Visit B first so it is cached when the owner comes back to it.
    const { router } = renderRoutes(
      [
        { path: "/pharmacy/requests/$id", component: RequestDetailPage },
        { path: "/pharmacy/requests" },
        { path: "/pharmacy/inventory" },
      ],
      "/pharmacy/requests/rx2"
    )
    await screen.findByText("Second request.")
    await waitFor(() => line("Amoxil 250 mg"))

    await router.navigate({
      to: "/pharmacy/requests/$id",
      params: { id: "rx1" },
    })
    await screen.findByText("Need the full course.")
    await pick(/Panadol 500 mg/)
    await u.type(
      screen.getByRole("textbox", {
        name: "Message to the customer (optional)",
      }),
      "Draft for A."
    )

    await router.navigate({
      to: "/pharmacy/requests/$id",
      params: { id: "rx2" },
    })
    await screen.findByText("Second request.")
    expect(
      screen.getByRole("textbox", {
        name: "Message to the customer (optional)",
      })
    ).toHaveValue("B's reply.")
    expect(line("Amoxil 250 mg")).toBeVisible()
    expect(
      within(
        screen.getByRole("list", { name: "Items in your reply" })
      ).queryByRole("listitem", { name: "Panadol 500 mg" })
    ).toBeNull()

    await u.click(screen.getByRole("button", { name: "Update reply" }))
    await waitFor(() =>
      expect(api.callsTo("/prescriptions/rx2/responses/mine")[0]).toMatchObject(
        {
          method: "put",
          data: {
            message: "B's reply.",
            items: [{ inventoryItemId: "inv2", quantity: 2 }],
          },
        }
      )
    )
    expect(api.callsTo("/prescriptions/rx1/responses/mine")).toHaveLength(0)
    expect(
      api
        .callsTo("/prescriptions/rx1/responses")
        .filter((call) => call.method === "post")
    ).toHaveLength(0)
  })

  it("keeps the draft on screen when a background refresh fails", async () => {
    const u = user()
    let refreshFails = false
    const failing =
      <T,>(answer: () => T) =>
      () =>
        refreshFails ? fail(500, "INTERNAL_ERROR") : answer()
    api.restore()
    api = mockApi({
      ...handlers(),
      "/prescriptions/rx1": failing(() => request),
      "/inventory": failing(() => inventory),
      "/prescriptions/rx1/responses": failing(() => replies),
    })
    const { queryClient } = await renderDetail()
    await pick(/Panadol 500 mg/)
    const message = screen.getByRole("textbox", {
      name: "Message to the customer (optional)",
    })
    await u.type(message, "Ready at 5 pm.")

    refreshFails = true
    await queryClient.invalidateQueries()

    const notices = await screen.findAllByText(
      "Couldn't refresh — showing the last loaded version."
    )
    // One for the request, one for the stock and reply under it.
    expect(notices).toHaveLength(2)
    expect(message).toHaveValue("Ready at 5 pm.")
    expect(line("Panadol 500 mg")).toBeVisible()
    expect(screen.queryByText("This request could not be loaded")).toBeNull()

    refreshFails = false
    for (const retry of screen.getAllByRole("button", { name: "Try again" })) {
      await u.click(retry)
    }
    await waitFor(() =>
      expect(
        screen.queryByText(
          "Couldn't refresh — showing the last loaded version."
        )
      ).toBeNull()
    )
    expect(message).toHaveValue("Ready at 5 pm.")
  })

  it("offers a retry when the pharmacy profile cannot be loaded", async () => {
    const u = user()
    let profileFails = true
    api.restore()
    api = mockApi({
      ...handlers(),
      "/pharmacies/me": () =>
        profileFails ? fail(500, "INTERNAL_ERROR") : pharmacyProfile(),
    })
    await renderDetail()
    expect(
      await screen.findByText("Your reply could not be loaded")
    ).toBeVisible()
    profileFails = false
    await u.click(screen.getByRole("button", { name: "Try again" }))
    expect(await builder()).toBeVisible()
  })

  it("says so when the request is not for this pharmacy", async () => {
    api.restore()
    api = mockApi({
      ...handlers(),
      "/prescriptions/rx1": () => fail(403, "ACCESS_DENIED"),
    })
    renderRoutes(
      [
        { path: "/pharmacy/requests/$id", component: RequestDetailPage },
        { path: "/pharmacy/requests" },
      ],
      "/pharmacy/requests/rx1"
    )
    expect(await screen.findByText("Request not found")).toBeVisible()
    expect(screen.getByRole("link", { name: "Back to requests" })).toBeVisible()
  })
})
