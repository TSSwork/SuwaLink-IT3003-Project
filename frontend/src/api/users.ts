import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import { getMe } from "@/api/auth"
import type { District, LanguageCode } from "@/api/types"

export const meKey = ["users", "me"] as const

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: () => getMe() })
}

/** PUT /api/users/me/preferences (UpdatePreferencesRequest). */
export interface PreferencesRequest {
  preferredLanguage: LanguageCode
  district: District | null
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: PreferencesRequest) => {
      await api.put("/users/me/preferences", body)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKey }),
  })
}

/** DELETE /api/users/me; the password confirms it (INVALID_PASSWORD otherwise). */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (password: string) => {
      await api.delete("/users/me", { data: { password } })
    },
  })
}
