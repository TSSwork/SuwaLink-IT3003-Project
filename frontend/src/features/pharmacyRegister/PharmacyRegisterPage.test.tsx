import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { UserEvent } from "@testing-library/user-event"
import { registerPharmacy } from "@/api/auth"
import { ApiError } from "@/api/client"
import { PharmacyRegisterPage } from "@/features/pharmacyRegister/PharmacyRegisterPage"
import { DRAFT_STORAGE_KEY } from "@/features/pharmacyRegister/draft"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("@/api/auth", () => ({ registerPharmacy: vi.fn() }))
vi.mock("@/components/map/MapView", () => ({
  default: ({ onPick }: { onPick: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => onPick(7.2906, 80.6337)}>
      fake map
    </button>
  ),
}))
const registerMock = vi.mocked(registerPharmacy)

// Each test types through up to four steps (2-4 s alone); allow for a busy
// parallel run instead of the 5 s default.
vi.setConfig({ testTimeout: 20_000 })

function renderWizard() {
  return renderRoutes(
    [
      { path: "/register/pharmacy", component: PharmacyRegisterPage },
      { path: "/login" },
      { path: "/terms" },
      { path: "/privacy" },
    ],
    "/register/pharmacy"
  )
}

const stepHeading = (name: string) =>
  screen.findByRole("heading", { level: 2, name })

async function fillOwner(user: UserEvent) {
  await stepHeading("Your account")
  await user.type(screen.getByLabelText("Full name"), "Nimal Perera")
  await user.type(screen.getByLabelText("Email"), "nimal@example.lk")
  await user.type(screen.getByLabelText("Phone number"), "0771234567")
  await user.type(screen.getByLabelText("Password"), "secret123")
  await user.type(screen.getByLabelText("Confirm password"), "secret123")
  await user.click(screen.getByRole("button", { name: "Next" }))
}

async function fillPharmacy(user: UserEvent) {
  await stepHeading("Pharmacy details")
  await user.type(screen.getByLabelText("Pharmacy name"), "Nimal Pharmacy")
  await user.type(screen.getByLabelText("Licence number"), "NMRA-1234")
  await user.type(screen.getByLabelText("Address"), "12 Temple Road")
  await user.click(screen.getByRole("combobox", { name: "District" }))
  await user.click(await screen.findByRole("option", { name: "Kandy" }))
  await user.type(screen.getByLabelText("City"), "Kandy")
  await user.type(
    screen.getByLabelText("Opening hours (optional)"),
    "Mon–Sat 8:00–21:00"
  )
  await user.click(screen.getByRole("button", { name: "Next" }))
}

async function fillLocation(
  user: UserEvent,
  latitude = "7.2906",
  longitude = "80.6337"
) {
  await stepHeading("Location")
  await user.type(screen.getByLabelText("Latitude"), latitude)
  await user.type(screen.getByLabelText("Longitude"), longitude)
  await user.click(screen.getByRole("button", { name: "Next" }))
}

async function reachReview(user: UserEvent) {
  await fillOwner(user)
  await fillPharmacy(user)
  await fillLocation(user)
  await stepHeading("Review and submit")
}

beforeEach(() => {
  sessionStorage.clear()
  registerMock.mockReset()
})

describe("PharmacyRegisterPage", () => {
  it("shows which of the four steps you are on", async () => {
    renderWizard()
    await stepHeading("Your account")
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()
    const progress = screen.getByRole("list", { name: "Registration progress" })
    const items = within(progress).getAllByRole("listitem")
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveAttribute("aria-current", "step")
    expect(items[0]).toHaveTextContent("Your account")
  })

  it("will not advance while the step is invalid", async () => {
    const user = userEvent.setup()
    renderWizard()
    await stepHeading("Your account")
    await user.click(screen.getByRole("button", { name: "Next" }))

    expect(
      (await screen.findAllByText("This field is required.")).length
    ).toBeGreaterThan(0)
    expect(screen.getByLabelText("Full name")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(
      screen.getByRole("heading", { level: 2, name: "Your account" })
    ).toBeInTheDocument()
  })

  it("validates the pharmacy step, including the district", async () => {
    const user = userEvent.setup()
    renderWizard()
    await fillOwner(user)
    await stepHeading("Pharmacy details")
    await user.click(screen.getByRole("button", { name: "Next" }))

    expect(
      await screen.findByRole("combobox", { name: "District" })
    ).toHaveAttribute("aria-invalid", "true")
    expect(
      screen.getByRole("heading", { level: 2, name: "Pharmacy details" })
    ).toBeInTheDocument()
  })

  it("keeps entered data when going back", async () => {
    const user = userEvent.setup()
    renderWizard()
    await fillOwner(user)
    await stepHeading("Pharmacy details")
    await user.type(screen.getByLabelText("Pharmacy name"), "Half typed")
    await user.click(screen.getByRole("button", { name: "Back" }))

    await stepHeading("Your account")
    expect(screen.getByLabelText("Full name")).toHaveValue("Nimal Perera")
    expect(screen.getByLabelText("Password")).toHaveValue("secret123")
    await user.click(screen.getByRole("button", { name: "Next" }))
    await stepHeading("Pharmacy details")
    expect(screen.getByLabelText("Pharmacy name")).toHaveValue("Half typed")
  })

  it("blocks coordinates outside Sri Lanka", async () => {
    const user = userEvent.setup()
    renderWizard()
    await fillOwner(user)
    await fillPharmacy(user)
    await fillLocation(user, "12.5", "80.1")

    expect(screen.getByLabelText("Latitude")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(
      screen.getAllByText("The location must be within Sri Lanka.").length
    ).toBeGreaterThan(0)
    expect(
      screen.getByRole("heading", { level: 2, name: "Location" })
    ).toBeInTheDocument()
  })

  it("fills the coordinate inputs from the map", async () => {
    const user = userEvent.setup()
    renderWizard()
    await fillOwner(user)
    await fillPharmacy(user)
    await stepHeading("Location")
    await user.click(await screen.findByRole("button", { name: "fake map" }))

    expect(screen.getByLabelText("Latitude")).toHaveValue("7.290600")
    expect(screen.getByLabelText("Longitude")).toHaveValue("80.633700")
  })

  it("submits exactly the backend's fields and thanks the owner", async () => {
    registerMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWizard()
    await reachReview(user)

    const review = screen.getByRole("region", { name: "Review and submit" })
    expect(within(review).getByText("Nimal Pharmacy")).toBeInTheDocument()
    expect(within(review).getByText("NMRA-1234")).toBeInTheDocument()
    expect(within(review).getByText("7.290600, 80.633700")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )
    expect(
      await screen.findByText(
        "You must accept the Terms and the Privacy Policy."
      )
    ).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1))
    expect(registerMock.mock.calls[0][0]).toStrictEqual({
      name: "Nimal Perera",
      email: "nimal@example.lk",
      phone: "0771234567",
      password: "secret123",
      licenceNo: "NMRA-1234",
      address: "12 Temple Road",
      pharmacyName: "Nimal Pharmacy",
      district: "KANDY",
      city: "Kandy",
      latitude: 7.2906,
      longitude: 80.6337,
      openingHours: "Mon–Sat 8:00–21:00",
      acceptTerms: true,
    })
    expect(
      await screen.findByText("Thanks — an admin will review your pharmacy.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("We'll email you when it's approved.")
    ).toBeInTheDocument()
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })

  it("leaves out empty opening hours", async () => {
    registerMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWizard()
    await fillOwner(user)
    await stepHeading("Pharmacy details")
    await user.type(screen.getByLabelText("Pharmacy name"), "Nimal Pharmacy")
    await user.type(screen.getByLabelText("Licence number"), "NMRA-1234")
    await user.type(screen.getByLabelText("Address"), "12 Temple Road")
    await user.click(screen.getByRole("combobox", { name: "District" }))
    await user.click(await screen.findByRole("option", { name: "Kandy" }))
    await user.type(screen.getByLabelText("City"), "Kandy")
    await user.click(screen.getByRole("button", { name: "Next" }))
    await fillLocation(user)
    await stepHeading("Review and submit")
    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1))
    expect(registerMock.mock.calls[0][0]).not.toHaveProperty("openingHours")
  })

  it("puts a taken licence number back on the pharmacy step", async () => {
    registerMock.mockRejectedValue(
      new ApiError(
        409,
        "DUPLICATE",
        "A pharmacy with licence number 'NMRA-1234' already exists",
        []
      )
    )
    const user = userEvent.setup()
    renderWizard()
    await reachReview(user)
    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )

    await stepHeading("Pharmacy details")
    const licence = screen.getByLabelText("Licence number")
    expect(licence).toHaveValue("NMRA-1234")
    expect(licence).toHaveAttribute("aria-invalid", "true")
    expect(licence).toHaveAccessibleDescription(
      "A pharmacy with this licence number is already registered."
    )
  })

  it("puts a taken email back on the account step", async () => {
    registerMock.mockRejectedValue(
      new ApiError(409, "EMAIL_TAKEN", "Email already registered", [])
    )
    const user = userEvent.setup()
    renderWizard()
    await reachReview(user)
    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )

    await stepHeading("Your account")
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "This email is already registered."
    )
  })

  it("shows other failures on the review step", async () => {
    registerMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Network Error", [])
    )
    const user = userEvent.setup()
    renderWizard()
    await reachReview(user)
    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )

    expect(
      await screen.findByText(
        "Cannot reach the server. Check your connection and try again."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 2, name: "Review and submit" })
    ).toBeInTheDocument()
  })

  it("keeps a draft across a reload, but never the password", async () => {
    const user = userEvent.setup()
    const first = renderWizard()
    await fillOwner(user)
    await fillPharmacy(user)
    await stepHeading("Location")

    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? ""
    expect(stored).toContain("Nimal Pharmacy")
    expect(stored).not.toContain("secret123")
    first.unmount()

    renderWizard()
    // Back on step 1, because the password has to be typed again.
    await stepHeading("Your account")
    expect(screen.getByText(/enter your password again/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toHaveValue("Nimal Perera")
    expect(screen.getByLabelText("Password")).toHaveValue("")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.type(screen.getByLabelText("Confirm password"), "secret123")
    await user.click(screen.getByRole("button", { name: "Next" }))
    await stepHeading("Pharmacy details")
    expect(screen.getByLabelText("Pharmacy name")).toHaveValue("Nimal Pharmacy")
    expect(
      screen.getByRole("combobox", { name: "District" })
    ).toHaveTextContent("Kandy")
  })

  it("does not bring a stale submit error back after Back and Review", async () => {
    registerMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Network Error", [])
    )
    const user = userEvent.setup()
    renderWizard()
    await reachReview(user)
    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Submit for verification" })
    )
    const message =
      "Cannot reach the server. Check your connection and try again."
    expect(await screen.findByText(message)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Back" }))
    await stepHeading("Location")
    await user.click(screen.getByRole("button", { name: "Next" }))
    await stepHeading("Review and submit")
    expect(screen.queryByText(message)).not.toBeInTheDocument()
  })

  it("ignores malformed values in a stored draft", async () => {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        owner: { name: 42, email: { a: 1 }, phone: "0771234567", extra: "x" },
        pharmacy: { pharmacyName: "Nimal Pharmacy", district: "Atlantis" },
        location: "nonsense",
      })
    )
    renderWizard()
    await stepHeading("Your account")
    expect(screen.getByLabelText("Full name")).toHaveValue("")
    expect(screen.getByLabelText("Email")).toHaveValue("")
    expect(screen.getByLabelText("Phone number")).toHaveValue("0771234567")
  })
})
