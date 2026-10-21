/** The part of an API error the display logic needs (Task 4's ApiError fits). */
export interface TranslatableError {
  code?: string
  message?: string
}

type Translate = (key: string, options?: { defaultValue?: string }) => string

/** `errors.<code>` if translated, else the server message, else `errors.UNKNOWN`. */
export function translateError(t: Translate, error: TranslatableError): string {
  if (error.code) {
    const translated = t(`errors.${error.code}`, { defaultValue: "" })
    if (translated) return translated
  }
  return error.message || t("errors.UNKNOWN")
}
