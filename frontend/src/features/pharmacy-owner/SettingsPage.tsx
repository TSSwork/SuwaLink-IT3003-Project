import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { Control } from "react-hook-form"
import type { ReactNode } from "react"
import type { PharmacyProfile } from "@/api/types"
import type {
  PharmacyProfileInput,
  PharmacyProfileValues,
} from "@/features/pharmacy-owner/profileSchema"
import { ApiError } from "@/api/client"
import { useMyPharmacy, useUpdateMyPharmacy } from "@/api/pharmacyOwner"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { DistrictSelect } from "@/components/forms/DistrictSelect"
import { TextField } from "@/components/forms/TextField"
import { LocationPicker } from "@/components/map/LocationPicker"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  applyFieldErrors,
  hasFieldErrorFor,
} from "@/features/auth/applyFieldErrors"
import {
  PROFILE_FIELDS,
  pharmacyProfileSchema,
  toFormValues,
  toRequest,
} from "@/features/pharmacy-owner/profileSchema"
import { toLatLng } from "@/features/pharmacyRegister/LocationStep"
import { translateError } from "@/lib/translateError"

export function SettingsPage() {
  const { t } = useTranslation()
  const pharmacy = useMyPharmacy()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {t("pharmacyOwner.settings.title")}
      </h2>
      {pharmacy.isPending ? (
        <LoadingState rows={6} />
      ) : pharmacy.isError ? (
        <ErrorState
          title={t("pharmacyOwner.settings.loadError")}
          description={translateError(t, pharmacy.error)}
          onRetry={() => void pharmacy.refetch()}
        />
      ) : (
        <ProfileForm profile={pharmacy.data} />
      )}
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-3xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-lg font-semibold">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function ProfileForm({ profile }: { profile: PharmacyProfile }) {
  const { t } = useTranslation()
  const update = useUpdateMyPharmacy()
  const form = useForm<PharmacyProfileInput, unknown, PharmacyProfileValues>({
    resolver: zodResolver(pharmacyProfileSchema),
    defaultValues: toFormValues(profile),
  })
  const [latitude, longitude] = form.watch(["latitude", "longitude"])

  const pick = (lat: number, lng: number) => {
    // Re-check as the pin moves only once the person has tried to save.
    const options = {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    }
    form.setValue("latitude", lat.toFixed(6), options)
    form.setValue("longitude", lng.toFixed(6), options)
  }

  const submit = form.handleSubmit((values) =>
    update.mutate(toRequest(values), {
      onSuccess: () => toast.success(t("pharmacyOwner.settings.saved")),
      onError: (error) => {
        if (error instanceof ApiError) {
          applyFieldErrors(error.fieldErrors, PROFILE_FIELDS, form.setError, t)
        }
      },
    })
  )

  const banner = update.error && !hasFieldErrorFor(update.error, PROFILE_FIELDS)

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <Section title={t("pharmacyOwner.settings.profile")}>
        <TextField
          control={form.control}
          name="name"
          label={t("pharmacyRegister.pharmacyName")}
          autoComplete="organization"
        />
        <TextField
          control={form.control}
          name="phone"
          type="tel"
          label={t("register.phone")}
          description={t("pharmacyOwner.settings.phoneHint")}
          autoComplete="tel"
        />
        <TextField
          control={form.control}
          name="address"
          label={t("pharmacyRegister.address")}
          autoComplete="street-address"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <DistrictField control={form.control} />
          <TextField
            control={form.control}
            name="city"
            label={t("pharmacyRegister.city")}
            autoComplete="address-level2"
          />
        </div>
        <TextField
          control={form.control}
          name="openingHours"
          label={t("pharmacyRegister.openingHours")}
          description={t("pharmacyRegister.openingHoursHint")}
        />
      </Section>

      <Section
        title={t("pharmacyOwner.settings.location")}
        description={t("pharmacyOwner.settings.locationHint")}
      >
        <LocationPicker
          value={toLatLng({ latitude, longitude })}
          onChange={pick}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            control={form.control}
            name="latitude"
            label={t("pharmacyRegister.latitude")}
            inputMode="decimal"
            autoComplete="off"
            className="[&_input]:font-mono"
          />
          <TextField
            control={form.control}
            name="longitude"
            label={t("pharmacyRegister.longitude")}
            inputMode="decimal"
            autoComplete="off"
            className="[&_input]:font-mono"
          />
        </div>
      </Section>

      <Section
        title={t("pharmacyOwner.settings.registration")}
        description={t("pharmacyOwner.settings.registrationHint")}
      >
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {t("pharmacyRegister.licenceNumber")}
          </dt>
          <dd className="font-mono break-all">{profile.licenceNo}</dd>
          <dt className="text-muted-foreground">
            {t("pharmacyOwner.settings.status")}
          </dt>
          <dd>{t(`pharmacyOwner.status.${profile.status}`)}</dd>
          <dt className="text-muted-foreground">
            {t("pharmacyOwner.settings.ownerEmail")}
          </dt>
          <dd className="break-all">{profile.ownerEmail}</dd>
        </dl>
      </Section>

      {banner && (
        <ErrorState
          title={t("pharmacyOwner.settings.saveFailed")}
          description={translateError(t, update.error)}
        />
      )}
      <Button type="submit" className="self-start" disabled={update.isPending}>
        {update.isPending
          ? t("pharmacyOwner.settings.saving")
          : t("pharmacyOwner.settings.save")}
      </Button>
    </form>
  )
}

function DistrictField({
  control,
}: {
  control: Control<PharmacyProfileInput, unknown, PharmacyProfileValues>
}) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      control={control}
      name="district"
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>
              {t("pharmacyRegister.district")}
            </FieldLabel>
            <DistrictSelect
              id={id}
              ref={field.ref}
              name={field.name}
              value={field.value as PharmacyProfileValues["district"] | ""}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              aria-describedby={message ? errorId : undefined}
            />
            {message && (
              <FieldError id={errorId}>
                {t(message, { defaultValue: message })}
              </FieldError>
            )}
          </Field>
        )
      }}
    />
  )
}
