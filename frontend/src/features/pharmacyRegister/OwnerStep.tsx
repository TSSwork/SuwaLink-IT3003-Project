import { zodResolver } from "@hookform/resolvers/zod"
import { InfoIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type {
  OwnerStepValues,
  StepFieldError,
} from "@/features/pharmacyRegister/schema"
import { TextField } from "@/components/forms/TextField"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StepNav } from "@/features/pharmacyRegister/StepFrame"
import { ownerStepSchema } from "@/features/pharmacyRegister/schema"
import {
  useReportValues,
  useServerErrors,
} from "@/features/pharmacyRegister/stepForm"

interface OwnerStepProps {
  values: OwnerStepValues
  /** The draft was restored after a reload: ask for the password again. */
  restored: boolean
  serverErrors?: ReadonlyArray<StepFieldError>
  onChange: (values: OwnerStepValues) => void
  onNext: (values: OwnerStepValues) => void
}

export function OwnerStep({
  values,
  restored,
  serverErrors,
  onChange,
  onNext,
}: OwnerStepProps) {
  const { t } = useTranslation()
  const form = useForm<OwnerStepValues>({
    resolver: zodResolver(ownerStepSchema),
    defaultValues: values,
  })
  useReportValues(form, onChange)
  useServerErrors(form, serverErrors)

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onNext)}
      className="flex flex-col gap-5"
    >
      {restored && (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertDescription className="text-foreground">
            {t("pharmacyRegister.draftRestored")}
          </AlertDescription>
        </Alert>
      )}
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
        description={t("pharmacyRegister.phoneHint")}
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
      <StepNav />
    </form>
  )
}
