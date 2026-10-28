import { useId } from "react"
import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  options: Array<SelectOption>
  /** Shown while nothing is chosen; defaults to "Choose…". */
  placeholder?: string
}

/**
 * Labelled select bound to react-hook-form; the value is a string. Error
 * messages are i18n keys or translated text, like TextField's.
 */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
}: SelectFieldProps<T>) {
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
            <Select
              value={field.value}
              onValueChange={field.onChange}
              name={field.name}
            >
              <SelectTrigger
                id={id}
                ref={field.ref}
                onBlur={field.onBlur}
                className="w-full"
                aria-invalid={fieldState.invalid}
                aria-describedby={message ? errorId : undefined}
              >
                <SelectValue
                  placeholder={placeholder ?? t("pharmacyOwner.suggest.choose")}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
