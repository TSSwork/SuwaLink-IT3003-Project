import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { AxiosAdapter } from "axios"
import { api } from "@/api/client"
import { unreadCountKey, useUnreadCount } from "@/api/notifications"
import { createQueryClient } from "@/lib/queryClient"
import { useSessionStore } from "@/stores/sessionStore"

const originalAdapter = api.defaults.adapter
afterEach(() => {
  api.defaults.adapter = originalAdapter
  useSessionStore.getState().clear()
})

describe("useUnreadCount", () => {
  it("polls every 30 s and not while the tab is hidden", async () => {
    const adapter: AxiosAdapter = (config) =>
      Promise.resolve({
        data: { success: true, message: "", data: 3 },
        status: 200,
        statusText: "",
        headers: {},
        config,
      })
    api.defaults.adapter = adapter
    useSessionStore
      .getState()
      .setSession("t", { id: "1", name: "N", role: "CUSTOMER" })
    const client = createQueryClient()
    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await waitFor(() => expect(result.current.data).toBe(3))
    const options = client.getQueryCache().find({ queryKey: unreadCountKey })!
      .observers[0].options
    expect(options.refetchInterval).toBe(30_000)
    expect(options.refetchIntervalInBackground).toBe(false)
  })
})
