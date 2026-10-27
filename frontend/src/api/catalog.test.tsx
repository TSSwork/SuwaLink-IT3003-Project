import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { AxiosAdapter } from "axios"
import { useCategories } from "@/api/catalog"
import { api } from "@/api/client"
import { createQueryClient } from "@/lib/queryClient"

const originalAdapter = api.defaults.adapter
afterEach(() => {
  api.defaults.adapter = originalAdapter
})

describe("useCategories", () => {
  it("loads the public categories", async () => {
    const urls: Array<string | undefined> = []
    const adapter: AxiosAdapter = (config) => {
      urls.push(config.url)
      return Promise.resolve({
        data: { success: true, message: "", data: [{ id: "a", name: "Pain" }] },
        status: 200,
        statusText: "",
        headers: {},
        config,
      })
    }
    api.defaults.adapter = adapter
    const client = createQueryClient()
    const { result } = renderHook(() => useCategories(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(urls).toEqual(["/categories"])
    expect(result.current.data).toEqual([{ id: "a", name: "Pain" }])
  })
})
