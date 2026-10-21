import { z } from "zod"
import { DISTRICTS } from "@/api/types"
import { SRI_LANKA_BOUNDS } from "@/components/map/sriLanka"
import { PASSWORD_MIN_LENGTH } from "@/features/auth/schemas"

/**
 * One zod schema per wizard step, mirroring the backend's
 * PharmacyRegisterRequest. Messages are i18n keys.
 */

const required = z.string().trim().min(1, "validation.required")
const maxLength = (max: number) => required.max(max, "validation.tooLong")

export const ownerStepSchema = z
  .object({
    name: required,
    email: z
      .string()
      .trim()
      .min(1, "validation.required")
      .pipe(z.email("validation.email")),
    phone: required,
    password: z.string().min(PASSWORD_MIN_LENGTH, "validation.passwordLength"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  })
export type OwnerStepValues = z.infer<typeof ownerStepSchema>

export const pharmacyStepSchema = z.object({
  pharmacyName: maxLength(120),
  licenceNo: required,
  address: required,
  // "" while nothing is chosen, so the select starts empty.
  district: z.string().pipe(z.enum(DISTRICTS, "validation.required")),
  city: maxLength(80),
  openingHours: z.string().trim().max(255, "validation.tooLong"),
})
export type PharmacyStepInput = z.input<typeof pharmacyStepSchema>
export type PharmacyStepValues = z.infer<typeof pharmacyStepSchema>

/** A coordinate typed as text, checked against [min, max]. */
const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      // One message per field: the first problem found.
      const n = Number(value)
      const message = !value
        ? "validation.required"
        : !Number.isFinite(n)
          ? "validation.number"
          : n < min || n > max
            ? "validation.coordinatesRange"
            : undefined
      if (message) ctx.addIssue({ code: "custom", message })
    })

export const locationStepSchema = z.object({
  latitude: coordinate(SRI_LANKA_BOUNDS.minLat, SRI_LANKA_BOUNDS.maxLat),
  longitude: coordinate(SRI_LANKA_BOUNDS.minLng, SRI_LANKA_BOUNDS.maxLng),
})
export type LocationStepValues = z.infer<typeof locationStepSchema>

export const reviewStepSchema = z.object({
  acceptTerms: z.boolean().refine((v) => v, "validation.acceptTerms"),
})
export type ReviewStepValues = z.infer<typeof reviewStepSchema>

/** A field error from the server, placed on the step that owns the field. */
export interface StepFieldError {
  field: string
  /** i18n key or already-translated text (see TextField). */
  message: string
}
