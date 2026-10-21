import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { forgotPassword, resetPassword } from "@/api/auth"
import { ApiError } from "@/api/client"
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage"
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage"
import { validateResetPasswordSearch } from "@/features/auth/schemas"
import { renderRoutes } from "@/test/renderRoutes"

vi.mock("@/api/auth", () => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const forgotMock = vi.mocked(forgotPassword)
const resetMock = vi.mocked(resetPassword)

function renderFlow(path: string) {
  return renderRoutes(
    [
      { path: "/forgot-password", component: ForgotPasswordPage },
      {
        path: "/reset-password",
        component: ResetPasswordPage,
        validateSearch: validateResetPasswordSearch,
      },
      { path: "/login" },
    ],
    path
  )
}

beforeEach(() => {
  forgotMock.mockReset()
  resetMock.mockReset()
  vi.mocked(toast.success).mockReset()
})

describe("password reset", () => {
  it("requests a code, then opens the reset form with the email filled in", async () => {
    forgotMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderFlow("/forgot-password")
    await user.type(await screen.findByLabelText("Email"), "nimal@example.lk")
    await user.click(screen.getByRole("button", { name: "Send code" }))

    expect(
      await screen.findByRole("heading", { name: "Choose a new password" })
    ).toBeInTheDocument()
    expect(forgotMock).toHaveBeenCalledWith("nimal@example.lk")
    expect(screen.getByLabelText("Email")).toHaveValue("nimal@example.lk")
    expect(
      screen.getByText(/nimal@example\.lk belongs to an account/)
    ).toBeInTheDocument()
  })

  it("changes the password, confirms with a toast and goes to sign in", async () => {
    resetMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderFlow("/reset-password?email=nimal%40example.lk")
    await user.type(await screen.findByLabelText("6-digit code"), "123456")
    await user.type(screen.getByLabelText("New password"), "newsecret1")
    await user.type(screen.getByLabelText("Confirm new password"), "newsecret1")
    await user.click(screen.getByRole("button", { name: "Change password" }))

    expect(await screen.findByText("page:/login")).toBeInTheDocument()
    expect(resetMock).toHaveBeenCalledWith({
      email: "nimal@example.lk",
      otp: "123456",
      newPassword: "newsecret1",
    })
    expect(toast.success).toHaveBeenCalledWith(
      "Password changed. Sign in with your new password."
    )
  })

  it("asks for a 6-digit code", async () => {
    const user = userEvent.setup()
    renderFlow("/reset-password?email=nimal%40example.lk")
    await user.type(await screen.findByLabelText("6-digit code"), "12a")
    await user.click(screen.getByRole("button", { name: "Change password" }))
    expect(
      await screen.findByText("Enter the 6-digit code from the email.")
    ).toBeInTheDocument()
    expect(resetMock).not.toHaveBeenCalled()
  })

  // The backend answers an unknown email exactly like a wrong code.
  const INVALID_CODE = new ApiError(400, "VALIDATION_FAILED", "Invalid code")

  async function submitReset(path: string) {
    const user = userEvent.setup()
    renderFlow(path)
    await user.type(await screen.findByLabelText("6-digit code"), "999999")
    await user.type(screen.getByLabelText("New password"), "newsecret1")
    await user.type(screen.getByLabelText("Confirm new password"), "newsecret1")
    await user.click(screen.getByRole("button", { name: "Change password" }))
  }

  it.each([
    ["a wrong or expired code", "nimal%40example.lk"],
    ["an email with no account", "nobody%40example.lk"],
  ])("shows the same message for %s", async (_, email) => {
    resetMock.mockRejectedValue(INVALID_CODE)
    await submitReset(`/reset-password?email=${email}`)

    await waitFor(() =>
      expect(screen.getByLabelText("6-digit code")).toHaveAccessibleDescription(
        "That code is wrong or has expired. Request a new one."
      )
    )
    expect(screen.queryByText("That did not work")).not.toBeInTheDocument()
  })

  it("reaches the reset screen with a neutral notice for an email with no account", async () => {
    // forgot-password answers the same success whether or not the email exists
    forgotMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderFlow("/forgot-password")
    await user.type(await screen.findByLabelText("Email"), "nobody@example.lk")
    await user.click(screen.getByRole("button", { name: "Send code" }))

    expect(
      await screen.findByText(
        "If nobody@example.lk belongs to an account, a code is on its way. Check your inbox and spam folder."
      )
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveValue("nobody@example.lk")
    expect(screen.queryByText("That did not work")).not.toBeInTheDocument()
  })
})
