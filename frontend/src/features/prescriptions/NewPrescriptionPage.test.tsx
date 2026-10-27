import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NewPrescriptionPage } from "@/features/prescriptions/NewPrescriptionPage"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"
import { prescriptionRequest } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

let api: ReturnType<typeof mockApi>

const photo = (name = "rx.jpg", type = "image/jpeg", size?: number) => {
  const file = new File(["photo"], name, { type })
  if (size) Object.defineProperty(file, "size", { value: size })
  return file
}

async function renderNew() {
  const view = renderRoutes(
    [
      { path: "/prescriptions/new", component: NewPrescriptionPage },
      { path: "/prescriptions/$id" },
      { path: "/prescriptions" },
    ],
    "/prescriptions/new"
  )
  await screen.findByRole("heading", {
    level: 1,
    name: "Upload a prescription",
  })
  return view
}

const sent = () => api.callsTo("/prescriptions").map((c) => c.data as FormData)

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("Photo of the prescription"), photo())
  await user.type(screen.getByLabelText("Patient's age"), "34")
  await user.click(
    screen.getByRole("checkbox", {
      name: "Share my prescription only with the pharmacies I chose",
    })
  )
}

beforeEach(() => {
  useLocationStore.getState().clear()
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  URL.createObjectURL = vi.fn(() => "blob:preview")
  URL.revokeObjectURL = vi.fn()
  api = mockApi({ "/prescriptions": () => prescriptionRequest({ id: "rx9" }) })
})
afterEach(() => api.restore())

describe("NewPrescriptionPage", () => {
  it("rejects a PDF before uploading", async () => {
    const user = userEvent.setup({ applyAccept: false })
    await renderNew()
    await user.upload(
      screen.getByLabelText("Photo of the prescription"),
      photo("rx.pdf", "application/pdf")
    )
    expect(
      await screen.findByText("Choose a JPG, PNG or WebP photo.")
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Send prescription" }))
    expect(sent()).toEqual([])
  })

  it("rejects a photo over 5 MB before uploading", async () => {
    const user = userEvent.setup()
    await renderNew()
    await user.upload(
      screen.getByLabelText("Photo of the prescription"),
      photo("big.jpg", "image/jpeg", 8 * 1024 * 1024)
    )
    expect(
      await screen.findByText(
        "This photo is larger than 5 MB. Take it again or choose a smaller one."
      )
    ).toBeVisible()
    await user.type(screen.getByLabelText("Patient's age"), "34")
    await user.click(screen.getByRole("button", { name: "Send prescription" }))
    expect(sent()).toEqual([])
  })

  it("shows a preview of the chosen photo", async () => {
    const user = userEvent.setup()
    await renderNew()
    await user.upload(
      screen.getByLabelText("Photo of the prescription"),
      photo()
    )
    expect(
      screen.getByRole("img", { name: "Preview of rx.jpg" })
    ).toHaveAttribute("src", "blob:preview")
  })

  it("picks the photo with a translated button, not the browser's file control", async () => {
    const user = userEvent.setup()
    await renderNew()
    const input = screen.getByLabelText("Photo of the prescription")
    expect(input).toHaveClass("sr-only")
    expect(input).toHaveAttribute("tabindex", "-1")
    expect(screen.getByText("No photo chosen")).toBeVisible()
    const click = vi.spyOn(input, "click")
    await user.click(screen.getByRole("button", { name: "Choose a photo" }))
    expect(click).toHaveBeenCalled()
    await user.upload(input, photo())
    expect(screen.getByText("rx.jpg")).toBeVisible()
  })

  it("defaults the district to the one chosen for searches, even when it arrives later", async () => {
    await renderNew()
    expect(screen.getByRole("radio", { name: /My district/ })).toBeChecked()
    expect(
      screen.getByRole("combobox", { name: "District" })
    ).toHaveTextContent("Choose a district")
    // SessionBootstrap seeds the district after GET /users/me answers.
    act(() => useLocationStore.getState().defaultToDistrict("COLOMBO"))
    expect(
      screen.getByRole("combobox", { name: "District" })
    ).toHaveTextContent("Colombo")
  })

  it("keeps Within 10 km off until a location is set", async () => {
    await renderNew()
    expect(screen.getByRole("radio", { name: /Within 10 km/ })).toBeDisabled()
    expect(
      screen.getByText(
        "Set your location to send it to pharmacies within 10 km."
      )
    ).toBeVisible()
  })

  it("asks for consent and an age", async () => {
    const user = userEvent.setup()
    await renderNew()
    await user.upload(
      screen.getByLabelText("Photo of the prescription"),
      photo()
    )
    await user.click(screen.getByRole("button", { name: "Send prescription" }))
    expect(
      await screen.findByText(
        "Tick the box to agree to share your prescription."
      )
    ).toBeVisible()
    expect(screen.getByText("Enter the patient's age (0–120).")).toBeVisible()
    expect(sent()).toEqual([])
  })

  it("asks for the photo", async () => {
    const user = userEvent.setup()
    await renderNew()
    await user.type(screen.getByLabelText("Patient's age"), "34")
    await user.click(screen.getByRole("button", { name: "Send prescription" }))
    expect(
      await screen.findByText("Add a photo of the prescription.")
    ).toBeVisible()
    expect(sent()).toEqual([])
  })

  it("sends to the district with the exact multipart fields", async () => {
    useLocationStore.getState().setDistrict("KANDY")
    const user = userEvent.setup()
    const { router } = await renderNew()
    expect(screen.getByRole("radio", { name: /My district/ })).toBeChecked()
    await fillValid(user)
    await user.type(
      screen.getByLabelText("Note for the pharmacy (optional)"),
      "Full course"
    )
    await user.click(screen.getByRole("button", { name: "Send prescription" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/prescriptions/rx9")
    )
    const form = sent()[0]
    expect([...form.keys()].sort()).toEqual(
      [
        "consent",
        "district",
        "image",
        "note",
        "patientAge",
        "targetScope",
      ].sort()
    )
    expect(form.get("targetScope")).toBe("DISTRICT")
    expect(form.get("district")).toBe("KANDY")
    expect(form.get("patientAge")).toBe("34")
    expect(form.get("note")).toBe("Full course")
    expect(form.get("consent")).toBe("true")
    expect((form.get("image") as File).name).toBe("rx.jpg")
  })

  it("sends a 10 km request with the chosen point", async () => {
    useLocationStore.getState().setPoint(6.9, 79.86, "device")
    const user = userEvent.setup()
    await renderNew()
    expect(screen.getByRole("radio", { name: /Within 10 km/ })).toBeChecked()
    await fillValid(user)
    await user.click(screen.getByRole("button", { name: "Send prescription" }))
    await waitFor(() => expect(sent()).toHaveLength(1))
    const form = sent()[0]
    expect(form.get("targetScope")).toBe("RADIUS_10KM")
    expect(form.get("latitude")).toBe("6.9")
    expect(form.get("longitude")).toBe("79.86")
    expect(form.has("district")).toBe(false)
  })

  it("offers a wider area when no pharmacy is in scope", async () => {
    useLocationStore.getState().setDistrict("MANNAR")
    api.restore()
    api = mockApi({
      "/prescriptions": ({ data }) =>
        (data as FormData).get("targetScope") === "ALL"
          ? prescriptionRequest({ id: "rx9" })
          : fail(422, "NO_PHARMACIES_IN_SCOPE"),
    })
    const user = userEvent.setup()
    const { router } = await renderNew()
    await fillValid(user)
    await user.click(screen.getByRole("button", { name: "Send prescription" }))
    expect(
      await screen.findByText(
        "There are no verified pharmacies in the chosen area."
      )
    ).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Send to all pharmacies" })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/prescriptions/rx9")
    )
    expect(sent().map((f) => f.get("targetScope"))).toEqual(["DISTRICT", "ALL"])
  })
})
