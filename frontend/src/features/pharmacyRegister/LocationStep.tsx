import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { LatLng } from "@/components/map/sriLanka"
import type {
  LocationStepValues,
  StepFieldError,
} from "@/features/pharmacyRegister/schema"
import { TextField } from "@/components/forms/TextField"
import { LocationPicker } from "@/components/map/LocationPicker"
import { StepNav } from "@/features/pharmacyRegister/StepFrame"
import { locationStepSchema } from "@/features/pharmacyRegister/schema"
import {
  useReportValues,
  useServerErrors,
} from "@/features/pharmacyRegister/stepForm"

interface LocationStepProps {
  values: LocationStepValues
  serverErrors?: ReadonlyArray<StepFieldError>
  onChange: (values: LocationStepValues) => void
  onNext: (values: LocationStepValues) => void
  onBack: () => void
}

/** The typed coordinates as a point, once both are numbers. */
export function toLatLng({
  latitude,
  longitude,
}: LocationStepValues): LatLng | undefined {
  if (latitude.trim() === "" || longitude.trim() === "") return undefined
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined
}

export function LocationStep({
  values,
  serverErrors,
  onChange,
  onNext,
  onBack,
}: LocationStepProps) {
  const { t } = useTranslation()
  const form = useForm<LocationStepValues>({
    resolver: zodResolver(locationStepSchema),
    defaultValues: values,
  })
  useReportValues(form, onChange)
  useServerErrors(form, serverErrors)
  const [latitude, longitude] = form.watch(["latitude", "longitude"])

  const pick = (lat: number, lng: number) => {
    // Re-check as the pin moves only once the person has tried Next.
    const options = {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    }
    form.setValue("latitude", lat.toFixed(6), options)
    form.setValue("longitude", lng.toFixed(6), options)
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onNext)}
      className="flex flex-col gap-5"
    >
      <LocationPicker
        value={toLatLng({ latitude, longitude })}
        onChange={pick}
      />
      <div className="flex flex-col gap-2">
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
        <p className="text-sm text-muted-foreground">
          {t("pharmacyRegister.coordinatesHint")}
        </p>
      </div>
      <StepNav onBack={onBack} />
    </form>
  )
}
