import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { InventoryItem } from "@/api/types"
import { InventoryPage } from "@/features/pharmacy-owner/InventoryPage"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { catalogMedicine, inventoryItem, localDate } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

const medicine = inventoryItem().medicine

const panadol = inventoryItem({
  id: "inv1",
  expireDate: localDate(365),
})
const amoxil = inventoryItem({
  id: "inv2",
  stockQuantity: 3,
  expireDate: localDate(200),
  medicine: {
    ...medicine,
    id: "m2",
    brandName: "Amoxil",
    genericName: "Amoxicillin",
    strength: "250 mg",
    legalCategory: "PRESCRIPTION",
  },
})
const zyrtec = inventoryItem({
  id: "inv3",
  stockQuantity: 20,
  expireDate: localDate(10),
  medicine: {
    ...medicine,
    id: "m3",
    brandName: "Zyrtec",
    genericName: "Cetirizine",
    strength: "10 mg",
  },
})
const ventolin = inventoryItem({
  id: "inv4",
  stockQuantity: 10,
  expireDate: localDate(300),
  available: false,
  medicine: {
    ...medicine,
    id: "m4",
    brandName: "Ventolin",
    genericName: "Salbutamol",
    strength: "2 mg",
  },
})
const oldSyrup = inventoryItem({
  id: "inv5",
  stockQuantity: 50,
  expireDate: localDate(-2),
  medicine: {
    ...medicine,
    id: "m5",
    brandName: "Piriton",
    genericName: "Chlorphenamine",
    strength: "4 mg",
  },
})

const catalog = [
  catalogMedicine({ id: "m1" }),
  catalogMedicine({
    id: "m2",
    brandName: "Amoxil",
    genericName: "Amoxicillin",
    strength: "250 mg",
    legalCategory: "PRESCRIPTION",
  }),
  catalogMedicine({
    id: "m6",
    brandName: "Losec",
    genericName: "Omeprazole",
    strength: "20 mg",
  }),
]

// No delay between keystrokes keeps these long forms fast in the full suite.
let user: ReturnType<typeof userEvent.setup>
let api: ReturnType<typeof mockApi>
let items: Array<InventoryItem>

function handlers(
  over: Record<string, Parameters<typeof mockApi>[0][string]> = {}
) {
  return {
    "/inventory": ({ method, data }: { method: string; data: unknown }) => {
      if (method === "post") {
        const body = data as { medicineMasterId: string }
        const added = inventoryItem({
          id: "new",
          medicine: {
            ...medicine,
            id: body.medicineMasterId,
            brandName: "Losec",
          },
        })
        items = [...items, added]
        return added
      }
      return items
    },
    "/medicines": () => catalog,
    ...over,
  }
}

function renderInventory() {
  return renderRoutes(
    [
      { path: "/pharmacy/inventory", component: InventoryPage },
      { path: "/pharmacy/suggest-medicine" },
    ],
    "/pharmacy/inventory"
  )
}

function list() {
  return screen.getByRole("list", { name: "Your stock" })
}

function shownBrands() {
  return within(list())
    .getAllByRole("listitem")
    .map((item) => within(item).getByRole("heading").textContent)
}

function row(brand: string) {
  const heading = within(list()).getByRole("heading", {
    name: new RegExp(brand),
  })
  const item = heading.closest("li")
  if (!item) throw new Error(`no row for ${brand}`)
  return item
}

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
  items = [panadol, amoxil, zyrtec, ventolin, oldSyrup]
  api = mockApi(handlers())
})
afterEach(() => api.restore())

// Long typed forms and Radix selects; give them room when the whole suite runs in parallel.
describe("InventoryPage", { timeout: 15_000 }, () => {
  it("lists every item with its details and filters by chip", async () => {
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    expect(shownBrands()).toHaveLength(5)

    const amoxilRow = row("Amoxil")
    expect(within(amoxilRow).getByText("Amoxicillin")).toBeVisible()
    expect(within(amoxilRow).getByText("Prescription needed")).toBeVisible()
    expect(within(amoxilRow).getByText("Only 3 left")).toBeVisible()
    expect(within(amoxilRow).getByText(/LKR\s?12\.50/)).toBeVisible()
    expect(within(row("Panadol")).queryByText("Prescription needed")).toBeNull()
    expect(within(row("Zyrtec")).getByText(/Expires soon/)).toBeVisible()
    expect(within(row("Piriton")).getByText(/Expired/)).toBeVisible()
    expect(within(row("Panadol")).queryByText(/Expire(s soon|d)/)).toBeNull()

    const chip = (name: string) => screen.getByRole("button", { name })
    expect(chip("All")).toHaveAttribute("aria-pressed", "true")

    await user.click(chip("Low stock"))
    expect(chip("Low stock")).toHaveAttribute("aria-pressed", "true")
    expect(chip("All")).toHaveAttribute("aria-pressed", "false")
    expect(shownBrands()).toEqual([expect.stringContaining("Amoxil")])

    await user.click(chip("Expiring soon"))
    // Sorted by brand name.
    expect(shownBrands()).toEqual([
      expect.stringContaining("Piriton"),
      expect.stringContaining("Zyrtec"),
    ])

    await user.click(chip("Hidden"))
    expect(shownBrands()).toEqual([expect.stringContaining("Ventolin")])
  })

  it("searches by brand or generic name and can show everything again", async () => {
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    const search = screen.getByRole("searchbox", { name: "Search your stock" })
    await user.type(search, "salbu")
    expect(shownBrands()).toEqual([expect.stringContaining("Ventolin")])
    await user.clear(search)
    await user.type(search, "AMOX")
    expect(shownBrands()).toEqual([expect.stringContaining("Amoxil")])

    // Search and chip combine; "Show all items" clears both.
    await user.click(screen.getByRole("button", { name: "Hidden" }))
    expect(screen.getByText("No items match")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Show all items" }))
    expect(search).toHaveValue("")
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(shownBrands()).toHaveLength(5)
  })

  it("enables Add item only once the stock has loaded", async () => {
    let release = () => {}
    const loaded = new Promise<void>((resolve) => {
      release = resolve
    })
    api.restore()
    api = mockApi(
      handlers({
        "/inventory": async () => {
          await loaded
          return items
        },
      })
    )
    renderInventory()
    // Until then "In your stock" could not be marked reliably.
    const add = await screen.findByRole("button", { name: "Add item" })
    expect(add).toBeDisabled()
    release()
    await screen.findByRole("list", { name: "Your stock" })
    expect(add).toBeEnabled()
  })

  it("hides an item from customers with the availability switch", async () => {
    api.restore()
    api = mockApi(
      handlers({
        "/inventory/inv1/availability": ({ data }) => {
          const available = (data as { available: boolean }).available
          items = items.map((item) =>
            item.id === "inv1" ? { ...item, available } : item
          )
          return items[0]
        },
      })
    )
    renderInventory()
    const toggle = await screen.findByRole("switch", {
      name: "Show Panadol 500 mg to customers",
    })
    expect(toggle).toBeChecked()
    await user.click(toggle)
    await waitFor(() =>
      expect(api.callsTo("/inventory/inv1/availability")).toEqual([
        expect.objectContaining({
          method: "patch",
          data: { available: false },
        }),
      ])
    )
    // The list is refetched, so the overview counts update too.
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Show Panadol 500 mg to customers" })
      ).not.toBeChecked()
    )
    expect(
      api.callsTo("/inventory").filter((call) => call.method === "get")
    ).toHaveLength(2)
  })

  it("asks before deleting an item, then deletes it", async () => {
    api.restore()
    api = mockApi(
      handlers({
        "/inventory/inv2": () => {
          items = items.filter((item) => item.id !== "inv2")
          return null
        },
      })
    )
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    await user.click(
      within(row("Amoxil")).getByRole("button", { name: "Delete" })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Delete Amoxil 250 mg?")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(api.callsTo("/inventory/inv2")).toHaveLength(0)

    await user.click(
      within(row("Amoxil")).getByRole("button", { name: "Delete" })
    )
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      })
    )
    await waitFor(() =>
      expect(api.callsTo("/inventory/inv2")).toEqual([
        expect.objectContaining({ method: "delete" }),
      ])
    )
    await waitFor(() => expect(shownBrands()).toHaveLength(4))
  })

  it("checks an edit like the backend does before sending it", async () => {
    api.restore()
    api = mockApi(
      handlers({
        "/inventory/inv1": ({ data }) => ({ ...panadol, ...(data as object) }),
      })
    )
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    await user.click(
      within(row("Panadol")).getByRole("button", { name: "Edit" })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Edit Panadol 500 mg",
    })
    const price = within(dialog).getByLabelText("Price per unit (LKR)")
    const stock = within(dialog).getByLabelText("Stock")
    const expiry = within(dialog).getByLabelText("Expiry date")
    expect(price).toHaveValue("12.5")
    expect(stock).toHaveValue("40")
    expect(expiry).toHaveValue(panadol.expireDate)

    await user.clear(price)
    await user.type(price, "0")
    await user.clear(stock)
    await user.type(stock, "-1")
    await user.clear(expiry)
    await user.type(expiry, localDate(0))
    const save = within(dialog).getByRole("button", { name: "Save" })
    await user.click(save)

    await waitFor(() =>
      expect(price).toHaveAccessibleDescription("Enter a price above 0.")
    )
    expect(stock).toHaveAccessibleDescription(
      "Enter a whole number, 0 or more."
    )
    expect(expiry).toHaveAccessibleDescription("Choose a date after today.")

    await user.clear(price)
    await user.type(price, "12.345")
    await user.clear(stock)
    await user.type(stock, "2.5")
    await user.click(save)
    // Prices are stored with 2 decimal places.
    await waitFor(() =>
      expect(price).toHaveAccessibleDescription("Use at most 2 decimal places.")
    )
    await waitFor(() =>
      expect(stock).toHaveAccessibleDescription(
        "Enter a whole number, 0 or more."
      )
    )
    expect(api.callsTo("/inventory/inv1")).toHaveLength(0)

    await user.clear(price)
    await user.type(price, "14.75")
    await user.clear(stock)
    await user.type(stock, "0")
    await user.clear(expiry)
    await user.type(expiry, localDate(1))
    await user.click(save)
    await waitFor(() =>
      expect(api.callsTo("/inventory/inv1")).toEqual([
        expect.objectContaining({
          method: "put",
          data: {
            unitPrice: 14.75,
            stockQuantity: 0,
            expireDate: localDate(1),
          },
        }),
      ])
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("adds a catalogue medicine with price, stock and expiry", async () => {
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    await user.click(screen.getByRole("button", { name: "Add item" }))
    const dialog = await screen.findByRole("dialog", {
      name: "Add a medicine to your stock",
    })

    // Sending without a medicine is caught first.
    await user.click(
      within(dialog).getByRole("button", { name: "Add to stock" })
    )
    expect(
      await within(dialog).findByText("Choose a medicine from the list.")
    ).toBeVisible()
    expect(api.calls.some((call) => call.method === "post")).toBe(false)

    const search = within(dialog).getByRole("combobox", {
      name: "Search the catalogue",
    })
    // Already stocked medicines are marked.
    expect(
      within(within(dialog).getByRole("option", { name: /Amoxil/ })).getByText(
        "In your stock"
      )
    ).toBeVisible()
    await user.type(search, "omep")
    expect(within(dialog).queryByRole("option", { name: /Amoxil/ })).toBeNull()
    await user.click(within(dialog).getByRole("option", { name: /Losec/ }))

    expect(within(dialog).getByText("Losec 20 mg")).toBeVisible()
    await user.type(
      within(dialog).getByLabelText("Price per unit (LKR)"),
      "25.50"
    )
    await user.type(within(dialog).getByLabelText("Stock"), "30")
    await user.type(
      within(dialog).getByLabelText("Expiry date"),
      localDate(200)
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Add to stock" })
    )
    await waitFor(() =>
      expect(
        api.callsTo("/inventory").filter((call) => call.method === "post")
      ).toEqual([
        expect.objectContaining({
          data: {
            medicineMasterId: "m6",
            unitPrice: 25.5,
            stockQuantity: 30,
            expireDate: localDate(200),
          },
        }),
      ])
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(shownBrands()).toHaveLength(6))
  })

  it("sends an already stocked medicine to its edit dialog", async () => {
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    await user.click(screen.getByRole("button", { name: "Add item" }))
    const dialog = await screen.findByRole("dialog", {
      name: "Add a medicine to your stock",
    })
    await user.click(within(dialog).getByRole("option", { name: /Amoxil/ }))
    const edit = await screen.findByRole("dialog", {
      name: "Edit Amoxil 250 mg",
    })
    expect(within(edit).getByLabelText("Stock")).toHaveValue("3")
    expect(
      screen.queryByRole("dialog", { name: "Add a medicine to your stock" })
    ).toBeNull()
  })

  it("shows a translated DUPLICATE and keeps the add form", async () => {
    api.restore()
    api = mockApi(
      handlers({
        "/inventory": ({ method }) =>
          method === "post" ? fail(409, "DUPLICATE") : items,
      })
    )
    renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    await user.click(screen.getByRole("button", { name: "Add item" }))
    const dialog = await screen.findByRole("dialog", {
      name: "Add a medicine to your stock",
    })
    await user.click(within(dialog).getByRole("option", { name: /Losec/ }))
    await user.type(within(dialog).getByLabelText("Price per unit (LKR)"), "9")
    await user.type(within(dialog).getByLabelText("Stock"), "5")
    await user.type(within(dialog).getByLabelText("Expiry date"), localDate(90))
    await user.click(
      within(dialog).getByRole("button", { name: "Add to stock" })
    )
    expect(
      await within(dialog).findByText("This already exists.")
    ).toBeVisible()
    expect(
      screen.getByRole("dialog", { name: "Add a medicine to your stock" })
    ).toBeVisible()
    expect(within(dialog).getByText("Losec 20 mg")).toBeVisible()
    expect(within(dialog).getByLabelText("Price per unit (LKR)")).toHaveValue(
      "9"
    )
    expect(within(dialog).getByLabelText("Stock")).toHaveValue("5")
    expect(within(dialog).getByLabelText("Expiry date")).toHaveValue(
      localDate(90)
    )
  })

  it("points an empty pharmacy to adding stock or suggesting a medicine", async () => {
    items = []
    renderInventory()
    expect(await screen.findByText("No medicines in stock yet")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Suggest a medicine" })
    ).toHaveAttribute("href", "/pharmacy/suggest-medicine")
  })

  it("keeps the list on screen when a background refresh fails", async () => {
    let failing = false
    api.restore()
    api = mockApi(
      handlers({
        "/inventory": () => (failing ? fail(500, "INTERNAL_ERROR") : items),
      })
    )
    const { queryClient } = renderInventory()
    await screen.findByRole("list", { name: "Your stock" })
    failing = true
    await queryClient.invalidateQueries()
    expect(
      await screen.findByText(
        "Couldn't refresh — showing the last loaded version."
      )
    ).toBeVisible()
    expect(shownBrands()).toHaveLength(5)
    expect(screen.queryByText("Your stock could not be loaded")).toBeNull()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() =>
      expect(
        screen.queryByText(
          "Couldn't refresh — showing the last loaded version."
        )
      ).toBeNull()
    )
  })

  it("offers a retry when the stock cannot be loaded", async () => {
    let failing = true
    api.restore()
    api = mockApi(
      handlers({
        "/inventory": () => (failing ? fail(500, "INTERNAL_ERROR") : items),
      })
    )
    renderInventory()
    expect(
      await screen.findByText("Your stock could not be loaded")
    ).toBeVisible()
    failing = false
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("list", { name: "Your stock" })
    ).toBeVisible()
  })
})
