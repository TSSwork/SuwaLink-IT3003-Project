import { useTranslation } from "react-i18next"
import type { Control } from "react-hook-form"
import type {
  MedicineMasterInput,
  MedicineMasterValues,
} from "@/components/medicine/medicineMasterSchema"
import type { SelectOption } from "@/components/forms/SelectField"
import { LEGAL_CATEGORIES, UNITS_OF_MEASURE } from "@/api/types"
import { SelectField } from "@/components/forms/SelectField"
import { TextField } from "@/components/forms/TextField"
import { TextareaField } from "@/components/forms/TextareaField"

interface MedicineMasterFieldsProps {
  control: Control<MedicineMasterInput, unknown, MedicineMasterValues>
  categories: Array<SelectOption>
  manufacturers: Array<SelectOption>
}

/** The fields of a MedicineMasterRequest: a pharmacy's suggestion or an admin's catalog entry. */
export function MedicineMasterFields({
  control,
  categories,
  manufacturers,
}: MedicineMasterFieldsProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={control}
          name="brandName"
          label={t("pharmacyOwner.suggest.brandName")}
          autoComplete="off"
        />
        <TextField
          control={control}
          name="genericName"
          label={t("pharmacyOwner.suggest.genericName")}
          autoComplete="off"
        />
        <TextField
          control={control}
          name="dosageForm"
          label={t("pharmacyOwner.suggest.dosageForm")}
          description={t("pharmacyOwner.suggest.dosageFormHint")}
          autoComplete="off"
        />
        <TextField
          control={control}
          name="strength"
          label={t("pharmacyOwner.suggest.strength")}
          description={t("pharmacyOwner.suggest.strengthHint")}
          autoComplete="off"
        />
        <SelectField
          control={control}
          name="unitOfMeasure"
          label={t("pharmacyOwner.suggest.unitOfMeasure")}
          options={UNITS_OF_MEASURE.map((unit) => ({
            value: unit,
            label: t(`pharmacyOwner.suggest.units.${unit}`),
          }))}
        />
        <SelectField
          control={control}
          name="legalCategory"
          label={t("pharmacyOwner.suggest.legalCategory")}
          options={LEGAL_CATEGORIES.map((category) => ({
            value: category,
            label: t(`pharmacyOwner.suggest.legal.${category}`),
          }))}
        />
        <SelectField
          control={control}
          name="therapeuticCategoryId"
          label={t("pharmacyOwner.suggest.category")}
          options={categories}
        />
        <SelectField
          control={control}
          name="manufacturerId"
          label={t("pharmacyOwner.suggest.manufacturer")}
          options={manufacturers}
        />
      </div>
      <TextareaField
        control={control}
        name="description"
        label={t("pharmacyOwner.suggest.description")}
      />
    </>
  )
}
