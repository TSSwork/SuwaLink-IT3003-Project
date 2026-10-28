import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/api/client"
import { publicSettingsKey } from "@/api/settings"
import type {
  AdminDashboard,
  AdminPharmacy,
  AdminSettings,
  AdminUser,
  AccountStatus,
  ApiResponse,
  CatalogMedicine,
  MedicineStatus,
  UpdateAppSettingsRequest,
} from "@/api/types"

/** Everything the admin pages read; any admin change refetches it all. */
export const adminKey = ["admin"] as const

export function useDashboard() {
  return useQuery({
    queryKey: [...adminKey, "dashboard"],
    queryFn: async () =>
      (await api.get<ApiResponse<AdminDashboard>>("/admin/dashboard")).data
        .data,
  })
}

export function useAdminPharmacies() {
  return useQuery({
    queryKey: [...adminKey, "pharmacies"],
    queryFn: async () =>
      (await api.get<ApiResponse<Array<AdminPharmacy>>>("/admin/pharmacies"))
        .data.data,
  })
}

/** Medicine suggestions from pharmacies; every status when `status` is left out. */
export function useAdminSuggestions(status?: MedicineStatus) {
  return useQuery({
    queryKey: [...adminKey, "suggestions", status ?? "ALL"],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<CatalogMedicine>>>(
          "/admin/medicines/suggestions",
          { params: status && { status } }
        )
      ).data.data,
  })
}

/** Refetches every admin query once `mutationFn` succeeds. */
function useAdminMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  { publicSettings = false } = {}
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKey }),
        // The login page lists demo accounts only while demo mode is public.
        publicSettings &&
          queryClient.invalidateQueries({ queryKey: publicSettingsKey }),
      ]),
  })
}

// Approving or rejecting changes the pharmacy and the dashboard counts.
export function useApprovePharmacy() {
  return useAdminMutation((id: string) =>
    api.put(`/admin/pharmacies/${id}/approve`)
  )
}

export function useRejectPharmacy() {
  return useAdminMutation((id: string) =>
    api.put(`/admin/pharmacies/${id}/reject`)
  )
}

export function useAdminSettings() {
  return useQuery({
    queryKey: [...adminKey, "settings"],
    queryFn: async () =>
      (await api.get<ApiResponse<AdminSettings>>("/admin/settings")).data.data,
  })
}

/** Demo mode hides or shows demo pharmacies everywhere, so everything is refetched. */
export function useUpdateSettings() {
  return useAdminMutation(
    (body: UpdateAppSettingsRequest) => api.put("/admin/settings", body),
    { publicSettings: true }
  )
}

/** Deletes and re-seeds the demo data; counts and lists all change. */
export function useResetDemo() {
  return useAdminMutation(() => api.post("/admin/demo/reset"), {
    publicSettings: true,
  })
}

/** Accounts matching `q` (name or email); every account that isn't deleted when `status` is left out. Pass a debounced `q`. */
export function useAdminUsers({
  q,
  status,
}: {
  q?: string
  status?: AccountStatus
}) {
  const query = q?.trim() || undefined
  return useQuery({
    queryKey: [...adminKey, "users", { q: query, status }],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<AdminUser>>>("/admin/users", {
          params: {
            ...(query && { q: query }),
            ...(status && { status }),
          },
        })
      ).data.data,
    // Keeps the list on screen while the next search loads.
    placeholderData: keepPreviousData,
  })
}

// Suspending or deleting changes the list and the dashboard's customer count.
export function useSuspendUser() {
  return useAdminMutation((id: string) => api.put(`/admin/users/${id}/suspend`))
}

export function useReactivateUser() {
  return useAdminMutation((id: string) =>
    api.put(`/admin/users/${id}/reactivate`)
  )
}

/** Anonymises the account; it cannot be restored. */
export function useDeleteUser() {
  return useAdminMutation((id: string) => api.delete(`/admin/users/${id}`))
}
