import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/api/client"
import { publicSettingsKey } from "@/api/settings"
import type {
  AdminCategory,
  AdminDashboard,
  AdminManufacturer,
  AdminPharmacy,
  AdminSettings,
  AdminUser,
  AccountStatus,
  ApiResponse,
  CatalogMedicine,
  CategoryRequest,
  ManufacturerRequest,
  MedicineMasterRequest,
  MedicineStatus,
  RejectMedicineRequest,
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

interface AdminMutationOptions<TArgs> {
  /** Also refetch the public settings the login page reads. */
  publicSettings?: boolean
  /**
   * Runs on success before the refetch. Unlike a `mutate(…, { onSuccess })`
   * callback it still runs when the refetch removes the row that started it.
   */
  onSuccess?: (args: TArgs) => void
  /** Refetch after a failure too, e.g. when someone else got there first. */
  refetchOnError?: boolean
}

/** Refetches every admin query once `mutationFn` succeeds. */
function useAdminMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  {
    publicSettings = false,
    onSuccess,
    refetchOnError = false,
  }: AdminMutationOptions<TArgs> = {}
) {
  const queryClient = useQueryClient()
  const refetch = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKey }),
      // The login page lists demo accounts only while demo mode is public.
      publicSettings &&
        queryClient.invalidateQueries({ queryKey: publicSettingsKey }),
    ])
  return useMutation({
    mutationFn,
    onSuccess: (_data, args) => {
      onSuccess?.(args)
      return refetch()
    },
    // Not awaited: the caller's error message must not wait for (or be
    // dropped by) a refetch that may remove the row.
    onError: () => {
      if (refetchOnError) void refetch()
    },
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

/** What each catalog list holds and what its add and edit forms send. */
interface CatalogEntries {
  medicines: { entry: CatalogMedicine; request: MedicineMasterRequest }
  categories: { entry: AdminCategory; request: CategoryRequest }
  manufacturers: { entry: AdminManufacturer; request: ManufacturerRequest }
}
export type CatalogKind = keyof CatalogEntries
export type CatalogRequest<TKind extends CatalogKind> =
  CatalogEntries[TKind]["request"]

/** Every entry of one catalog list, in any status and active or not. */
export function useAdminCatalog<TKind extends CatalogKind>(kind: TKind) {
  return useQuery({
    queryKey: [...adminKey, "catalog", kind],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<CatalogEntries[TKind]["entry"]>>>(
          `/admin/${kind}`
        )
      ).data.data,
  })
}

/** Adds an entry, or replaces the one with `id`. */
export function useSaveCatalogEntry<TKind extends CatalogKind>(kind: TKind) {
  return useAdminMutation(
    ({ id, body }: { id?: string; body: CatalogEntries[TKind]["request"] }) =>
      id
        ? api.put(`/admin/${kind}/${id}`, body)
        : api.post(`/admin/${kind}`, body)
  )
}

/** Deletes an entry; DATA_CONFLICT while medicines or stock still use it. */
export function useDeleteCatalogEntry(
  kind: CatalogKind,
  options: Pick<AdminMutationOptions<string>, "onSuccess"> = {}
) {
  return useAdminMutation(
    (id: string) => api.delete(`/admin/${kind}/${id}`),
    options
  )
}

// A suggestion someone else already reviewed answers ALREADY_REVIEWED; the
// refetch then shows where it went.
export function useApproveSuggestion(
  options: Pick<AdminMutationOptions<string>, "onSuccess"> = {}
) {
  return useAdminMutation(
    (id: string) => api.put(`/admin/medicines/suggestions/${id}/approve`),
    { ...options, refetchOnError: true }
  )
}

export function useRejectSuggestion(
  options: Pick<
    AdminMutationOptions<{ id: string } & RejectMedicineRequest>,
    "onSuccess"
  > = {}
) {
  return useAdminMutation(
    ({ id, reason }: { id: string } & RejectMedicineRequest) =>
      api.put(`/admin/medicines/suggestions/${id}/reject`, { reason }),
    { ...options, refetchOnError: true }
  )
}
