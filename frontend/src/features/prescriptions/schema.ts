import { z } from "zod"
import { DISTRICTS } from "@/api/types"
import { PRESCRIPTION_MAX_BYTES, PRESCRIPTION_TYPES } from "@/api/prescriptions"

export const NOTE_MAX = 1000

/** Messages are i18n keys. The photo is checked apart (see checkPhoto). */
export const prescriptionSchema = z
  .object({
    patientAge: z
      .string()
      .trim()
      .refine((value) => /^\d{1,3}$/.test(value) && Number(value) <= 120, {
        message: "prescriptions.ageInvalid",
      }),
    note: z.string().max(NOTE_MAX, { message: "validation.tooLong" }),
    targetScope: z.enum(["RADIUS_10KM", "DISTRICT", "ALL"]),
    district: z.enum(DISTRICTS).optional(),
    consent: z.boolean().refine((value) => value, {
      message: "prescriptions.consentRequired",
    }),
  })
  .refine((values) => values.targetScope !== "DISTRICT" || values.district, {
    path: ["district"],
    message: "prescriptions.districtRequired",
  })

export type PrescriptionValues = z.infer<typeof prescriptionSchema>

/** null when the file can be sent, else the i18n key of why not. */
export function checkPhoto(file: File): string | null {
  if (!PRESCRIPTION_TYPES.includes(file.type)) return "prescriptions.photoType"
  if (file.size > PRESCRIPTION_MAX_BYTES) return "prescriptions.photoSize"
  return null
}
