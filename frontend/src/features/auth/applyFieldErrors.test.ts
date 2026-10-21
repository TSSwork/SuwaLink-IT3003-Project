import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/api/client"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"

const t = (key: string) =>
  ({ "validation.NotBlank": "Required (translated)" })[key] ?? ""

describe("applyFieldErrors", () => {
  it("marks known fields with the translated code, else the server message", () => {
    const setError = vi.fn()
    const applied = applyFieldErrors(
      [
        { field: "name", code: "NotBlank", message: "Name is required" },
        { field: "phone", code: "Pattern", message: "Phone looks wrong" },
        { field: "unknown", code: "NotBlank", message: "x" },
      ],
      ["name", "phone"],
      setError,
      t
    )
    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenNthCalledWith(
      1,
      "name",
      { type: "server", message: "Required (translated)" },
      { shouldFocus: true }
    )
    expect(setError).toHaveBeenNthCalledWith(
      2,
      "phone",
      { type: "server", message: "Phone looks wrong" },
      { shouldFocus: false }
    )
  })

  it("reports when nothing matched", () => {
    expect(applyFieldErrors([], ["name"], vi.fn(), t)).toBe(false)
  })
})

describe("hasFieldErrorFor", () => {
  it("is true only for an ApiError with an error on a listed field", () => {
    const error = new ApiError(400, "VALIDATION_FAILED", "x", [
      { field: "email", code: "Email", message: "x" },
    ])
    expect(hasFieldErrorFor(error, ["email"])).toBe(true)
    expect(hasFieldErrorFor(error, ["name"])).toBe(false)
    expect(hasFieldErrorFor(new Error("x"), ["email"])).toBe(false)
  })
})
