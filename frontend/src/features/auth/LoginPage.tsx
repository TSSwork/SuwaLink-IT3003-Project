import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { FlaskConicalIcon, HourglassIcon, InfoIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { DemoAccount } from "@/api/types"
import type { LoginValues } from "@/features/auth/schemas"
import { ApiError } from "@/api/client"
import { getPublicSettings, login } from "@/api/auth"
import { TextField } from "@/components/forms/TextField"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { loginSchema, safeRedirect } from "@/features/auth/schemas"
import { homeFor } from "@/lib/guards"
import { useSessionStore } from "@/stores/sessionStore"

const route = getRouteApi("/login")
const FIELDS = ["email", "password"] as const

export function LoginPage() {
  const { t } = useTranslation()
  const { redirect, reason } = route.useSearch()
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signIn = useMutation({
    mutationFn: login,
    onSuccess: (auth) => {
      setSession(auth.token, { id: auth.id, name: auth.name, role: auth.role })
      const target = safeRedirect(redirect)
      if (target) void navigate({ href: target, replace: true })
      else void navigate({ to: homeFor(auth.role), replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        applyFieldErrors(error.fieldErrors, FIELDS, form.setError, t)
      }
    },
  })

  const onSubmit = form.handleSubmit((values) => signIn.mutate(values))

  function signInAsDemo(account: DemoAccount) {
    form.setValue("email", account.email)
    form.setValue("password", account.password)
    void onSubmit()
  }

  const error = signIn.error
  const pending =
    error instanceof ApiError && error.code === "PHARMACY_NOT_VERIFIED"
  const banner = error && !pending && !hasFieldErrorFor(error, FIELDS)

  return (
    <AuthLayout
      title={t("auth.signInTitle")}
      description={t("auth.signInSubtitle")}
      lead={
        <DemoAccounts disabled={signIn.isPending} onChoose={signInAsDemo} />
      }
      footer={
        <div className="flex flex-col">
          <AuthFooterLine question={t("auth.noAccount")}>
            <Link to="/register" className={authLinkClass}>
              {t("auth.register")}
            </Link>
          </AuthFooterLine>
          <AuthFooterLine question={t("auth.ownPharmacy")}>
            {/* Plain anchor until the /register/pharmacy route exists (Task 6). */}
            <a href="/register/pharmacy" className={authLinkClass}>
              {t("auth.registerPharmacy")}
            </a>
          </AuthFooterLine>
        </div>
      }
    >
      {reason === "expired" && !error && (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertDescription className="text-foreground">
            {t("auth.sessionExpired")}
          </AlertDescription>
        </Alert>
      )}
      {pending && (
        <Alert className="border-secondary/60 bg-accent text-accent-foreground">
          <HourglassIcon aria-hidden />
          <AlertTitle>{t("auth.pendingTitle")}</AlertTitle>
          <AlertDescription className="text-accent-foreground/85">
            {t("auth.pendingBody")}
          </AlertDescription>
        </Alert>
      )}
      {banner && (
        <FormErrorAlert title={t("auth.signInFailed")} error={error} />
      )}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          control={form.control}
          name="email"
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <div className="flex flex-col gap-1">
          <TextField
            control={form.control}
            name="password"
            label={t("auth.password")}
            type="password"
            autoComplete="current-password"
          />
          <Link
            to="/forgot-password"
            className={`${authLinkClass} self-start text-sm`}
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <Button type="submit" size="lg" disabled={signIn.isPending}>
          {signIn.isPending ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>
    </AuthLayout>
  )
}

/** One-click sign-in with the seeded demo accounts, shown only while demo mode is public. */
function DemoAccounts({
  disabled,
  onChoose,
}: {
  disabled: boolean
  onChoose: (account: DemoAccount) => void
}) {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: getPublicSettings,
  })
  const accounts = data?.demoAccounts ?? []
  if (accounts.length === 0) return null

  return (
    <section
      aria-labelledby="demo-title"
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-highlight/50 p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="demo-title" className="flex items-center gap-2 font-bold">
          <FlaskConicalIcon className="size-5 text-highlight" aria-hidden />
          {t("auth.demoTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("auth.demoBody")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={disabled}
            onClick={() => onChoose(account)}
          >
            {t(`auth.demoRoles.${account.role}`)}
          </Button>
        ))}
      </div>
    </section>
  )
}
