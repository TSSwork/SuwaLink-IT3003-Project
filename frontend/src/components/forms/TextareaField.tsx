import { useId } from "react"
import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

interface TextareaFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  rows?: number
}

/** Labelled textarea bound to react-hook-form, like TextField. */
export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  rows = 3,
}: TextareaFieldProps<T>) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Textarea
              id={id}
              {...field}
              value={field.value ?? ""}
              rows={rows}
              aria-invalid={fieldState.invalid}
              aria-describedby={message ? errorId : undefined}
            />
            {message && (
              <FieldError id={errorId}>
                {t(message, { defaultValue: message })}
              </FieldError>
            )}
          </Field>
        )
      }}
    />
  )
}
