import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ScanPage } from "@/features/pharmacy-owner/ScanPage"
import { useSessionStore } from "@/stores/sessionStore"
import { renderRoutes } from "@/test/renderRoutes"

// The camera and decoding are the library's job; the page decides what a
// decode means and what to tell the pharmacist.
interface FakeScanner {
  onDecode: (result: { data: string }) => void
  options: { preferredCamera?: string }
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

const qr = vi.hoisted(() => {
  const state: {
    instances: Array<FakeScanner>
    /** What start() rejects with, if anything. */
    startError?: unknown
    /** When set, start() waits for it. */
    startGate: Promise<void> | null
    hasCamera: boolean
  } = { instances: [], startGate: null, hasCamera: true }
  return state
})

vi.mock("qr-scanner", () => ({
  default: class FakeQrScanner {
    static hasCamera = () => Promise.resolve(qr.hasCamera)
    start = vi.fn(async () => {
      await qr.startGate
      if (qr.startError) throw qr.startError
    })
    stop = vi.fn()
    destroy = vi.fn()
    constructor(
      _video: HTMLVideoElement,
      public onDecode: (result: { data: string }) => void,
      public options: { preferredCamera?: string }
    ) {
      qr.instances.push(this)
    }
  },
}))

let permission: PermissionState = "granted"

function setBrowser({ secure = true, media = true } = {}) {
  Object.defineProperty(window, "isSecureContext", {
    value: secure,
    configurable: true,
  })
  Object.defineProperty(navigator, "mediaDevices", {
    value: media ? {} : undefined,
    configurable: true,
  })
  Object.defineProperty(navigator, "permissions", {
    value: { query: () => Promise.resolve({ state: permission }) },
    configurable: true,
  })
}

function renderScan() {
  return renderRoutes(
    [{ path: "/pharmacy/scan", component: ScanPage }, { path: "/r/$code" }],
    "/pharmacy/scan"
  )
}

async function startCamera() {
  const user = userEvent.setup()
  const view = renderScan()
  await user.click(await screen.findByRole("button", { name: "Start camera" }))
  return { user, ...view }
}

const scanner = () => qr.instances[0]
const decode = (data: string) => act(() => scanner().onDecode({ data }))

beforeEach(() => {
  qr.instances = []
  qr.startError = undefined
  qr.startGate = null
  qr.hasCamera = true
  permission = "granted"
  setBrowser()
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
})

describe("ScanPage", () => {
  it("starts the rear camera only when asked", async () => {
    renderScan()
    await screen.findByRole("button", { name: "Start camera" })
    expect(qr.instances).toHaveLength(0)

    await userEvent.click(screen.getByRole("button", { name: "Start camera" }))
    await waitFor(() => expect(scanner().start).toHaveBeenCalled())
    expect(scanner().options.preferredCamera).toBe("environment")
    expect(
      await screen.findByRole("button", { name: "Stop camera" })
    ).toBeVisible()
  })

  it("opens the reservation for a scanned pickup QR, inside the app", async () => {
    const { router } = await startCamera()
    await waitFor(() => expect(scanner().start).toHaveBeenCalled())
    decode("https://elsewhere.example/r/k7q2mxh4pa")
    expect(await screen.findByText("page:/r/$code")).toBeVisible()
    expect(router.state.location.pathname).toBe("/r/K7Q2MXH4PA")
    expect(router.state.location.href).toBe("/r/K7Q2MXH4PA")
  })

  it.each([
    "https://elsewhere.example/pay",
    "javascript:/r/K7Q2MXH4PA",
    "K7Q2MXH40A",
  ])("does not navigate for %s, says why and keeps scanning", async (data) => {
    const { router } = await startCamera()
    await waitFor(() => expect(scanner().start).toHaveBeenCalled())
    decode(data)
    expect(
      await screen.findByText(
        "This is not a SuwaLink pickup code. Scan the QR on the customer's reservation, or type the code below."
      )
    ).toBeVisible()
    expect(router.state.location.pathname).toBe("/pharmacy/scan")
    expect(scanner().stop).not.toHaveBeenCalled()
    expect(scanner().destroy).not.toHaveBeenCalled()

    // A good code afterwards still works.
    decode("K7Q2MXH4PA")
    expect(await screen.findByText("page:/r/$code")).toBeVisible()
  })

  it("explains a blocked camera and still takes a typed code", async () => {
    qr.startError = "Camera not found."
    permission = "denied"
    const { user, router } = await startCamera()
    expect(
      await screen.findByText(
        "Camera access is blocked. Allow the camera for this site in your browser settings, or type the code below."
      )
    ).toBeVisible()
    expect(scanner().destroy).toHaveBeenCalled()

    const field = screen.getByLabelText("Pickup code")
    expect(field).toHaveClass("font-mono")
    expect(field).toHaveAttribute("autocapitalize", "characters")
    await user.type(field, "k7q2mxh4pa")
    await user.click(screen.getByRole("button", { name: "Open reservation" }))
    expect(await screen.findByText("page:/r/$code")).toBeVisible()
    expect(router.state.location.pathname).toBe("/r/K7Q2MXH4PA")
  })

  it("explains a missing camera", async () => {
    qr.startError = "Camera not found."
    qr.hasCamera = false
    await startCamera()
    expect(
      await screen.findByText(
        "No camera was found on this device. Type the code below instead."
      )
    ).toBeVisible()
  })

  it.each([
    { secure: false, media: false },
    { secure: false, media: true },
  ])("explains that the camera needs a secure page (%o)", async (browser) => {
    setBrowser(browser)
    await startCamera()
    expect(
      await screen.findByText(
        "The camera works only on a secure (https) page. Type the code below instead."
      )
    ).toBeVisible()
    expect(qr.instances).toHaveLength(0)
  })

  it("checks a typed code before opening it", async () => {
    const user = userEvent.setup()
    const { router } = renderScan()
    const field = await screen.findByLabelText("Pickup code")
    await user.type(field, "https://elsewhere.example/pay")
    await user.click(screen.getByRole("button", { name: "Open reservation" }))
    expect(
      await screen.findByText(
        "Enter the 10-character pickup code shown on the customer's reservation."
      )
    ).toBeVisible()
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(router.state.location.pathname).toBe("/pharmacy/scan")
  })

  it("stops the camera when asked and when leaving the page", async () => {
    const { user, unmount } = await startCamera()
    await user.click(await screen.findByRole("button", { name: "Stop camera" }))
    expect(scanner().destroy).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Start camera" }))
    await waitFor(() => expect(qr.instances[1].start).toHaveBeenCalled())
    await screen.findByRole("button", { name: "Stop camera" })
    unmount()
    expect(qr.instances[1].destroy).toHaveBeenCalled()
  })

  it("stays off when stopped while the camera is still starting", async () => {
    let finishStart = () => {}
    qr.startGate = new Promise((resolve) => (finishStart = resolve))
    const { user } = await startCamera()
    await user.click(await screen.findByRole("button", { name: "Stop camera" }))
    expect(scanner().destroy).toHaveBeenCalled()
    await act(async () => finishStart())
    expect(screen.getByRole("button", { name: "Start camera" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Stop camera" })).toBeNull()
  })

  it("stops a camera that is still starting when the page closes", async () => {
    let finishStart = () => {}
    qr.startGate = new Promise((resolve) => (finishStart = resolve))
    const { unmount } = await startCamera()
    await waitFor(() => expect(scanner().start).toHaveBeenCalled())
    unmount()
    await act(async () => finishStart())
    expect(scanner().destroy).toHaveBeenCalled()
  })
})

afterEach(() => {
  vi.clearAllMocks()
})
