import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthResponse, Role } from "@/api/types"
import { getPublicSettings, login } from "@/api/auth"
import { ApiError } from "@/api/client"
import { LoginPage } from "@/features/auth/LoginPage"
import { validateLoginSearch } from "@/features/auth/schemas"
import { useSessionStore } from "@/stores/sessionStore"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("@/api/auth", () => ({
  login: vi.fn(),
  getPublicSettings: vi.fn(),
}))

const loginMock = vi.mocked(login)
const settingsMock = vi.mocked(getPublicSettings)

function authAs(role: Role): AuthResponse {
  return { token: "jwt", role, id: "u1", name: "Nimal Perera" }
}

function renderLogin(path = "/login") {
  return renderRoutes(
    [
      {
        path: "/login",
        component: LoginPage,
        validateSearch: validateLoginSearch,
      },
      { path: "/" },
      { path: "/pharmacy" },
      { path: "/admin" },
      { path: "/register" },
      { path: "/forgot-password" },
      { path: "/reservations" },
    ],
    path
  )
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText("Email"), email)
  await user.type(screen.getByLabelText("Password"), password)
  await user.click(screen.getByRole("button", { name: "Sign in" }))
  return user
}

beforeEach(() => {
  useSessionStore.getState().clear()
  loginMock.mockReset()
  settingsMock.mockReset()
  settingsMock.mockResolvedValue({ demoModePublic: false, demoAccounts: [] })
})

describe("LoginPage", () => {
  it.each([
    ["CUSTOMER", "/"],
    ["PHARMACY_OWNER", "/pharmacy"],
    ["ADMIN", "/admin"],
  ] as const)("signs a %s in and goes to %s", async (role, home) => {
    loginMock.mockResolvedValue(authAs(role))
    const { router } = renderLogin()
    await fillAndSubmit("nimal@example.lk", "secret123")

    expect(await screen.findByText(`page:${home}`)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(home)
    expect(loginMock.mock.calls[0]?.[0]).toEqual({
      email: "nimal@example.lk",
      password: "secret123",
    })
    expect(useSessionStore.getState()).toMatchObject({
      token: "jwt",
      user: { id: "u1", name: "Nimal Perera", role },
    })
  })

  it("returns to the redirect path, but never off-site", async () => {
    loginMock.mockResolvedValue(authAs("CUSTOMER"))
    const { router } = renderLogin("/login?redirect=%2Freservations%3Fx%3D1")
    await fillAndSubmit("nimal@example.lk", "secret123")
    expect(await screen.findByText("page:/reservations")).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ x: 1 })
  })

  it("ignores an off-site redirect", async () => {
    loginMock.mockResolvedValue(authAs("CUSTOMER"))
    renderLogin("/login?redirect=%2F%2Fevil.example")
    await fillAndSubmit("nimal@example.lk", "secret123")
    expect(await screen.findByText("page:/")).toBeInTheDocument()
  })

  it("shows the awaiting-approval panel for an unverified pharmacy", async () => {
    loginMock.mockRejectedValue(
      new ApiError(403, "PHARMACY_NOT_VERIFIED", "Pharmacy not verified")
    )
    renderLogin()
    await fillAndSubmit("owner@example.lk", "secret123")
    expect(
      await screen.findByText("Your pharmacy is awaiting approval")
    ).toBeInTheDocument()
    expect(screen.queryByText("Could not sign in")).not.toBeInTheDocument()
  })

  it.each([
    [
      "ACCOUNT_SUSPENDED",
      "Your account has been suspended. Please contact support.",
    ],
    ["DEMO_DISABLED", "Demo accounts are currently turned off."],
  ])("shows the translated %s message", async (code, text) => {
    loginMock.mockRejectedValue(new ApiError(403, code, "English message"))
    renderLogin()
    await fillAndSubmit("nimal@example.lk", "secret123")
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it("explains the session expired", async () => {
    renderLogin("/login?reason=expired")
    expect(
      await screen.findByText("Your session has expired. Please sign in again.")
    ).toBeInTheDocument()
  })

  it("fills the form and signs in from a demo button", async () => {
    settingsMock.mockResolvedValue({
      demoModePublic: true,
      demoAccounts: [
        { role: "CUSTOMER", email: "customer1@demo.suwalink.lk", password: "DemoPass123!" },
        { role: "PHARMACY_OWNER", email: "pharmacy1@demo.suwalink.lk", password: "DemoPass123!" },
      ],
    }) // prettier-ignore
    // Held open so the filled form can be inspected before navigation.
    let answer: (auth: AuthResponse) => void = () => {}
    loginMock.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const user = userEvent.setup()
    renderLogin()

    await user.click(
      await screen.findByRole("button", { name: "Demo pharmacy" })
    )

    expect(screen.getByLabelText("Email")).toHaveValue(
      "pharmacy1@demo.suwalink.lk"
    )
    expect(screen.getByLabelText("Password")).toHaveValue("DemoPass123!")
    await waitFor(() =>
      expect(loginMock.mock.calls[0]?.[0]).toEqual({
        email: "pharmacy1@demo.suwalink.lk",
        password: "DemoPass123!",
      })
    )
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled()
    answer(authAs("PHARMACY_OWNER"))
    expect(await screen.findByText("page:/pharmacy")).toBeInTheDocument()
  })

  it("hides the demo card when there are no demo accounts", async () => {
    renderLogin()
    await screen.findByLabelText("Email")
    await waitFor(() => expect(settingsMock).toHaveBeenCalled())
    expect(screen.queryByText("Try the demo")).not.toBeInTheDocument()
  })

  it("keeps the form usable when the backend is unreachable", async () => {
    loginMock.mockRejectedValueOnce(
      new ApiError(0, "NETWORK_ERROR", "Network Error")
    )
    renderLogin()
    const user = await fillAndSubmit("nimal@example.lk", "secret123")

    expect(
      await screen.findByText(
        "Cannot reach the server. Check your connection and try again."
      )
    ).toBeInTheDocument()
    const submit = screen.getByRole("button", { name: "Sign in" })
    expect(submit).toBeEnabled()
    expect(screen.getByLabelText("Email")).toHaveValue("nimal@example.lk")

    loginMock.mockResolvedValueOnce(authAs("CUSTOMER"))
    await user.click(submit)
    expect(await screen.findByText("page:/")).toBeInTheDocument()
  })

  it("validates before calling the API", async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(await screen.findByLabelText("Email"), "not-an-email")
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(
      await screen.findByText("Enter a valid email address.")
    ).toBeInTheDocument()
    expect(screen.getByText("This field is required.")).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })
})
