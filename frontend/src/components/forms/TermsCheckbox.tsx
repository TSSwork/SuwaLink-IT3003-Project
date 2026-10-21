import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { Controller } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"

/** "I accept the Terms and the Privacy Policy", bound to a boolean form field. */
export function TermsCheckbox<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>
  name: FieldPath<T>
}) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
          <Checkbox
            id={id}
            ref={field.ref}
            name={field.name}
            checked={field.value === true}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
          />
          <FieldContent>
            <FieldLabel htmlFor={id} className="block font-normal">
              <Trans
                i18nKey="register.acceptTerms"
                components={{
                  terms: <LegalLink to="/terms" />,
                  privacy: <LegalLink to="/privacy" />,
                }}
              />
            </FieldLabel>
            {fieldState.error?.message && (
              <FieldError id={errorId}>
                {t(fieldState.error.message)}
              </FieldError>
            )}
          </FieldContent>
        </Field>
      )}
    />
  )
}

/** Opens in a new tab so the half-filled form is not lost. */
function LegalLink({
  to,
  children,
}: {
  to: "/terms" | "/privacy"
  children?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      target="_blank"
      rel="noopener"
      className="font-medium text-primary underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
      <span className="sr-only"> {t("register.opensInNewTab")}</span>
    </Link>
  )
}
