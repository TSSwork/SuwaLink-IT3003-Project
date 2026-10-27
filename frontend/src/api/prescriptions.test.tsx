import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { ApiError } from "@/api/client"
import { usePrescriptionImage } from "@/api/prescriptions"
import { createQueryClient } from "@/lib/queryClient"
import { useSessionStore } from "@/stores/sessionStore"
import { mockApi, raw } from "@/test/mockApi"

let api: ReturnType<typeof mockApi>

function renderImage(imageUrl: string) {
  const client = createQueryClient()
  return renderHook(() => usePrescriptionImage(imageUrl), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "u1", name: "Nimal", role: "CUSTOMER" })
  URL.createObjectURL = vi.fn(() => "blob:rx")
  URL.revokeObjectURL = vi.fn()
  api = mockApi({
    "/images/img1/content": () => raw(new Blob(["image"])),
  })
})
afterEach(() => {
  api.restore()
  useSessionStore.getState().clear()
})

describe("usePrescriptionImage", () => {
  it("fetches an /api/ image with the token", async () => {
    const { result } = renderImage("/api/images/img1/content")
    await waitFor(() => expect(result.current.src).toBe("blob:rx"))
    expect(api.callsTo("/images/img1/content")[0].authorization).toBe(
      "Bearer t"
    )
  })

  it.each([
    "https://elsewhere.example/images/img1/content",
    "//elsewhere.example/api/images/img1",
    "/images/img1/content",
  ])("never sends the token to %s", async (imageUrl) => {
    const { result } = renderImage(imageUrl)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(api.calls).toEqual([])
  })
})
