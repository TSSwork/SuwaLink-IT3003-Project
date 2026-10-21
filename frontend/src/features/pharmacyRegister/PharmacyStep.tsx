import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type {
  PharmacyStepInput,
  PharmacyStepValues,
  StepFieldError,
} from "@/features/pharmacyRegister/schema"
import type { Control } from "react-hook-form"
import { DistrictSelect } from "@/components/forms/DistrictSelect"
import { TextField } from "@/components/forms/TextField"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { StepNav } from "@/features/pharmacyRegister/StepFrame"
import { pharmacyStepSchema } from "@/features/pharmacyRegister/schema"
import {
  useReportValues,
  useServerErrors,
} from "@/features/pharmacyRegister/stepForm"

interface PharmacyStepProps {
  values: PharmacyStepInput
  serverErrors?: ReadonlyArray<StepFieldError>
  onChange: (values: PharmacyStepInput) => void
  onNext: (values: PharmacyStepValues) => void
  onBack: () => void
}

export function PharmacyStep({
  values,
  serverErrors,
  onChange,
  onNext,
  onBack,
}: PharmacyStepProps) {
  const { t } = useTranslation()
  const form = useForm<PharmacyStepInput, unknown, PharmacyStepValues>({
    resolver: zodResolver(pharmacyStepSchema),
    defaultValues: values,
  })
  useReportValues(form, onChange)
  useServerErrors(form, serverErrors)

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onNext)}
      className="flex flex-col gap-5"
    >
      <TextField
        control={form.control}
        name="pharmacyName"
        label={t("pharmacyRegister.pharmacyName")}
        autoComplete="organization"
      />
      <TextField
        control={form.control}
        name="licenceNo"
        label={t("pharmacyRegister.licenceNumber")}
        autoComplete="off"
        spellCheck={false}
        className="[&_input]:font-mono"
      />
      <TextField
        control={form.control}
        name="address"
        label={t("pharmacyRegister.address")}
        autoComplete="street-address"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <DistrictField control={form.control} />
        <TextField
          control={form.control}
          name="city"
          label={t("pharmacyRegister.city")}
          autoComplete="address-level2"
        />
      </div>
      <TextField
        control={form.control}
        name="openingHours"
        label={t("pharmacyRegister.openingHours")}
        description={t("pharmacyRegister.openingHoursHint")}
      />
      <StepNav onBack={onBack} />
    </form>
  )
}

function DistrictField({
  control,
}: {
  control: Control<PharmacyStepInput, unknown, PharmacyStepValues>
}) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      control={control}
      name="district"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{t("pharmacyRegister.district")}</FieldLabel>
          <DistrictSelect
            id={id}
            ref={field.ref}
            name={field.name}
            value={field.value as PharmacyStepValues["district"] | ""}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
          />
          {fieldState.error?.message && (
            <FieldError id={errorId}>{t(fieldState.error.message)}</FieldError>
          )}
        </Field>
      )}
    />
  )
}
