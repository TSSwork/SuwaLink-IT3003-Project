import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { ApiError } from "@/api/client"
import type { ApiFieldError } from "@/api/types"

type Translate = (key: string, options?: { defaultValue?: string }) => string

/**
 * Puts the server's field errors under the matching form fields. The text is
 * `validation.<code>` (the constraint name, e.g. `NotBlank`) when translated,
 * else the server message. Returns true when at least one field was marked;
 * errors for fields the form does not have are left to the caller's banner.
 */
export function applyFieldErrors<T extends FieldValues>(
  fieldErrors: Array<ApiFieldError>,
  fields: ReadonlyArray<Path<T>>,
  setError: UseFormSetError<T>,
  t: Translate
): boolean {
  let applied = false
  for (const error of fieldErrors) {
    const field = fields.find((name) => name === error.field)
    if (!field) continue
    const message =
      t(`validation.${error.code}`, { defaultValue: "" }) || error.message
    setError(field, { type: "server", message }, { shouldFocus: !applied })
    applied = true
  }
  return applied
}

/** True when `error` carries a field error for one of `fields` (shown inline, not in a banner). */
export function hasFieldErrorFor(
  error: unknown,
  fields: ReadonlyArray<string>
): boolean {
  return (
    error instanceof ApiError &&
    error.fieldErrors.some((fieldError) => fields.includes(fieldError.field))
  )
}
