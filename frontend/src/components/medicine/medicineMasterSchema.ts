import { z } from "zod"
import type { CatalogMedicine, MedicineMasterRequest } from "@/api/types"
import { LEGAL_CATEGORIES, UNITS_OF_MEASURE } from "@/api/types"

/**
 * Mirrors MedicineMasterRequest: the @NotBlank / @NotNull fields are required;
 * 255 is the column length. Field names match the DTO so server field errors
 * land on them. Messages are i18n keys.
 */
const text = z
  .string()
  .trim()
  .min(1, "validation.required")
  .max(255, "validation.tooLong")
const chosen = z.string().min(1, "validation.required")

export const medicineMasterSchema = z.object({
  brandName: text,
  genericName: text,
  dosageForm: text,
  strength: text,
  unitOfMeasure: z
    .string()
    .pipe(z.enum(UNITS_OF_MEASURE, "validation.required")),
  description: z.string().trim(),
  therapeuticCategoryId: chosen,
  manufacturerId: chosen,
  legalCategory: z
    .string()
    .pipe(z.enum(LEGAL_CATEGORIES, "validation.required")),
})
export type MedicineMasterInput = z.input<typeof medicineMasterSchema>
export type MedicineMasterValues = z.infer<typeof medicineMasterSchema>

/** The form's fields, for placing server field errors. */
export const MEDICINE_MASTER_FIELDS = [
  "brandName",
  "genericName",
  "dosageForm",
  "strength",
  "unitOfMeasure",
  "description",
  "therapeuticCategoryId",
  "manufacturerId",
  "legalCategory",
] as const satisfies ReadonlyArray<keyof MedicineMasterInput>

export const EMPTY_MEDICINE_MASTER: MedicineMasterInput = {
  brandName: "",
  genericName: "",
  dosageForm: "",
  strength: "",
  unitOfMeasure: "",
  description: "",
  therapeuticCategoryId: "",
  manufacturerId: "",
  legalCategory: "",
}

/** The form filled in from an existing medicine, for editing it. */
export function medicineMasterInput(
  medicine: CatalogMedicine
): MedicineMasterInput {
  return {
    brandName: medicine.brandName,
    genericName: medicine.genericName,
    dosageForm: medicine.dosageForm,
    strength: medicine.strength,
    unitOfMeasure: medicine.unitOfMeasure,
    description: medicine.description ?? "",
    therapeuticCategoryId: medicine.therapeuticCategoryId,
    manufacturerId: medicine.manufacturerId,
    legalCategory: medicine.legalCategory,
  }
}

export function toMedicineMasterRequest(
  values: MedicineMasterValues
): MedicineMasterRequest {
  return { ...values, description: values.description || null }
}
