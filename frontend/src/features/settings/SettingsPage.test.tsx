import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UserProfile } from "@/api/types"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { useCartStore } from "@/stores/cartStore"
import { useLanguageStore } from "@/stores/languageStore"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"
import { useThemeStore } from "@/stores/themeStore"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>
let me: UserProfile

async function renderSettings() {
  const view = renderRoutes(
    [{ path: "/settings", component: SettingsPage }, { path: "/" }],
    "/settings"
  )
  await screen.findByText("nimal@example.com")
  return view
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useLocationStore.getState().clear()
  useCartStore.getState().clear()
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  me = {
    id: "u1",
    name: "Nimal Perera",
    email: "nimal@example.com",
    phone: "0771234567",
    role: "CUSTOMER",
    preferredLanguage: "en",
    district: "COLOMBO",
    pharmacy: null,
  }
  vi.mocked(toast.success).mockClear()
  api = mockApi({
    "/users/me": ({ method, data }) => {
      if (method === "delete") {
        return (data as { password: string }).password === "secret123"
          ? null
          : fail(400, "INVALID_PASSWORD")
      }
      return me
    },
    "/users/me/preferences": () => null,
  })
})
afterEach(() => {
  api.restore()
  useLanguageStore.getState().setLanguage("en")
})

describe("SettingsPage", () => {
  it("shows the profile read-only", async () => {
    await renderSettings()
    expect(screen.getByText("Nimal Perera")).toBeVisible()
    expect(screen.getByText("0771234567")).toBeVisible()
    expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull()
  })

  async function chooseDistrict(name: string) {
    await userEvent.click(
      screen.getByRole("combobox", { name: "Default district" })
    )
    await userEvent.click(await screen.findByRole("option", { name }))
  }

  it("saves the language and district and applies them", async () => {
    await renderSettings()
    await userEvent.click(screen.getByRole("radio", { name: "සිංහල" }))
    await chooseDistrict("Kandy")
    await userEvent.click(
      screen.getByRole("button", { name: "Save preferences" })
    )
    await waitFor(() =>
      expect(api.callsTo("/users/me/preferences")[0]).toMatchObject({
        method: "put",
        data: { preferredLanguage: "si", district: "KANDY" },
      })
    )
    await waitFor(() => expect(useLanguageStore.getState().language).toBe("si"))
    expect(useLocationStore.getState()).toMatchObject({
      mode: "district",
      district: "KANDY",
    })
  })

  it("keeps a chosen map point when saving a new district", async () => {
    useLocationStore.getState().setPoint(6.9, 79.86, "pinned")
    await renderSettings()
    await chooseDistrict("Kandy")
    await userEvent.click(
      screen.getByRole("button", { name: "Save preferences" })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(api.callsTo("/users/me/preferences")[0].data).toMatchObject({
      district: "KANDY",
    })
    expect(useLocationStore.getState()).toMatchObject({
      mode: "point",
      lat: 6.9,
      lng: 79.86,
    })
  })

  it("changes the theme straight away", async () => {
    await renderSettings()
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }))
    expect(useThemeStore.getState().theme).toBe("dark")
    await userEvent.click(screen.getByRole("radio", { name: "Light" }))
    expect(useThemeStore.getState().theme).toBe("light")
  })

  it("asks for the password before deleting the account", async () => {
    await renderSettings()
    await userEvent.click(
      screen.getByRole("button", { name: "Delete account" })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Delete your account?",
    })
    const confirm = within(dialog).getByRole("button", {
      name: "Delete my account",
    })
    expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText("Password"), "wrong")
    await userEvent.click(confirm)
    expect(
      await within(dialog).findByText("The password is incorrect.")
    ).toBeVisible()
    expect(useSessionStore.getState().token).toBe("t")

    // Editing the password clears the stale error.
    await userEvent.type(within(dialog).getByLabelText("Password"), "x")
    expect(within(dialog).queryByText("The password is incorrect.")).toBeNull()
    expect(within(dialog).getByLabelText("Password")).not.toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("cannot be dismissed while the delete is in flight", async () => {
    let answer: (value: null) => void = () => {}
    api.restore()
    api = mockApi({
      "/users/me": ({ method }) =>
        method === "delete"
          ? new Promise<null>((resolve) => (answer = resolve))
          : me,
    })
    const { router } = await renderSettings()
    await userEvent.click(
      screen.getByRole("button", { name: "Delete account" })
    )
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText("Password"), "secret123")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete my account" })
    )
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Cancel" })
      ).toBeDisabled()
    )
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("dialog")).toBeVisible()

    answer(null)
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    expect(useSessionStore.getState().token).toBeNull()
    expect(toast.success).toHaveBeenCalledWith("Your account has been deleted.")
  })

  it("deletes the account and clears everything kept in the browser", async () => {
    useCartStore.setState({
      lines: [
        {
          inventoryItemId: "inv1",
          pharmacyId: "p1",
          pharmacyName: "City Pharmacy",
          medicineId: "m1",
          medicineName: "Panadol",
          strength: "500 mg",
          unitPrice: 12.5,
          quantity: 1,
          maxQuantity: 5,
          requiresPrescription: false,
        },
      ],
    })
    useLocationStore.getState().setPoint(6.9, 79.86, "device")
    const { router } = await renderSettings()
    await userEvent.click(
      screen.getByRole("button", { name: "Delete account" })
    )
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText("Password"), "secret123")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete my account" })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    expect(api.callsTo("/users/me").at(-1)).toMatchObject({
      method: "delete",
      data: { password: "secret123" },
    })
    expect(useSessionStore.getState().token).toBeNull()
    expect(useCartStore.getState().lines).toEqual([])
    expect(useLocationStore.getState().mode).toBe("none")
    expect(toast.success).toHaveBeenCalledWith("Your account has been deleted.")
  })

  it("signs out, forgetting the cart and the location", async () => {
    const { router } = await renderSettings()
    useCartStore.getState().add({
      inventoryItemId: "inv1",
      pharmacyId: "p1",
      pharmacyName: "City Pharmacy",
      medicineId: "m1",
      medicineName: "Panadol",
      strength: "500 mg",
      unitPrice: 12.5,
      quantity: 1,
      maxQuantity: 10,
      requiresPrescription: false,
    })
    useLocationStore.getState().setPoint(6.9, 79.86, "pinned")
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }))
    expect(useSessionStore.getState().token).toBeNull()
    expect(useCartStore.getState().lines).toEqual([])
    expect(useLocationStore.getState().mode).toBe("none")
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
  })
})
