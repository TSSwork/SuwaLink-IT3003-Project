import { z } from "zod"
import type { PharmacyProfile, UpdatePharmacyProfileRequest } from "@/api/types"
import { DISTRICTS } from "@/api/types"
import { locationStepSchema } from "@/features/pharmacyRegister/schema"

/**
 * Mirrors UpdatePharmacyProfileRequest; field names match the DTO so server
 * field errors land on them. Messages are i18n keys. Coordinates are typed as
 * text, checked like the registration wizard's (within Sri Lanka).
 */
const required = z.string().trim().min(1, "validation.required")

export const pharmacyProfileSchema = z.object({
  name: required.max(120, "validation.tooLong"),
  phone: required,
  address: required,
  district: z.string().pipe(z.enum(DISTRICTS, "validation.required")),
  city: required.max(80, "validation.tooLong"),
  openingHours: z.string().trim().max(255, "validation.tooLong"),
  ...locationStepSchema.shape,
})
export type PharmacyProfileInput = z.input<typeof pharmacyProfileSchema>
export type PharmacyProfileValues = z.infer<typeof pharmacyProfileSchema>

export const PROFILE_FIELDS = [
  "name",
  "phone",
  "address",
  "district",
  "city",
  "openingHours",
  "latitude",
  "longitude",
] as const satisfies ReadonlyArray<keyof PharmacyProfileInput>

export function toFormValues(profile: PharmacyProfile): PharmacyProfileInput {
  return {
    name: profile.name,
    phone: profile.phone ?? "",
    address: profile.address,
    district: profile.district,
    city: profile.city,
    openingHours: profile.openingHours ?? "",
    latitude: profile.latitude.toFixed(6),
    longitude: profile.longitude.toFixed(6),
  }
}

/** The PUT body: every DTO field, nothing else; blank opening hours clear them. */
export function toRequest(
  values: PharmacyProfileValues
): UpdatePharmacyProfileRequest {
  return {
    name: values.name,
    phone: values.phone,
    address: values.address,
    district: values.district,
    city: values.city,
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    openingHours: values.openingHours || null,
  }
}
