import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AdminUser } from "@/api/types"
import type { Call } from "@/test/mockApi"
import { UsersPage } from "@/features/admin/UsersPage"
import { validateUsersSearch } from "@/features/admin/usersSearch"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { adminUser } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>
let users: Array<AdminUser>

function renderAt(path = "/admin/users") {
  return renderRoutes(
    [
      {
        path: "/admin/users",
        component: UsersPage,
        validateSearch: validateUsersSearch,
      },
    ],
    path
  )
}

function list() {
  return screen.findByRole("list", { name: "Users" })
}

async function row(name: string) {
  const item = within(await list())
    .getAllByRole("listitem")
    .find((li) => li.querySelector("h3")?.textContent === name)
  if (!item) throw new Error(`no row for ${name}`)
  return item
}

function names(ul: HTMLElement) {
  return within(ul)
    .getAllByRole("listitem")
    .map((li) => li.querySelector("h3")?.textContent)
}

function setStatus(id: string, status: AdminUser["status"]) {
  users = users.map((u) => (u.id === id ? { ...u, status } : u))
}

/** What the backend's search does with `q` and `status`. */
function search({ params }: Call) {
  const q = typeof params.q === "string" ? params.q.toLowerCase() : ""
  return users.filter(
    (u) =>
      (params.status ? u.status === params.status : u.status !== "DELETED") &&
      (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  )
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  users = [
    adminUser(),
    adminUser({
      id: "u2",
      name: "Kamal Silva",
      email: "kamal@example.lk",
      phone: "0112345678",
      role: "PHARMACY_OWNER",
      status: "SUSPENDED",
    }),
    adminUser({
      id: "a1",
      name: "Site Admin",
      email: "admin@suwalink.lk",
      role: "ADMIN",
    }),
  ]
  api = mockApi({
    "/admin/users": search,
    "/admin/users/u1/suspend": () => setStatus("u1", "SUSPENDED"),
    "/admin/users/u2/reactivate": () => setStatus("u2", "ACTIVE"),
    "/admin/users/u1": () => setStatus("u1", "DELETED"),
    "/admin/users/u2": () => fail(409, "OPEN_RESERVATIONS"),
  })
})
afterEach(() => api.restore())

describe("admin UsersPage", () => {
  it("shows each account's name, email, phone, role and status", async () => {
    renderAt()
    expect(names(await list())).toEqual([
      "Nimal Perera",
      "Kamal Silva",
      "Site Admin",
    ])
    const nimal = await row("Nimal Perera")
    expect(nimal).toHaveTextContent("nimal@example.lk")
    expect(nimal).toHaveTextContent("0771234567")
    expect(nimal).toHaveTextContent("Customer")
    expect(nimal).toHaveTextContent("Active")
    const kamal = await row("Kamal Silva")
    expect(kamal).toHaveTextContent("Pharmacy owner")
    expect(kamal).toHaveTextContent("Suspended")
    expect(await row("Site Admin")).toHaveTextContent("Admin")
    expect(api.callsTo("/admin/users")[0].params).toEqual({})
    expect(
      screen.getByRole("button", { name: "All", pressed: true })
    ).toBeVisible()
  })

  it("sends the search to the server", async () => {
    renderAt()
    await list()
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search by name or email" }),
      "kamal"
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/users").at(-1)?.params).toEqual({
        q: "kamal",
      })
    )
    await waitFor(async () =>
      expect(names(await list())).toEqual(["Kamal Silva"])
    )
    // Debounced: not one request per letter.
    expect(api.callsTo("/admin/users").length).toBeLessThan(4)
  })

  it("filters by status and keeps the filter in the URL", async () => {
    const { router } = renderAt()
    await list()
    await userEvent.click(screen.getByRole("button", { name: "Suspended" }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ status: "SUSPENDED" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/users").at(-1)?.params).toEqual({
        status: "SUSPENDED",
      })
    )
    await waitFor(async () =>
      expect(names(await list())).toEqual(["Kamal Silva"])
    )
  })

  it("falls back to all accounts for an unknown status", async () => {
    renderAt("/admin/users?status=bogus")
    expect(names(await list())).toHaveLength(3)
    expect(api.callsTo("/admin/users")[0].params).toEqual({})
  })

  it("asks before suspending, then shows the account suspended", async () => {
    renderAt()
    await userEvent.click(
      within(await row("Nimal Perera")).getByRole("button", {
        name: "Suspend",
      })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: "Suspend Nimal Perera?",
    })
    expect(api.callsTo("/admin/users/u1/suspend")).toHaveLength(0)
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Suspend" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/users/u1/suspend")).toEqual([
        expect.objectContaining({ method: "put" }),
      ])
    )
    await waitFor(async () =>
      expect(await row("Nimal Perera")).toHaveTextContent("Suspended")
    )
    expect(
      within(await row("Nimal Perera")).getByRole("button", {
        name: "Reactivate",
      })
    ).toBeVisible()
    expect(toast.success).toHaveBeenCalledWith("Nimal Perera suspended.")
  })

  it("reactivates a suspended account", async () => {
    renderAt()
    const kamal = await row("Kamal Silva")
    expect(within(kamal).queryByRole("button", { name: "Suspend" })).toBeNull()
    await userEvent.click(
      within(kamal).getByRole("button", { name: "Reactivate" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/users/u2/reactivate")).toEqual([
        expect.objectContaining({ method: "put" }),
      ])
    )
    await waitFor(async () =>
      expect(await row("Kamal Silva")).toHaveTextContent("Active")
    )
  })

  it("explains that a deleted account can't be restored before deleting", async () => {
    renderAt()
    await userEvent.click(
      within(await row("Nimal Perera")).getByRole("button", {
        name: "Delete",
      })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: "Delete Nimal Perera's account?",
    })
    expect(confirm).toHaveTextContent(/anonymised/)
    expect(confirm).toHaveTextContent(/can't be restored/)
    expect(api.callsTo("/admin/users/u1")).toHaveLength(0)
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Delete" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/users/u1")).toEqual([
        expect.objectContaining({ method: "delete" }),
      ])
    )
    await waitFor(async () =>
      expect(names(await list())).toEqual(["Kamal Silva", "Site Admin"])
    )
  })

  it("offers no actions on admin accounts", async () => {
    renderAt()
    const admin = await row("Site Admin")
    expect(within(admin).queryAllByRole("button")).toEqual([])
    expect(admin).toHaveTextContent("Admin accounts can't be changed here.")
  })

  it("shows a refused action translated (Review Focus 4)", async () => {
    // The list is stale: the account became an admin after it loaded.
    api.restore()
    api = mockApi({
      "/admin/users": search,
      "/admin/users/u1/suspend": () => fail(409, "ACCOUNT_ACTION_NOT_ALLOWED"),
    })
    renderAt()
    await userEvent.click(
      within(await row("Nimal Perera")).getByRole("button", {
        name: "Suspend",
      })
    )
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Suspend",
      })
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This action is not allowed for this account."
      )
    )
    expect(await row("Nimal Perera")).toHaveTextContent("Active")
  })

  it("explains a pharmacy that still has open reservations", async () => {
    renderAt()
    await userEvent.click(
      within(await row("Kamal Silva")).getByRole("button", { name: "Delete" })
    )
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      })
    )
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(
      /still has confirmed reservations/
    )
  })

  it("says when nothing matches and clears the search", async () => {
    renderAt()
    await list()
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search by name or email" }),
      "zzz"
    )
    expect(await screen.findByText("No accounts match “zzz”")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(names(await list())).toHaveLength(3)
  })

  it("offers all accounts when a status has none", async () => {
    users = [adminUser()]
    renderAt("/admin/users?status=SUSPENDED")
    expect(await screen.findByText("No suspended accounts")).toBeVisible()
    await userEvent.click(
      screen.getByRole("button", { name: "Show all accounts" })
    )
    expect(names(await list())).toEqual(["Nimal Perera"])
  })

  it("explains a failed load and retries", async () => {
    api.restore()
    let fails = true
    api = mockApi({
      "/admin/users": (call) =>
        fails ? fail(500, "INTERNAL_ERROR") : search(call),
    })
    renderAt()
    expect(await screen.findByText("Could not load users")).toBeVisible()
    fails = false
    await userEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(names(await list())).toHaveLength(3)
  })
})
