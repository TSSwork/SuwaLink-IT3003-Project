import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/api/client"
import { useSessionStore } from "@/stores/sessionStore"

/** 4xx and server errors are answers, not blips: only a dropped connection is retried, once. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === "NETWORK_ERROR" &&
    failureCount < 1
  )
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
    },
  })
}

export const queryClient = createQueryClient()

/** Drops cached data when the session ends so the next person never sees it. Returns a cleanup. */
export function startSessionCacheSync(): () => void {
  return useSessionStore.subscribe((state, previous) => {
    if (previous.token && !state.token) queryClient.clear()
  })
}
