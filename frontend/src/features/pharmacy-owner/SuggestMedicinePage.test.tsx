import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CatalogMedicine } from "@/api/types"
import { SuggestMedicinePage } from "@/features/pharmacy-owner/SuggestMedicinePage"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { catalogMedicine } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

// No delay between keystrokes keeps these long forms fast in the full suite.
let user: ReturnType<typeof userEvent.setup>
let api: ReturnType<typeof mockApi>
let mine: Array<CatalogMedicine>

function handlers(
  over: Record<string, Parameters<typeof mockApi>[0][string]> = {}
) {
  return {
    "/categories": () => [
      { id: "c1", name: "Pain relief" },
      { id: "c2", name: "Antibiotics" },
    ],
    "/manufacturers": () => [
      { id: "mf1", name: "GSK" },
      { id: "mf2", name: "State Pharmaceuticals" },
    ],
    "/medicines/suggestions/mine": () => mine,
    "/medicines/suggestions": ({ data }: { data: unknown }) => {
      const created = catalogMedicine({
        id: "s-new",
        ...(data as object),
        status: "PENDING",
      })
      mine = [created, ...mine]
      return created
    },
    ...over,
  }
}

function renderSuggest() {
  return renderRoutes(
    [
      { path: "/pharmacy/suggest-medicine", component: SuggestMedicinePage },
      { path: "/pharmacy/inventory" },
    ],
    "/pharmacy/suggest-medicine"
  )
}

async function choose(label: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: label }))
  await user.click(await screen.findByRole("option", { name: option }))
}

async function fillRequired() {
  await user.type(screen.getByLabelText("Brand name"), " Losec ")
  await user.type(screen.getByLabelText("Generic name"), "Omeprazole")
  await user.type(screen.getByLabelText("Dosage form"), "Capsule")
  await user.type(screen.getByLabelText("Strength"), "20 mg")
  await choose("Unit", "Capsule")
  await choose("Category", "Antibiotics")
  await choose("Manufacturer", "State Pharmaceuticals")
  await choose("Legal category", "Prescription only")
}

function send() {
  return user.click(screen.getByRole("button", { name: "Send suggestion" }))
}

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
  vi.mocked(toast.success).mockClear()
  mine = [
    catalogMedicine({
      id: "s1",
      brandName: "Brufen",
      strength: "400 mg",
      status: "REJECTED",
      rejectionReason: "Already in the catalogue as Ibuprofen 400 mg",
    }),
    catalogMedicine({
      id: "s2",
      brandName: "Zinnat",
      strength: "250 mg",
      status: "APPROVED",
    }),
    catalogMedicine({
      id: "s3",
      brandName: "Flagyl",
      strength: "400 mg",
      status: "PENDING",
    }),
  ]
  api = mockApi(handlers())
})
afterEach(() => api.restore())

// Long typed forms and Radix selects; give them room when the whole suite runs in parallel.
describe("SuggestMedicinePage", { timeout: 15_000 }, () => {
  it("requires every DTO-required field before sending", async () => {
    renderSuggest()
    await screen.findByRole("combobox", { name: "Manufacturer" })
    await send()
    for (const label of [
      "Brand name",
      "Generic name",
      "Dosage form",
      "Strength",
    ]) {
      await waitFor(() =>
        expect(screen.getByLabelText(label)).toHaveAccessibleDescription(
          "This field is required."
        )
      )
    }
    for (const label of [
      "Unit",
      "Category",
      "Manufacturer",
      "Legal category",
    ]) {
      expect(
        screen.getByRole("combobox", { name: label })
      ).toHaveAccessibleDescription("This field is required.")
    }
    expect(screen.getByLabelText("Description (optional)")).toHaveAttribute(
      "aria-invalid",
      "false"
    )
    expect(api.callsTo("/medicines/suggestions")).toHaveLength(0)
  })

  it("sends a body that matches MedicineMasterRequest and lists it", async () => {
    renderSuggest()
    await screen.findByRole("combobox", { name: "Manufacturer" })
    await fillRequired()
    await send()
    await waitFor(() =>
      expect(api.callsTo("/medicines/suggestions")).toEqual([
        expect.objectContaining({
          method: "post",
          data: {
            brandName: "Losec",
            genericName: "Omeprazole",
            dosageForm: "Capsule",
            strength: "20 mg",
            unitOfMeasure: "CAPSULE",
            description: null,
            therapeuticCategoryId: "c2",
            manufacturerId: "mf2",
            legalCategory: "PRESCRIPTION",
          },
        }),
      ])
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    // The form starts over and the new suggestion is listed as pending.
    expect(screen.getByLabelText("Brand name")).toHaveValue("")
    const list = screen.getByRole("list", { name: "My suggestions" })
    expect(await within(list).findByText(/Losec/)).toBeVisible()
  })

  it("sends the description when one is given", async () => {
    renderSuggest()
    await screen.findByRole("combobox", { name: "Manufacturer" })
    await fillRequired()
    await user.type(
      screen.getByLabelText("Description (optional)"),
      "For acid reflux"
    )
    await send()
    await waitFor(() =>
      expect(api.callsTo("/medicines/suggestions")[0]?.data).toMatchObject({
        description: "For acid reflux",
      })
    )
  })

  it("offers every backend legal category, including Schedule III", async () => {
    renderSuggest()
    await screen.findByRole("combobox", { name: "Manufacturer" })
    await user.click(screen.getByRole("combobox", { name: "Legal category" }))
    expect(
      (await screen.findAllByRole("option")).map((option) => option.textContent)
    ).toEqual([
      "Over the counter",
      "Prescription only",
      "Controlled",
      "Schedule III",
    ])
    await user.click(screen.getByRole("option", { name: "Schedule III" }))
    await user.type(screen.getByLabelText("Brand name"), "Valium")
    await user.type(screen.getByLabelText("Generic name"), "Diazepam")
    await user.type(screen.getByLabelText("Dosage form"), "Tablet")
    await user.type(screen.getByLabelText("Strength"), "5 mg")
    await choose("Unit", "Tablet")
    await choose("Category", "Pain relief")
    await choose("Manufacturer", "GSK")
    await send()
    await waitFor(() =>
      expect(api.callsTo("/medicines/suggestions")[0]?.data).toMatchObject({
        legalCategory: "SCHEDULE_III",
      })
    )
  })

  it("lists my suggestions with their status and the rejection reason", async () => {
    renderSuggest()
    const list = await screen.findByRole("list", { name: "My suggestions" })
    const rows = within(list).getAllByRole("listitem")
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("Brufen 400 mg")
    expect(within(rows[0]).getByText("Rejected")).toBeVisible()
    expect(
      within(rows[0]).getByText("Already in the catalogue as Ibuprofen 400 mg")
    ).toBeVisible()
    expect(within(rows[1]).getByText("Approved")).toBeVisible()
    expect(within(rows[2]).getByText("Waiting for review")).toBeVisible()
  })

  it("shows a translated server error and keeps the form", async () => {
    api.restore()
    api = mockApi(
      handlers({
        "/medicines/suggestions": () => fail(409, "DUPLICATE"),
      })
    )
    renderSuggest()
    await screen.findByRole("combobox", { name: "Manufacturer" })
    await fillRequired()
    await send()
    expect(await screen.findByText("This already exists.")).toBeVisible()
    expect(screen.getByLabelText("Brand name")).toHaveValue(" Losec ")
  })

  it("shows an empty list and a retry when suggestions fail", async () => {
    let failing = true
    mine = []
    api.restore()
    api = mockApi(
      handlers({
        "/medicines/suggestions/mine": () =>
          failing ? fail(500, "INTERNAL_ERROR") : mine,
      })
    )
    renderSuggest()
    expect(
      await screen.findByText("Your suggestions could not be loaded")
    ).toBeVisible()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("No suggestions yet")).toBeVisible()
  })
})
