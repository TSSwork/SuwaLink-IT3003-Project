import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PharmacyProfile } from "@/api/types"
import { SettingsPage } from "@/features/pharmacy-owner/SettingsPage"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"
import { pharmacyProfile } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

// Leaflet needs a real browser; the map is a button that "taps" Kandy.
vi.mock("@/components/map/MapView", () => ({
  default: ({ onPick }: { onPick: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => onPick(7.2906, 80.6337)}>
      fake map
    </button>
  ),
}))

let api: ReturnType<typeof mockApi>
let profile: PharmacyProfile

async function renderSettings() {
  const view = renderRoutes(
    [{ path: "/pharmacy/settings", component: SettingsPage }],
    "/pharmacy/settings"
  )
  await screen.findByDisplayValue("City Pharmacy")
  return view
}

function save() {
  return userEvent.click(screen.getByRole("button", { name: "Save changes" }))
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en")
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
  profile = pharmacyProfile()
  vi.mocked(toast.success).mockClear()
  api = mockApi({
    "/pharmacies/me": ({ method, data }) => {
      if (method === "put") {
        profile = { ...profile, ...(data as Partial<PharmacyProfile>) }
      }
      return profile
    },
  })
})
afterEach(() => api.restore())

describe("pharmacy SettingsPage", () => {
  it("fills the form from the profile and shows the fixed details", async () => {
    await renderSettings()
    expect(screen.getByLabelText("Pharmacy name")).toHaveValue("City Pharmacy")
    expect(screen.getByLabelText("Phone number")).toHaveValue("0112345678")
    expect(screen.getByLabelText("Address")).toHaveValue("12 Galle Road")
    expect(screen.getByLabelText("City")).toHaveValue("Colombo 03")
    expect(screen.getByLabelText("Opening hours (optional)")).toHaveValue(
      "8am - 10pm"
    )
    expect(
      screen.getByRole("combobox", { name: "District" })
    ).toHaveTextContent("Colombo")
    expect(screen.getByLabelText("Latitude")).toHaveValue("6.927100")
    expect(screen.getByLabelText("Longitude")).toHaveValue("79.861200")
    // Read-only: shown as text, not as inputs.
    expect(screen.getByText("PH-2024-0012")).toBeVisible()
    expect(screen.getByText("Verified")).toBeVisible()
    expect(screen.getByText("kamal@example.lk")).toBeVisible()
    expect(screen.queryByDisplayValue("PH-2024-0012")).toBeNull()
  })

  it("starts with an empty phone when the pharmacy has none yet", async () => {
    profile = pharmacyProfile({ phone: null, openingHours: null })
    await renderSettings()
    expect(screen.getByLabelText("Phone number")).toHaveValue("")
    await save()
    expect(await screen.findByText("This field is required.")).toBeVisible()
    expect(screen.getByLabelText("Phone number")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(api.callsTo("/pharmacies/me").some((c) => c.method === "put")).toBe(
      false
    )
  })

  it("blocks a latitude outside Sri Lanka", async () => {
    await renderSettings()
    const latitude = screen.getByLabelText("Latitude")
    await userEvent.clear(latitude)
    await userEvent.type(latitude, "10.5")
    await save()
    expect(latitude).toHaveAttribute("aria-invalid", "true")
    expect(latitude).toHaveAccessibleDescription(
      "The location must be within Sri Lanka."
    )
    expect(api.callsTo("/pharmacies/me").some((c) => c.method === "put")).toBe(
      false
    )
  })

  it("sends exactly the profile fields, then refreshes and confirms", async () => {
    await renderSettings()
    const name = screen.getByLabelText("Pharmacy name")
    await userEvent.clear(name)
    await userEvent.type(name, "Kandy Care Pharmacy")
    await userEvent.click(screen.getByRole("combobox", { name: "District" }))
    await userEvent.click(await screen.findByRole("option", { name: "Kandy" }))
    await userEvent.clear(screen.getByLabelText("Opening hours (optional)"))
    // Correcting the pin on the map fills the coordinates.
    await userEvent.click(screen.getByRole("button", { name: "fake map" }))
    await save()

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    const put = api.callsTo("/pharmacies/me").find((c) => c.method === "put")
    expect(put?.data).toEqual({
      name: "Kandy Care Pharmacy",
      phone: "0112345678",
      address: "12 Galle Road",
      district: "KANDY",
      city: "Colombo 03",
      latitude: 7.2906,
      longitude: 80.6337,
      openingHours: null,
    })
    expect(toast.success).toHaveBeenCalledWith("Pharmacy details saved.")
    // The profile is fetched again after saving.
    await waitFor(() =>
      expect(
        api.callsTo("/pharmacies/me").filter((c) => c.method === "get")
      ).toHaveLength(2)
    )
  })

  it("shows a server field error under its field", async () => {
    api.restore()
    api = mockApi({
      "/pharmacies/me": ({ method }) =>
        method === "put"
          ? fail(400, "VALIDATION_FAILED", [
              {
                field: "phone",
                code: "NotBlank",
                message: "Phone is required",
              },
            ])
          : profile,
    })
    await renderSettings()
    await save()
    const phone = screen.getByLabelText("Phone number")
    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"))
    expect(phone).toHaveAccessibleDescription("This field is required.")
    expect(screen.getByLabelText("Pharmacy name")).toHaveAttribute(
      "aria-invalid",
      "false"
    )
    // Shown inline, so no banner on top.
    expect(screen.queryByText("Could not save your changes")).toBeNull()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("shows other save errors translated above the button", async () => {
    api.restore()
    api = mockApi({
      "/pharmacies/me": ({ method }) =>
        method === "put" ? fail(409, "CONCURRENT_UPDATE") : profile,
    })
    await renderSettings()
    await save()
    expect(await screen.findByText("Could not save your changes")).toBeVisible()
    expect(screen.getByLabelText("Pharmacy name")).toHaveValue("City Pharmacy")
  })

  it("offers a retry when the profile cannot be loaded", async () => {
    let failing = true
    api.restore()
    api = mockApi({
      "/pharmacies/me": () => (failing ? fail(500, "INTERNAL_ERROR") : profile),
    })
    renderRoutes(
      [{ path: "/pharmacy/settings", component: SettingsPage }],
      "/pharmacy/settings"
    )
    expect(
      await screen.findByText("Your pharmacy could not be loaded")
    ).toBeVisible()
    failing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByDisplayValue("City Pharmacy")).toBeVisible()
  })
})
