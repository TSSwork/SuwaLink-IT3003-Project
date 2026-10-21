import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { MailCheckIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { ResetPasswordValues } from "@/features/auth/schemas"
import { ApiError } from "@/api/client"
import { resetPassword } from "@/api/auth"
import { TextField } from "@/components/forms/TextField"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AuthLayout,
  FormErrorAlert,
  authLinkClass,
} from "@/features/auth/AuthLayout"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import { resetPasswordSchema } from "@/features/auth/schemas"

const route = getRouteApi("/reset-password")
const FIELDS = ["email", "otp", "newPassword"] as const

/** A wrong, expired or used code comes back as a bare VALIDATION_FAILED. */
function isBadCode(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === "VALIDATION_FAILED" &&
    error.fieldErrors.length === 0
  )
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { email } = route.useSearch()
  const navigate = useNavigate()
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email ?? "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const reset = useMutation({
    mutationFn: ({ confirmPassword: _, ...body }: ResetPasswordValues) =>
      resetPassword(body),
    onSuccess: () => {
      toast.success(t("auth.resetSuccess"))
      void navigate({ to: "/login", replace: true })
    },
    onError: (error) => {
      if (isBadCode(error)) {
        form.setError(
          "otp",
          { message: "auth.resetCodeInvalid" },
          { shouldFocus: true }
        )
      } else if (error instanceof ApiError) {
        applyFieldErrors(error.fieldErrors, FIELDS, form.setError, t)
      }
    },
  })

  const error = reset.error
  const banner = error && !isBadCode(error) && !hasFieldErrorFor(error, FIELDS)

  return (
    <AuthLayout
      title={t("auth.resetTitle")}
      description={t("auth.resetBody")}
      footer={
        <div className="flex flex-wrap gap-x-4 text-sm">
          <Link to="/forgot-password" className={authLinkClass}>
            {t("auth.requestNewCode")}
          </Link>
          <Link to="/login" className={authLinkClass}>
            {t("auth.backToSignIn")}
          </Link>
        </div>
      }
    >
      {email && !error && (
        <Alert>
          <MailCheckIcon aria-hidden />
          <AlertDescription className="text-foreground">
            {t("auth.codeSent", { email })}
          </AlertDescription>
        </Alert>
      )}
      {banner && (
        <FormErrorAlert title={t("auth.requestFailed")} error={error} />
      )}
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => reset.mutate(values))}
        className="flex flex-col gap-5"
      >
        <TextField
          control={form.control}
          name="email"
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <TextField
          control={form.control}
          name="otp"
          label={t("auth.otp")}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          className="[&_input]:font-mono [&_input]:tracking-[0.3em]"
        />
        <TextField
          control={form.control}
          name="newPassword"
          label={t("auth.newPassword")}
          description={t("auth.passwordHint")}
          type="password"
          autoComplete="new-password"
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label={t("auth.confirmNewPassword")}
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" disabled={reset.isPending}>
          {reset.isPending ? t("auth.resetting") : t("auth.resetSubmit")}
        </Button>
      </form>
    </AuthLayout>
  )
}
