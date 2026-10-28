import { QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { pharmacyOwnerKey } from "@/api/pharmacyOwner"
import {
  reservationsKey,
  useCancelReservation,
  useCompleteReservation,
} from "@/api/reservations"
import { createQueryClient } from "@/lib/queryClient"
import { useSessionStore } from "@/stores/sessionStore"
import { reservation } from "@/test/fixtures"
import { mockApi } from "@/test/mockApi"

let api: ReturnType<typeof mockApi>

function setup<T>(useHook: () => T) {
  const client = createQueryClient()
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const view = renderHook(useHook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  const invalidatedKeys = () =>
    invalidate.mock.calls.map(([filters]) => filters?.queryKey)
  return { ...view, invalidatedKeys }
}

beforeEach(() => {
  useSessionStore
    .getState()
    .setSession("t", { id: "o1", name: "Kamal", role: "PHARMACY_OWNER" })
  api = mockApi({
    "/reservations/r1/complete": () => reservation({ status: "COMPLETED" }),
    "/reservations/r1/cancel": () => reservation({ status: "CANCELLED" }),
  })
})
afterEach(() => {
  api.restore()
  useSessionStore.getState().clear()
})

describe("reservation changes", () => {
  it("refreshes the pharmacy's lists after Mark as collected", async () => {
    const { result, invalidatedKeys } = setup(useCompleteReservation)
    await act(() => result.current.mutateAsync("r1"))
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([reservationsKey, pharmacyOwnerKey])
    )
  })

  it("refreshes the pharmacy's lists after a cancel", async () => {
    const { result, invalidatedKeys } = setup(useCancelReservation)
    await act(() => result.current.mutateAsync({ id: "r1" }))
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([reservationsKey, pharmacyOwnerKey])
    )
  })
})
