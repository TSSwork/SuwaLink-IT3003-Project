import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api } from "@/api/client"
import type { ApiResponse, Bookmark } from "@/api/types"
import { useSessionStore } from "@/stores/sessionStore"

export const bookmarksKey = ["bookmarks"] as const

/** The signed-in customer's saved offers, newest first; idle for everyone else. */
export function useBookmarks() {
  const isCustomer = useSessionStore(
    (state) => state.user?.role === "CUSTOMER"
  )
  return useQuery({
    queryKey: bookmarksKey,
    queryFn: async () =>
      (await api.get<ApiResponse<Array<Bookmark>>>("/bookmarks")).data.data,
    enabled: isCustomer,
  })
}

/** Saves an offer. Already saved (DUPLICATE) counts as done. */
export function useAddBookmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inventoryId: string) => {
      try {
        await api.post(`/bookmarks/${inventoryId}`)
      } catch (error) {
        if (!(error instanceof ApiError && error.code === "DUPLICATE")) {
          throw error
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookmarksKey }),
  })
}

/** Removes a saved offer; the list drops it straight away. */
export function useRemoveBookmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inventoryId: string) => {
      await api.delete(`/bookmarks/${inventoryId}`)
    },
    onSuccess: (_, inventoryId) =>
      queryClient.setQueryData<Array<Bookmark>>(bookmarksKey, (list) =>
        list?.filter((b) => b.inventory.id !== inventoryId)
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookmarksKey }),
  })
}
