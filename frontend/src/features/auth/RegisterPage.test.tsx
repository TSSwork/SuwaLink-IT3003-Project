import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { registerCustomer } from "@/api/auth"
import { ApiError } from "@/api/client"
import { RegisterPage } from "@/features/auth/RegisterPage"
import { useSessionStore } from "@/stores/sessionStore"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("@/api/auth", () => ({ registerCustomer: vi.fn() }))
const registerMock = vi.mocked(registerCustomer)

function renderRegister() {
  return renderRoutes(
    [
      { path: "/register", component: RegisterPage },
      { path: "/" },
      { path: "/login" },
      { path: "/terms" },
      { path: "/privacy" },
    ],
    "/register"
  )
}

async function fillForm({ acceptTerms }: { acceptTerms: boolean }) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText("Full name"), "Kamala Devi")
  await user.type(screen.getByLabelText("Email"), "kamala@example.lk")
  await user.type(screen.getByLabelText("Phone number"), "0771234567")
  await user.type(screen.getByLabelText("Password"), "secret123")
  await user.type(screen.getByLabelText("Confirm password"), "secret123")
  if (acceptTerms) await user.click(screen.getByRole("checkbox"))
  return user
}

beforeEach(() => {
  useSessionStore.getState().clear()
  registerMock.mockReset()
})

describe("RegisterPage", () => {
  it("links the consent text to the Terms and Privacy pages", async () => {
    renderRegister()
    expect(await screen.findByRole("link", { name: /^Terms/ })).toHaveAttribute(
      "href",
      "/terms"
    )
    expect(
      screen.getByRole("link", { name: /^Privacy Policy/ })
    ).toHaveAttribute("href", "/privacy")
  })

  it("will not submit until the terms are accepted", async () => {
    renderRegister()
    const user = await fillForm({ acceptTerms: false })
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      await screen.findByText(
        "You must accept the Terms and the Privacy Policy."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true")
    expect(registerMock).not.toHaveBeenCalled()
  })

  it("checks the passwords match", async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.type(await screen.findByLabelText("Password"), "secret123")
    await user.type(screen.getByLabelText("Confirm password"), "secret124")
    await user.click(screen.getByRole("button", { name: "Create account" }))
    expect(
      await screen.findByText("The passwords do not match.")
    ).toBeInTheDocument()
  })

  it("signs the new customer in and goes home", async () => {
    registerMock.mockResolvedValue({
      token: "jwt",
      role: "CUSTOMER",
      id: "c1",
      name: "Kamala Devi",
    })
    renderRegister()
    const user = await fillForm({ acceptTerms: true })
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(await screen.findByText("page:/")).toBeInTheDocument()
    expect(registerMock.mock.calls[0]?.[0]).toEqual({
      name: "Kamala Devi",
      email: "kamala@example.lk",
      phone: "0771234567",
      password: "secret123",
      acceptTerms: true,
    })
    expect(useSessionStore.getState().user).toEqual({
      id: "c1",
      name: "Kamala Devi",
      role: "CUSTOMER",
    })
  })

  it("puts a server field error under the right field", async () => {
    registerMock.mockRejectedValue(
      new ApiError(400, "VALIDATION_FAILED", "Validation failed", [
        { field: "phone", code: "NotBlank", message: "Phone is required" },
      ])
    )
    renderRegister()
    const user = await fillForm({ acceptTerms: true })
    await user.click(screen.getByRole("button", { name: "Create account" }))

    const phone = screen.getByLabelText("Phone number")
    expect(
      await screen.findByText("This field is required.")
    ).toBeInTheDocument()
    expect(phone).toHaveAccessibleDescription("This field is required.")
    expect(phone).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "false"
    )
    // Shown inline, so no banner on top of the form.
    expect(
      screen.queryByText("Could not create your account")
    ).not.toBeInTheDocument()
  })

  it("shows a taken email under the email field", async () => {
    registerMock.mockRejectedValue(
      new ApiError(409, "EMAIL_TAKEN", "Email already registered")
    )
    renderRegister()
    const user = await fillForm({ acceptTerms: true })
    await user.click(screen.getByRole("button", { name: "Create account" }))
    expect(
      await screen.findByText("This email is already registered.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "This email is already registered."
    )
  })
})
