import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { CustomerRegisterValues } from "@/features/auth/schemas"
import { ApiError } from "@/api/client"
import { registerCustomer } from "@/api/auth"
import { TermsCheckbox } from "@/components/forms/TermsCheckbox"
import { TextField } from "@/components/forms/TextField"
import { Button } from "@/components/ui/button"
import {
  AuthFooterLine,
  AuthLayout,
  FormErrorAlert,
  authLinkClass,
} from "@/features/auth/AuthLayout"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import { customerRegisterSchema } from "@/features/auth/schemas"
import { useSessionStore } from "@/stores/sessionStore"

const FIELDS = ["name", "email", "phone", "password", "acceptTerms"] as const

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)

  const form = useForm<CustomerRegisterValues>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  const signUp = useMutation({
    mutationFn: ({ confirmPassword: _, ...body }: CustomerRegisterValues) =>
      registerCustomer(body),
    // Registration answers with a session token, so the new customer is
    // signed in straight away without a second login request.
    onSuccess: (auth) => {
      setSession(auth.token, { id: auth.id, name: auth.name, role: auth.role })
      void navigate({ to: "/", replace: true })
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return
      if (error.code === "EMAIL_TAKEN") {
        form.setError(
          "email",
          { message: "errors.EMAIL_TAKEN" },
          { shouldFocus: true }
        )
        return
      }
      applyFieldErrors(error.fieldErrors, FIELDS, form.setError, t)
    },
  })

  const error = signUp.error
  const banner =
    error &&
    !hasFieldErrorFor(error, FIELDS) &&
    !(error instanceof ApiError && error.code === "EMAIL_TAKEN")

  return (
    <AuthLayout
      title={t("register.title")}
      description={t("register.subtitle")}
      footer={
        <AuthFooterLine question={t("auth.haveAccount")}>
          <Link to="/login" className={authLinkClass}>
            {t("auth.signIn")}
          </Link>
        </AuthFooterLine>
      }
    >
      {banner && <FormErrorAlert title={t("register.failed")} error={error} />}
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => signUp.mutate(values))}
        className="flex flex-col gap-5"
      >
        <TextField
          control={form.control}
          name="name"
          label={t("register.fullName")}
          autoComplete="name"
        />
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
          name="phone"
          label={t("register.phone")}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
        />
        <TextField
          control={form.control}
          name="password"
          label={t("auth.password")}
          description={t("auth.passwordHint")}
          type="password"
          autoComplete="new-password"
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label={t("register.confirmPassword")}
          type="password"
          autoComplete="new-password"
        />
        <TermsCheckbox control={form.control} name="acceptTerms" />
        <Button type="submit" size="lg" disabled={signUp.isPending}>
          {signUp.isPending ? t("register.submitting") : t("register.submit")}
        </Button>
      </form>
    </AuthLayout>
  )
}
