import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  ApiResponse,
  District,
  PrescriptionReply,
  PrescriptionRequest,
  TargetScope,
} from "@/api/types"
import { useSessionStore } from "@/stores/sessionStore"

export const prescriptionsKey = ["prescriptions"] as const

/** Backend limit (spring.servlet.multipart.max-file-size). */
export const PRESCRIPTION_MAX_BYTES = 5 * 1024 * 1024
export const PRESCRIPTION_TYPES = ["image/jpeg", "image/png", "image/webp"]

export interface CreatePrescriptionInput {
  image: File
  patientAge: number
  note?: string
  targetScope: TargetScope
  latitude?: number
  longitude?: number
  district?: District
  consent: boolean
}

/** Multipart parts named exactly as CreatePrescriptionRequest's fields. */
export function toFormData(input: CreatePrescriptionInput): FormData {
  const form = new FormData()
  form.append("image", input.image)
  form.append("patientAge", String(input.patientAge))
  if (input.note) form.append("note", input.note)
  form.append("targetScope", input.targetScope)
  if (input.targetScope === "RADIUS_10KM") {
    form.append("latitude", String(input.latitude))
    form.append("longitude", String(input.longitude))
  }
  if (input.targetScope === "DISTRICT" && input.district) {
    form.append("district", input.district)
  }
  form.append("consent", String(input.consent))
  return form
}

/** Uploads a prescription; `onProgress` gets 0–100 while the image is sent. */
export function useCreatePrescription(onProgress?: (percent: number) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePrescriptionInput) =>
      (
        await api.post<ApiResponse<PrescriptionRequest>>(
          "/prescriptions",
          toFormData(input),
          {
            onUploadProgress: (event) => {
              if (event.total) {
                onProgress?.(Math.round((event.loaded / event.total) * 100))
              }
            },
          }
        )
      ).data.data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: prescriptionsKey }),
  })
}

function useIsCustomer() {
  return useSessionStore((state) => state.user?.role === "CUSTOMER")
}

export function useMyPrescriptions() {
  const isCustomer = useIsCustomer()
  return useQuery({
    queryKey: [...prescriptionsKey, "mine"],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<PrescriptionRequest>>>(
          "/prescriptions/me"
        )
      ).data.data,
    enabled: isCustomer,
  })
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: [...prescriptionsKey, id],
    queryFn: async () =>
      (await api.get<ApiResponse<PrescriptionRequest>>(`/prescriptions/${id}`))
        .data.data,
  })
}

export function usePrescriptionResponses(id: string, enabled = true) {
  return useQuery({
    queryKey: [...prescriptionsKey, id, "responses"],
    queryFn: async () =>
      (
        await api.get<ApiResponse<Array<PrescriptionReply>>>(
          `/prescriptions/${id}/responses`
        )
      ).data.data,
    enabled,
  })
}

export function useClosePrescription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await api.patch<ApiResponse<PrescriptionRequest>>(
          `/prescriptions/${id}/close`
        )
      ).data.data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: prescriptionsKey }),
  })
}

export function useDeletePrescription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/prescriptions/${id}`)
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [...prescriptionsKey, id] })
      return queryClient.invalidateQueries({
        queryKey: [...prescriptionsKey, "mine"],
      })
    },
  })
}

/** The client's baseURL already ends in /api. */
function apiPath(url: string): string {
  return url.replace(/^\/api(?=\/)/, "")
}

/**
 * The private prescription image as an object URL. It is fetched with the
 * token (never a plain <img src>) and the URL is revoked when it changes or
 * the component unmounts.
 */
export function usePrescriptionImage(imageUrl: string | undefined) {
  const image = useQuery({
    queryKey: [...prescriptionsKey, "image", imageUrl],
    queryFn: async () =>
      (
        await api.get<Blob>(apiPath(imageUrl ?? ""), {
          responseType: "blob",
        })
      ).data,
    enabled: imageUrl !== undefined,
    // Sensitive: keep it in memory only while shown.
    gcTime: 0,
    staleTime: Infinity,
  })
  const [src, setSrc] = useState<string>()
  const blob = image.data
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setSrc(url)
    return () => {
      URL.revokeObjectURL(url)
      setSrc(undefined)
    }
  }, [blob])
  return { ...image, src }
}
