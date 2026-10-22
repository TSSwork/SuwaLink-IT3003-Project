import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { useMedicine, useMedicineSearch, useOffers } from "@/api/medicines"
import { createQueryClient } from "@/lib/queryClient"
import { mockApi } from "@/test/mockApi"
import { searchResult } from "@/test/fixtures"

let api: ReturnType<typeof mockApi> | undefined
afterEach(() => api?.restore())

function wrapper() {
  const client = createQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe("medicine queries", () => {
  it("searches with only the given parameters", async () => {
    api = mockApi({
      "/medicines/search": () => ({
        content: [searchResult()],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    })
    const { result } = renderHook(
      () => useMedicineSearch({ q: "pan", district: "GALLE", page: 0, size: 20 }),
      { wrapper: wrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.calls).toEqual([
      {
        method: "get",
        url: "/medicines/search",
        params: { q: "pan", district: "GALLE", page: 0, size: 20 },
      },
    ])
    expect(result.current.data?.content[0].brandName).toBe("Panadol")
  })

  it("loads one medicine and its offers", async () => {
    api = mockApi({
      "/medicines/m1": () => ({ medicineId: "m1", brandName: "Panadol" }),
      "/medicines/m1/offers": () => [],
    })
    const medicine = renderHook(() => useMedicine("m1"), { wrapper: wrapper() })
    const offers = renderHook(
      () => useOffers("m1", { lat: 6.9, lng: 79.8, sort: "price" }),
      { wrapper: wrapper() }
    )
    await waitFor(() => expect(medicine.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(offers.result.current.isSuccess).toBe(true))
    expect(api.callsTo("/medicines/m1/offers")[0].params).toEqual({
      lat: 6.9,
      lng: 79.8,
      sort: "price",
    })
  })
})
