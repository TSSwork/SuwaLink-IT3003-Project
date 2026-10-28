import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  AdminCategory,
  AdminManufacturer,
  CatalogMedicine,
} from "@/api/types"
import type { Call } from "@/test/mockApi"
import { CatalogPage } from "@/features/admin/CatalogPage"
import { validateCatalogSearch } from "@/features/admin/catalogSearch"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import {
  adminCategory,
  adminManufacturer,
  catalogMedicine,
} from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

// No delay between keystrokes keeps these long forms fast in the full suite.
let user: ReturnType<typeof userEvent.setup>
let api: ReturnType<typeof mockApi>
let medicines: Array<CatalogMedicine>
let categories: Array<AdminCategory>
let manufacturers: Array<AdminManufacturer>

function renderAt(path = "/admin/catalog") {
  return renderRoutes(
    [
      {
        path: "/admin/catalog",
        component: CatalogPage,
        validateSearch: validateCatalogSearch,
      },
    ],
    path
  )
}

function list(name: string) {
  return screen.findByRole("list", { name })
}

function names(ul: HTMLElement) {
  return within(ul)
    .getAllByRole("listitem")
    .map((li) => li.querySelector("h3")?.textContent)
}

async function row(listName: string, name: string) {
  const item = within(await list(listName))
    .getAllByRole("listitem")
    .find((li) => li.querySelector("h3")?.textContent === name)
  if (!item) throw new Error(`no row for ${name}`)
  return item
}

async function choose(label: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: label }))
  await user.click(await screen.findByRole("option", { name: option }))
}

/** GET lists the entries; POST adds one; like the backend. */
function collection<T extends { id: string }>(
  get: () => Array<T>,
  set: (entries: Array<T>) => void,
  make: (body: object) => T
) {
  return ({ method, data }: Call) => {
    if (method === "get") return get()
    const created = make(data as object)
    set([...get(), created])
    return created
  }
}

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  medicines = [
    catalogMedicine({ imageUrl: "/api/images/public/panadol.png" }),
    catalogMedicine({
      id: "m2",
      brandName: "Augmentin",
      genericName: "Amoxicillin + clavulanate",
      strength: "625 mg",
      legalCategory: "PRESCRIPTION",
      therapeuticCategoryId: "c2",
      therapeuticCategoryName: "Antibiotics",
      status: "PENDING",
      suggestedByPharmacyName: "City Pharmacy",
    }),
  ]
  categories = [
    adminCategory(),
    adminCategory({ id: "c2", name: "Antibiotics" }),
    adminCategory({
      id: "c3",
      name: "Old remedies",
      parentCategoryId: "c1",
      parentCategoryName: "Pain relief",
      active: false,
    }),
  ]
  manufacturers = [
    adminManufacturer(),
    adminManufacturer({
      id: "mf2",
      name: "State Pharmaceuticals",
      country: "Sri Lanka",
      licenseNumber: "NMRA-001",
    }),
  ]
  api = mockApi({
    "/admin/medicines": collection(
      () => medicines,
      (next) => (medicines = next),
      (body) => catalogMedicine({ id: "m-new", ...body })
    ),
    "/admin/medicines/m1": ({ method, data }) => {
      if (method === "delete") {
        medicines = medicines.filter((m) => m.id !== "m1")
        return undefined
      }
      medicines = medicines.map((m) =>
        m.id === "m1" ? { ...m, ...(data as object) } : m
      )
      return medicines[0]
    },
    "/admin/categories": collection(
      () => categories,
      (next) => (categories = next),
      (body) => adminCategory({ id: "c-new", ...body })
    ),
    "/admin/categories/c2": () => {
      categories = categories.filter((c) => c.id !== "c2")
    },
    "/admin/manufacturers": collection(
      () => manufacturers,
      (next) => (manufacturers = next),
      (body) => adminManufacturer({ id: "mf-new", ...body })
    ),
    "/admin/manufacturers/mf1": () => fail(409, "DATA_CONFLICT"),
    "/admin/manufacturers/mf2": ({ method }) => {
      if (method === "put") fail(409, "DUPLICATE")
    },
  })
})
afterEach(() => api.restore())

// Long typed forms and Radix selects; give them room when the whole suite runs in parallel.
describe("admin CatalogPage", { timeout: 15_000 }, () => {
  it("opens on medicines with their status and legal category", async () => {
    renderAt()
    expect(
      await screen.findByRole("tab", { name: "Medicines", selected: true })
    ).toBeVisible()
    expect(names(await list("Medicines"))).toEqual([
      "Panadol 500 mg",
      "Augmentin 625 mg",
    ])
    const augmentin = await row("Medicines", "Augmentin 625 mg")
    expect(augmentin).toHaveTextContent("Waiting for review")
    expect(augmentin).toHaveTextContent("Prescription only")
    expect(augmentin).toHaveTextContent("Antibiotics")
    const panadol = await row("Medicines", "Panadol 500 mg")
    expect(panadol).toHaveTextContent("Approved")
    expect(panadol).toHaveTextContent("Over the counter")
  })

  it("keeps the tab in the URL", async () => {
    const { router } = renderAt()
    await list("Medicines")
    await user.click(screen.getByRole("tab", { name: "Categories" }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ tab: "categories" })
    )
    expect(names(await list("Categories"))).toEqual([
      "Pain relief",
      "Antibiotics",
      "Old remedies",
    ])
    const old = await row("Categories", "Old remedies")
    expect(old).toHaveTextContent("Inactive")
    expect(old).toHaveTextContent("Under Pain relief")
  })

  it("opens the tab named in the URL", async () => {
    renderAt("/admin/catalog?tab=manufacturers")
    expect(
      await screen.findByRole("tab", { name: "Manufacturers", selected: true })
    ).toBeVisible()
    expect(
      await row("Manufacturers", "State Pharmaceuticals")
    ).toHaveTextContent("NMRA-001")
  })

  it("falls back to medicines for an unknown tab", async () => {
    const { router } = renderAt("/admin/catalog?tab=bogus")
    expect(
      await screen.findByRole("tab", { name: "Medicines", selected: true })
    ).toBeVisible()
    expect(router.state.location.search).toEqual({})
    expect(names(await list("Medicines"))).toHaveLength(2)
  })

  it("searches the open list", async () => {
    renderAt()
    await list("Medicines")
    await user.type(
      screen.getByRole("searchbox", { name: "Search medicines" }),
      "amoxi"
    )
    expect(names(await list("Medicines"))).toEqual(["Augmentin 625 mg"])
    await user.clear(
      screen.getByRole("searchbox", { name: "Search medicines" })
    )
    await user.type(
      screen.getByRole("searchbox", { name: "Search medicines" }),
      "zzz"
    )
    expect(await screen.findByText("Nothing matches “zzz”")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Clear search" }))
    expect(names(await list("Medicines"))).toHaveLength(2)
  })

  it("adds a medicine with the MedicineMasterRequest body", async () => {
    renderAt()
    await list("Medicines")
    await user.click(screen.getByRole("button", { name: "Add medicine" }))
    const dialog = await screen.findByRole("dialog", { name: "Add a medicine" })
    // Every DTO-required field is checked before anything is sent.
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(
      await within(dialog).findAllByText("This field is required.")
    ).toHaveLength(8)
    await user.type(within(dialog).getByLabelText("Brand name"), " Losec ")
    await user.type(within(dialog).getByLabelText("Generic name"), "Omeprazole")
    await user.type(within(dialog).getByLabelText("Dosage form"), "Capsule")
    await user.type(within(dialog).getByLabelText("Strength"), "20 mg")
    await choose("Unit", "Capsule")
    await choose("Legal category", "Schedule III")
    await choose("Category", "Antibiotics")
    await choose("Manufacturer", "State Pharmaceuticals")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(
        api.callsTo("/admin/medicines").filter((c) => c.method === "post")
      ).toEqual([
        expect.objectContaining({
          data: {
            brandName: "Losec",
            genericName: "Omeprazole",
            dosageForm: "Capsule",
            strength: "20 mg",
            unitOfMeasure: "CAPSULE",
            description: null,
            therapeuticCategoryId: "c2",
            manufacturerId: "mf2",
            legalCategory: "SCHEDULE_III",
          },
        }),
      ])
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(toast.success).toHaveBeenCalledWith("Losec 20 mg added.")
    expect(names(await list("Medicines"))).toContain("Losec 20 mg")
  })

  it("marks inactive categories in the medicine form", async () => {
    renderAt()
    await list("Medicines")
    await user.click(screen.getByRole("button", { name: "Add medicine" }))
    await screen.findByRole("dialog", { name: "Add a medicine" })
    await user.click(screen.getByRole("combobox", { name: "Category" }))
    expect(
      await screen.findByRole("option", { name: "Old remedies (inactive)" })
    ).toBeVisible()
  })

  it("edits a medicine and keeps its image", async () => {
    renderAt()
    await user.click(
      within(await row("Medicines", "Panadol 500 mg")).getByRole("button", {
        name: "Edit",
      })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Edit Panadol 500 mg",
    })
    const strength = within(dialog).getByLabelText("Strength")
    expect(strength).toHaveValue("500 mg")
    await user.clear(strength)
    await user.type(strength, "650 mg")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(api.callsTo("/admin/medicines/m1")).toEqual([
        expect.objectContaining({
          method: "put",
          data: {
            brandName: "Panadol",
            genericName: "Paracetamol",
            dosageForm: "Tablet",
            strength: "650 mg",
            unitOfMeasure: "TABLET",
            description: null,
            therapeuticCategoryId: "c1",
            manufacturerId: "mf1",
            legalCategory: "OTC",
            imageUrl: "/api/images/public/panadol.png",
          },
        }),
      ])
    )
    expect(names(await list("Medicines"))).toContain("Panadol 650 mg")
    expect(toast.success).toHaveBeenCalledWith("Panadol 650 mg saved.")
  })

  it("adds a category under a parent", async () => {
    renderAt("/admin/catalog?tab=categories")
    await list("Categories")
    await user.click(screen.getByRole("button", { name: "Add category" }))
    const dialog = await screen.findByRole("dialog", { name: "Add a category" })
    await user.type(within(dialog).getByLabelText("Name"), "Children's pain")
    await choose("Parent category (optional)", "Pain relief")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(
        api.callsTo("/admin/categories").filter((c) => c.method === "post")
      ).toEqual([
        expect.objectContaining({
          data: {
            name: "Children's pain",
            description: null,
            parentCategoryId: "c1",
          },
        }),
      ])
    )
  })

  it("adds a manufacturer with only the required fields", async () => {
    renderAt("/admin/catalog?tab=manufacturers")
    await list("Manufacturers")
    await user.click(screen.getByRole("button", { name: "Add manufacturer" }))
    const dialog = await screen.findByRole("dialog", {
      name: "Add a manufacturer",
    })
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(
      await within(dialog).findAllByText("This field is required.")
    ).toHaveLength(2)
    await user.type(within(dialog).getByLabelText("Name"), "Hemas")
    await user.type(within(dialog).getByLabelText("Country"), "Sri Lanka")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(
        api.callsTo("/admin/manufacturers").filter((c) => c.method === "post")
      ).toEqual([
        expect.objectContaining({
          data: {
            name: "Hemas",
            country: "Sri Lanka",
            licenseNumber: null,
            contactEmail: null,
            phone: null,
          },
        }),
      ])
    )
  })

  it("shows a duplicate name in the form and keeps what was typed", async () => {
    renderAt("/admin/catalog?tab=manufacturers")
    await user.click(
      within(await row("Manufacturers", "State Pharmaceuticals")).getByRole(
        "button",
        { name: "Edit" }
      )
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Edit State Pharmaceuticals",
    })
    const name = within(dialog).getByLabelText("Name")
    await user.clear(name)
    await user.type(name, "GSK")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(
      await within(dialog).findByText("This already exists.")
    ).toBeVisible()
    expect(name).toHaveValue("GSK")
  })

  it("asks before deleting, then removes the entry", async () => {
    renderAt("/admin/catalog?tab=categories")
    await user.click(
      within(await row("Categories", "Antibiotics")).getByRole("button", {
        name: "Delete",
      })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: "Delete Antibiotics?",
    })
    expect(api.callsTo("/admin/categories/c2")).toHaveLength(0)
    await user.click(within(confirm).getByRole("button", { name: "Delete" }))
    await waitFor(() =>
      expect(api.callsTo("/admin/categories/c2")).toEqual([
        expect.objectContaining({ method: "delete" }),
      ])
    )
    await waitFor(async () =>
      expect(names(await list("Categories"))).not.toContain("Antibiotics")
    )
    expect(toast.success).toHaveBeenCalledWith("Antibiotics deleted.")
  })

  it("explains DATA_CONFLICT when the entry is still in use", async () => {
    renderAt("/admin/catalog?tab=manufacturers")
    await user.click(
      within(await row("Manufacturers", "GSK")).getByRole("button", {
        name: "Delete",
      })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: "Delete GSK?",
    })
    await user.click(within(confirm).getByRole("button", { name: "Delete" }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Medicines still use this manufacturer, so it can't be deleted."
      )
    )
    expect(names(await list("Manufacturers"))).toContain("GSK")
  })

  it("shows an empty list with what to do next", async () => {
    medicines = []
    renderAt()
    expect(await screen.findByText("No medicines yet")).toBeVisible()
    expect(
      screen.getAllByRole("button", { name: "Add medicine" }).length
    ).toBeGreaterThan(0)
  })

  it("shows a failed load with a retry", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/admin/medicines": () =>
        failing ? fail(500, "INTERNAL_ERROR") : medicines,
    })
    renderAt()
    expect(
      await screen.findByText("The medicines could not be loaded")
    ).toBeVisible()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(names(await list("Medicines"))).toHaveLength(2)
  })
})
