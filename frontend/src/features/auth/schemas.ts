import { z } from "zod"

/**
 * Form schemas mirroring the backend bean validation
 * (backend/src/main/java/com/suwalink/dto/request/*). Messages are i18n keys,
 * translated where they are shown, so a language switch re-labels them.
 */

export const PASSWORD_MIN_LENGTH = 8

const required = z.string().trim().min(1, "validation.required")
const email = z
  .string()
  .trim()
  .min(1, "validation.required")
  .pipe(z.email("validation.email"))
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "validation.passwordLength")

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "validation.required"),
})
export type LoginValues = z.infer<typeof loginSchema>

export const customerRegisterSchema = z
  .object({
    name: required,
    email,
    phone: required,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v, "validation.acceptTerms"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  })
export type CustomerRegisterValues = z.infer<typeof customerRegisterSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    email,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "validation.otp"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

/** Search params of /login. */
export interface LoginSearch {
  redirect?: string
  reason?: "expired"
}

export function validateLoginSearch(
  search: Record<string, unknown>
): LoginSearch {
  return {
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    reason: search.reason === "expired" ? "expired" : undefined,
  }
}

/** Search params of /reset-password (the email the code was sent to). */
export interface ResetPasswordSearch {
  email?: string
}

export function validateResetPasswordSearch(
  search: Record<string, unknown>
): ResetPasswordSearch {
  return { email: typeof search.email === "string" ? search.email : undefined }
}
