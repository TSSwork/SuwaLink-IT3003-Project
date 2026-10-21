import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { ForgotPasswordValues } from "@/features/auth/schemas"
import { ApiError } from "@/api/client"
import { forgotPassword } from "@/api/auth"
import { TextField } from "@/components/forms/TextField"
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
import { forgotPasswordSchema } from "@/features/auth/schemas"

const FIELDS = ["email"] as const

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const request = useMutation({
    mutationFn: ({ email }: ForgotPasswordValues) => forgotPassword(email),
    onSuccess: (_, { email }) => {
      void navigate({ to: "/reset-password", search: { email } })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        applyFieldErrors(error.fieldErrors, FIELDS, form.setError, t)
      }
    },
  })

  const error = request.error
  return (
    <AuthLayout
      title={t("auth.forgotTitle")}
      description={t("auth.forgotBody")}
      footer={
        <Link to="/login" className={`${authLinkClass} self-start text-sm`}>
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      {error && !hasFieldErrorFor(error, FIELDS) && (
        <FormErrorAlert title={t("auth.requestFailed")} error={error} />
      )}
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => request.mutate(values))}
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
        <Button type="submit" size="lg" disabled={request.isPending}>
          {request.isPending ? t("auth.sendingCode") : t("auth.sendCode")}
        </Button>
      </form>
    </AuthLayout>
  )
}
