import { describe, expect, it } from "vitest"
import { ApiError } from "@/api/client"
import { createQueryClient, shouldRetry } from "@/lib/queryClient"

describe("query client", () => {
  it("retries a network error once", () => {
    const error = new ApiError(0, "NETWORK_ERROR", "down")
    expect(shouldRetry(0, error)).toBe(true)
    expect(shouldRetry(1, error)).toBe(false)
  })

  it("never retries 4xx or other errors", () => {
    expect(shouldRetry(0, new ApiError(404, "NOT_FOUND", "x"))).toBe(false)
    expect(shouldRetry(0, new ApiError(500, "UNKNOWN", "x"))).toBe(false)
    expect(shouldRetry(0, new Error("x"))).toBe(false)
  })

  it("keeps data fresh for 30 s", () => {
    expect(createQueryClient().getDefaultOptions().queries?.staleTime).toBe(
      30_000
    )
  })
})
