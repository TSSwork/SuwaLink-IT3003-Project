import { useId } from "react"
import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { ComponentProps } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type InputProps = Omit<
  ComponentProps<"input">,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur"
>

interface TextFieldProps<T extends FieldValues> extends InputProps {
  control: Control<T>
  name: FieldPath<T>
  label: string
  /** Hint under the input, replaced by the error while invalid. */
  description?: string
}

/**
 * Labelled input bound to react-hook-form. Error messages are i18n keys (zod)
 * or already-translated text (server, see applyFieldErrors); both go through
 * t() with the text itself as the fallback.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  ...inputProps
}: TextFieldProps<T>) {
  const { t } = useTranslation()
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message
        const describedBy = message ? errorId : description ? hintId : undefined
        return (
          <Field data-invalid={fieldState.invalid} className={className}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
              id={id}
              {...inputProps}
              {...field}
              value={field.value ?? ""}
              aria-invalid={fieldState.invalid}
              aria-describedby={describedBy}
            />
            {message ? (
              <FieldError id={errorId}>
                {t(message, { defaultValue: message })}
              </FieldError>
            ) : (
              description && (
                <FieldDescription id={hintId}>{description}</FieldDescription>
              )
            )}
          </Field>
        )
      }}
    />
  )
}
