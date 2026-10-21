import { useEffect, useRef } from "react"
import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import type { StepFieldError } from "@/features/pharmacyRegister/schema"

/** Reports every edit to the wizard, so Back and a reload keep the values. */
export function useReportValues<T extends FieldValues>(
  form: UseFormReturn<T>,
  onChange: (values: T) => void
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    const subscription = form.watch((values) =>
      onChangeRef.current(values as T)
    )
    return () => subscription.unsubscribe()
  }, [form])
}

/** Marks the server's errors on their fields when the step opens. */
export function useServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  errors: ReadonlyArray<StepFieldError> | undefined
) {
  useEffect(() => {
    errors?.forEach(({ field, message }, index) =>
      form.setError(
        field as Path<T>,
        { type: "server", message },
        { shouldFocus: index === 0 }
      )
    )
  }, [form, errors])
}
