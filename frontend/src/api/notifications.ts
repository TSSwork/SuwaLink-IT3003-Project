import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ApiResponse, NotificationItem } from "@/api/types"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"

export const notificationsKey = ["notifications"] as const
export const unreadCountKey = [...notificationsKey, "unread-count"] as const

/** Unread badge number; polled every 30 s while the tab is visible. */
export function useUnreadCount() {
  const signedIn = useSessionStore((state) => state.token !== null)
  return useQuery({
    queryKey: unreadCountKey,
    queryFn: async () =>
      (await api.get<ApiResponse<number>>("/notifications/unread-count")).data
        .data,
    enabled: signedIn,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * The list, fetched only while `enabled` (the bell is open). Rendered
 * server-side in the request language, so the language is part of the key:
 * switching it refetches.
 */
export function useNotifications(enabled: boolean) {
  const language = useLanguageStore((state) => state.language)
  return useQuery({
    queryKey: [...notificationsKey, "list", language],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<NotificationItem>>>("/notifications"))
        .data.data,
    enabled,
    // Always fresh when the bell is opened.
    staleTime: 0,
  })
}

function useInvalidateAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: notificationsKey })
}

export function useMarkRead() {
  const invalidate = useInvalidateAfterWrite()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/read`)
    },
    onSuccess: invalidate,
  })
}

export function useMarkAllRead() {
  const invalidate = useInvalidateAfterWrite()
  return useMutation({
    mutationFn: async () => {
      await api.put("/notifications/read-all")
    },
    onSuccess: invalidate,
  })
}
