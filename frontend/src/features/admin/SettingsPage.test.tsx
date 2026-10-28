import { useQuery } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AdminSettings } from "@/api/types"
import { useAdminPharmacies, useDashboard } from "@/api/admin"
import { getPublicSettings } from "@/api/auth"
import { publicSettingsKey } from "@/api/settings"
import { SettingsPage } from "@/features/admin/SettingsPage"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>
let settings: AdminSettings

const demoAccounts: AdminSettings["demoAccounts"] = [
  { role: "CUSTOMER", email: "customer1@demo.suwalink.lk", password: "x" },
]

/**
 * The settings page next to the other admin queries and the login page's
 * public settings, as if those pages were open in other tabs of the app.
 */
function WithOtherPagesOpen() {
  useDashboard()
  useAdminPharmacies()
  useQuery({ queryKey: publicSettingsKey, queryFn: getPublicSettings })
  return <SettingsPage />
}

async function renderSettings() {
  renderRoutes(
    [{ path: "/admin/settings", component: WithOtherPagesOpen }],
    "/admin/settings"
  )
  const toggle = await screen.findByRole("switch", {
    name: "Show demo data publicly",
  })
  await waitFor(() => expect(api.callsTo("/settings/public")).toHaveLength(1))
  return toggle
}

/** Every query the page and the "other pages" hold has been fetched again. */
async function expectRefetched() {
  for (const url of [
    "/admin/settings",
    "/admin/dashboard",
    "/admin/pharmacies",
    "/settings/public",
  ]) {
    await waitFor(() =>
      expect(api.callsTo(url).filter((c) => c.method === "get")).toHaveLength(2)
    )
  }
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "a1", name: "Admin", role: "ADMIN" })
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  settings = { demoModePublic: true, demoAccounts }
  api = mockApi({
    "/admin/settings": ({ method, data }) => {
      if (method === "put") {
        const { demoModePublic } = data as { demoModePublic: boolean }
        settings = {
          demoModePublic,
          demoAccounts: demoModePublic ? demoAccounts : [],
        }
      }
      return settings
    },
    "/admin/demo/reset": () => undefined,
    "/admin/dashboard": () => ({}),
    "/admin/pharmacies": () => [],
    "/settings/public": () => settings,
  })
})
afterEach(() => api.restore())

describe("admin SettingsPage", () => {
  it("shows the current demo mode and warns about the login page", async () => {
    const toggle = await renderSettings()
    expect(toggle).toBeChecked()
    expect(
      screen.getByText(
        "While this is on, the demo accounts and their passwords are shown on the login page."
      )
    ).toBeVisible()
  })

  it("turns demo data on without asking", async () => {
    settings = { demoModePublic: false, demoAccounts: [] }
    const toggle = await renderSettings()
    expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    await waitFor(() =>
      expect(
        api.callsTo("/admin/settings").find((c) => c.method === "put")?.data
      ).toEqual({ demoModePublic: true })
    )
    await waitFor(() => expect(toggle).toBeChecked())
    expect(toast.success).toHaveBeenCalledWith("Demo data is now public.")
    await expectRefetched()
  })

  it("asks before turning demo data off", async () => {
    const toggle = await renderSettings()
    await userEvent.click(toggle)
    const confirm = await screen.findByRole("alertdialog", {
      name: "Turn off demo data?",
    })
    expect(confirm).toHaveTextContent(
      "Demo pharmacies disappear from search and demo accounts can no longer sign in."
    )
    expect(
      api.callsTo("/admin/settings").filter((c) => c.method === "put")
    ).toHaveLength(0)
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Turn off" })
    )
    await waitFor(() =>
      expect(
        api.callsTo("/admin/settings").find((c) => c.method === "put")?.data
      ).toEqual({ demoModePublic: false })
    )
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(toast.success).toHaveBeenCalledWith("Demo data is now hidden.")
    await expectRefetched()
  })

  it("leaves demo data on when turning off is cancelled", async () => {
    const toggle = await renderSettings()
    await userEvent.click(toggle)
    const confirm = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Cancel" })
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(toggle).toBeChecked()
    expect(
      api.callsTo("/admin/settings").filter((c) => c.method === "put")
    ).toHaveLength(0)
  })

  it("asks before resetting the demo data, then POSTs", async () => {
    await renderSettings()
    await userEvent.click(
      screen.getByRole("button", { name: "Reset demo data" })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: "Reset demo data?",
    })
    expect(api.callsTo("/admin/demo/reset")).toHaveLength(0)
    await userEvent.click(
      within(confirm).getByRole("button", { name: "Reset" })
    )
    await waitFor(() =>
      expect(api.callsTo("/admin/demo/reset")[0]?.method).toBe("post")
    )
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Demo data has been reset.")
    )
    await expectRefetched()
  })

  it("shows a failed change translated and keeps the old value", async () => {
    api.restore()
    api = mockApi({
      "/admin/settings": ({ method }) =>
        method === "put" ? fail(403, "ACCESS_DENIED") : settings,
      "/admin/dashboard": () => ({}),
      "/admin/pharmacies": () => [],
      "/settings/public": () => settings,
    })
    const toggle = await renderSettings()
    await userEvent.click(toggle)
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Turn off",
      })
    )
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).not.toBe("English")
    expect(toggle).toBeChecked()
  })

  it("explains a failed load and retries", async () => {
    api.restore()
    let fails = true
    api = mockApi({
      "/admin/settings": () => (fails ? fail(500, "INTERNAL_ERROR") : settings),
    })
    renderRoutes(
      [{ path: "/admin/settings", component: SettingsPage }],
      "/admin/settings"
    )
    expect(await screen.findByText("Could not load the settings")).toBeVisible()
    fails = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("switch", { name: "Show demo data publicly" })
    ).toBeChecked()
  })
})
