import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CatalogMedicine, MedicineStatus } from "@/api/types"
import type { Call } from "@/test/mockApi"
import { SuggestionsPage } from "@/features/admin/SuggestionsPage"
import { validateSuggestionsSearch } from "@/features/admin/suggestionsSearch"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { catalogMedicine } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let user: ReturnType<typeof userEvent.setup>
let api: ReturnType<typeof mockApi>
let suggestions: Array<CatalogMedicine>

function renderAt(path = "/admin/suggestions") {
  return renderRoutes(
    [
      {
        path: "/admin/suggestions",
        component: SuggestionsPage,
        validateSearch: validateSuggestionsSearch,
      },
    ],
    path
  )
}

function list() {
  return screen.findByRole("list", { name: "Suggestions" })
}

function names(ul: HTMLElement) {
  return within(ul)
    .getAllByRole("listitem")
    .map((li) => li.querySelector("h3")?.textContent)
}

async function card(name: string) {
  const item = within(await list())
    .getAllByRole("listitem")
    .find((li) => li.querySelector("h3")?.textContent === name)
  if (!item) throw new Error(`no card for ${name}`)
  return item
}

function review(id: string, status: MedicineStatus, reason: string | null) {
  suggestions = suggestions.map((s) =>
    s.id === id ? { ...s, status, rejectionReason: reason } : s
  )
}

/** What the backend's list does with `status`. */
function byStatus({ params }: Call) {
  return suggestions.filter((s) => !params.status || s.status === params.status)
}

const REASON = "Already in the catalogue as Losec 20 mg"

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  suggestions = [
    catalogMedicine({
      id: "s1",
      brandName: "Omez",
      genericName: "Omeprazole",
      dosageForm: "Capsule",
      strength: "20 mg",
      unitOfMeasure: "CAPSULE",
      legalCategory: "PRESCRIPTION",
      description: "Gastro-resistant capsules",
      therapeuticCategoryName: "Gastro",
      manufacturerName: "Dr. Reddy's",
      status: "PENDING",
      suggestedByPharmacyName: "City Pharmacy",
    }),
    catalogMedicine({
      id: "s2",
      brandName: "Brufen",
      strength: "400 mg",
      status: "PENDING",
      suggestedByPharmacyName: "Lanka Pharmacy",
    }),
    catalogMedicine({
      id: "s3",
      brandName: "Zinnat",
      strength: "250 mg",
      status: "REJECTED",
      rejectionReason: "Duplicate of Zinnat 250 mg tablets",
      suggestedByPharmacyName: "City Pharmacy",
    }),
  ]
  api = mockApi({
    "/admin/medicines/suggestions": byStatus,
    "/admin/medicines/suggestions/s1/approve": () =>
      review("s1", "APPROVED", null),
    "/admin/medicines/suggestions/s1/reject": ({ data }) =>
      review("s1", "REJECTED", (data as { reason: string }).reason),
    "/admin/medicines/suggestions/s2/approve": () => {
      // Another admin rejected it a moment ago.
      review("s2", "REJECTED", "Not sold in Sri Lanka")
      fail(409, "ALREADY_REVIEWED")
    },
  })
})
afterEach(() => api.restore())

describe("admin SuggestionsPage", { timeout: 15_000 }, () => {
  it("lists pending suggestions with their full details", async () => {
    renderAt()
    expect(names(await list())).toEqual(["Omez 20 mg", "Brufen 400 mg"])
    expect(api.callsTo("/admin/medicines/suggestions")[0].params).toEqual({
      status: "PENDING",
    })
    expect(
      screen.getByRole("button", { name: "Pending", pressed: true })
    ).toBeVisible()
    const omez = await card("Omez 20 mg")
    for (const text of [
      "Suggested by City Pharmacy",
      "Omeprazole",
      "Capsule",
      "Prescription only",
      "Gastro",
      "Dr. Reddy's",
      "Gastro-resistant capsules",
    ]) {
      expect(omez).toHaveTextContent(text)
    }
  })

  it("approves a suggestion", async () => {
    renderAt()
    await user.click(
      within(await card("Omez 20 mg")).getByRole("button", { name: "Approve" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/medicines/suggestions/s1/approve")).toEqual([
        expect.objectContaining({ method: "put" }),
      ])
    )
    await waitFor(async () =>
      expect(names(await list())).toEqual(["Brufen 400 mg"])
    )
    expect(toast.success).toHaveBeenCalledWith(
      "Omez 20 mg approved. City Pharmacy can stock it now."
    )
  })

  it("needs a reason to reject and sends it", async () => {
    renderAt()
    await user.click(
      within(await card("Omez 20 mg")).getByRole("button", { name: "Reject" })
    )
    const dialog = await screen.findByRole("alertdialog", {
      name: "Reject Omez 20 mg?",
    })
    const confirm = within(dialog).getByRole("button", {
      name: "Reject suggestion",
    })
    await user.click(confirm)
    expect(
      await within(dialog).findByText("Tell the pharmacy why.")
    ).toBeVisible()
    const reason = within(dialog).getByLabelText("Reason")
    await user.type(reason, "   ")
    await user.click(confirm)
    expect(within(dialog).getByText("Tell the pharmacy why.")).toBeVisible()
    await user.clear(reason)
    await user.click(reason)
    await user.paste("x".repeat(501))
    await user.click(confirm)
    expect(
      await within(dialog).findByText("Use at most 500 characters.")
    ).toBeVisible()
    expect(api.callsTo("/admin/medicines/suggestions/s1/reject")).toHaveLength(
      0
    )
    await user.clear(reason)
    await user.type(reason, ` ${REASON} `)
    await user.click(confirm)
    await waitFor(() =>
      expect(api.callsTo("/admin/medicines/suggestions/s1/reject")).toEqual([
        expect.objectContaining({ method: "put", data: { reason: REASON } }),
      ])
    )
    await waitFor(async () =>
      expect(names(await list())).toEqual(["Brufen 400 mg"])
    )
    expect(toast.success).toHaveBeenCalledWith(
      "Omez 20 mg rejected. City Pharmacy has been told why."
    )
  })

  it("explains ALREADY_REVIEWED and refetches the list", async () => {
    renderAt()
    await user.click(
      within(await card("Brufen 400 mg")).getByRole("button", {
        name: "Approve",
      })
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This suggestion has already been reviewed."
      )
    )
    await waitFor(async () =>
      expect(names(await list())).toEqual(["Omez 20 mg"])
    )
  })

  it("filters by status and keeps the filter in the URL", async () => {
    const { router } = renderAt()
    await list()
    await user.click(screen.getByRole("button", { name: "Rejected" }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ status: "REJECTED" })
    )
    expect(api.callsTo("/admin/medicines/suggestions").at(-1)?.params).toEqual({
      status: "REJECTED",
    })
    const zinnat = await card("Zinnat 250 mg")
    expect(zinnat).toHaveTextContent("Duplicate of Zinnat 250 mg tablets")
    expect(within(zinnat).queryByRole("button")).toBeNull()
    await user.click(screen.getByRole("button", { name: "All" }))
    await waitFor(() =>
      expect(
        names(screen.getByRole("list", { name: "Suggestions" }))
      ).toHaveLength(3)
    )
    expect(api.callsTo("/admin/medicines/suggestions").at(-1)?.params).toEqual(
      {}
    )
  })

  it("falls back to pending for an unknown status", async () => {
    renderAt("/admin/suggestions?status=bogus")
    expect(names(await list())).toHaveLength(2)
    expect(api.callsTo("/admin/medicines/suggestions")[0].params).toEqual({
      status: "PENDING",
    })
  })

  it("shows an empty state with what to do next", async () => {
    suggestions = suggestions.filter((s) => s.status !== "PENDING")
    renderAt()
    expect(await screen.findByText("No suggestions waiting")).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Show all suggestions" })
    )
    expect(names(await list())).toEqual(["Zinnat 250 mg"])
  })

  it("shows a failed load with a retry", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/admin/medicines/suggestions": (call) =>
        failing ? fail(500, "INTERNAL_ERROR") : byStatus(call),
    })
    renderAt()
    expect(
      await screen.findByText("The suggestions could not be loaded")
    ).toBeVisible()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(names(await list())).toHaveLength(2)
  })
})
