import { useEffect, useId, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import { CameraIcon, CircleAlertIcon, ImageIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { TargetScope } from "@/api/types"
import type { PrescriptionValues } from "@/features/prescriptions/schema"
import { ApiError } from "@/api/client"
import { PRESCRIPTION_TYPES, useCreatePrescription } from "@/api/prescriptions"
import { DistrictSelect } from "@/components/forms/DistrictSelect"
import { TextField } from "@/components/forms/TextField"
import { LocationChooser } from "@/components/location/LocationChooser"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  NOTE_MAX,
  checkPhoto,
  prescriptionSchema,
} from "@/features/prescriptions/schema"
import { translateError } from "@/lib/translateError"
import { useLocationStore } from "@/stores/locationStore"

const ACCEPT = PRESCRIPTION_TYPES.join(",")
const SCOPES: Array<TargetScope> = ["RADIUS_10KM", "DISTRICT", "ALL"]

export function NewPrescriptionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mode = useLocationStore((state) => state.mode)
  const lat = useLocationStore((state) => state.lat)
  const lng = useLocationStore((state) => state.lng)
  const storeDistrict = useLocationStore((state) => state.district)
  const hasPoint = mode === "point"
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const create = useCreatePrescription(setProgress)

  const form = useForm<PrescriptionValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientAge: "",
      note: "",
      targetScope: hasPoint ? "RADIUS_10KM" : "DISTRICT",
      district: storeDistrict,
      consent: false,
    },
  })
  const scope = form.watch("targetScope")
  const district = form.watch("district")

  // The search district can arrive after the form (SessionBootstrap seeds it
  // once GET /users/me answers); fill the field then, unless already chosen.
  useEffect(() => {
    if (mode === "district" && storeDistrict && !form.getValues("district")) {
      form.setValue("district", storeDistrict)
    }
  }, [form, mode, storeDistrict])

  const choosePhoto = (file: File | undefined) => {
    if (!file) return
    const problem = checkPhoto(file)
    setPhotoError(problem)
    setPhoto(problem ? null : file)
  }

  const send = (values: PrescriptionValues, targetScope: TargetScope) => {
    if (!photo) return
    setProgress(0)
    create.mutate(
      {
        image: photo,
        patientAge: Number(values.patientAge),
        note: values.note.trim() || undefined,
        targetScope,
        latitude: lat,
        longitude: lng,
        district: values.district,
        consent: values.consent,
      },
      {
        onSuccess: (request) => {
          toast.success(t("prescriptions.sent"))
          void navigate({
            to: "/prescriptions/$id",
            params: { id: request.id },
          })
        },
      }
    )
  }

  const submit = form.handleSubmit(
    (values) => {
      if (!photo) {
        setPhotoError((previous) => previous ?? "prescriptions.photoRequired")
        return
      }
      send(values, values.targetScope)
    },
    () => {
      if (!photo) {
        setPhotoError((previous) => previous ?? "prescriptions.photoRequired")
      }
    }
  )

  /** After NO_PHARMACIES_IN_SCOPE: send the same request to a wider area. */
  const widen = (targetScope: TargetScope) => {
    form.setValue("targetScope", targetScope)
    void form.handleSubmit((values) => send(values, targetScope))()
  }

  const error = create.error
  const noneInScope =
    error instanceof ApiError && error.code === "NO_PHARMACIES_IN_SCOPE"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("home.uploadPrescription")}
        </h1>
        <p className="text-muted-foreground">{t("prescriptions.newBody")}</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <PhotoPicker photo={photo} error={photoError} onChoose={choosePhoto} />

        <TextField
          control={form.control}
          name="patientAge"
          label={t("prescriptions.age")}
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          className="max-w-40"
        />

        <Controller
          control={form.control}
          name="note"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="rx-note">
                {t("prescriptions.note")}
              </FieldLabel>
              <Textarea
                id="rx-note"
                {...field}
                maxLength={NOTE_MAX}
                rows={3}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                {t("prescriptions.noteHint", {
                  used: field.value.length,
                  max: NOTE_MAX,
                })}
              </FieldDescription>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="targetScope"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>{t("prescriptions.scope")}</FieldLegend>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                className="gap-3"
              >
                {SCOPES.map((option) => {
                  const disabled = option === "RADIUS_10KM" && !hasPoint
                  return (
                    <Field
                      key={option}
                      orientation="horizontal"
                      data-disabled={disabled}
                      className="rounded-2xl border p-4"
                    >
                      <RadioGroupItem
                        value={option}
                        id={`scope-${option}`}
                        disabled={disabled}
                        aria-describedby={`scope-${option}-hint`}
                      />
                      <FieldContent>
                        <FieldLabel htmlFor={`scope-${option}`}>
                          {t(`prescriptions.scopes.${option}.title`)}
                        </FieldLabel>
                        <FieldDescription id={`scope-${option}-hint`}>
                          {disabled
                            ? t("prescriptions.radiusNeedsPoint")
                            : t(`prescriptions.scopes.${option}.body`)}
                        </FieldDescription>
                        {disabled && (
                          <div className="pt-1">
                            <LocationChooser />
                          </div>
                        )}
                      </FieldContent>
                    </Field>
                  )
                })}
              </RadioGroup>
            </FieldSet>
          )}
        />

        {scope === "DISTRICT" && (
          <Controller
            control={form.control}
            name="district"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="max-w-sm">
                <FieldLabel htmlFor="rx-district">
                  {t("register.district")}
                </FieldLabel>
                <DistrictSelect
                  id="rx-district"
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.error?.message && (
                  <FieldError>{t(fieldState.error.message)}</FieldError>
                )}
              </Field>
            )}
          />
        )}

        <Controller
          control={form.control}
          name="consent"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                id="rx-consent"
                ref={field.ref}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={fieldState.invalid}
              />
              <FieldContent>
                <FieldLabel htmlFor="rx-consent" className="font-normal">
                  {t("prescriptions.consent")}
                </FieldLabel>
                {fieldState.error?.message && (
                  <FieldError>{t(fieldState.error.message)}</FieldError>
                )}
              </FieldContent>
            </Field>
          )}
        />

        {error &&
          (noneInScope ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>{translateError(t, error)}</AlertTitle>
              <AlertDescription>
                <p>{t("prescriptions.widenBody")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scope === "RADIUS_10KM" && district && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => widen("DISTRICT")}
                    >
                      {t("prescriptions.widenDistrict")}
                    </Button>
                  )}
                  {scope !== "ALL" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => widen("ALL")}
                    >
                      {t("prescriptions.widenAll")}
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>{t("prescriptions.sendFailed")}</AlertTitle>
              <AlertDescription>{translateError(t, error)}</AlertDescription>
            </Alert>
          ))}

        {create.isPending && (
          <div className="flex flex-col gap-2" role="status">
            <p className="text-sm">{t("prescriptions.uploading")}</p>
            <Progress
              value={progress}
              aria-label={t("prescriptions.uploading")}
            />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={create.isPending}
          className="self-start"
        >
          {create.isPending
            ? t("prescriptions.sending")
            : t("prescriptions.send")}
        </Button>
      </form>
    </div>
  )
}

/** Choose a photo (or take one on a phone), with a preview that is never cropped. */
function PhotoPicker({
  photo,
  error,
  onChoose,
}: {
  photo: File | null
  error: string | null
  onChoose: (file: File | undefined) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const pickerRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string>()

  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreview(undefined)
    }
  }, [photo])

  return (
    <Field data-invalid={error !== null}>
      <FieldLabel htmlFor={id}>{t("prescriptions.photo")}</FieldLabel>
      <FieldDescription>{t("prescriptions.photoHint")}</FieldDescription>
      <div className="flex flex-wrap items-center gap-3">
        {/* The native control's text ("Choose File / No file chosen") follows
            the browser's language and can't be styled; a translated button
            opens it instead. The label still names the input. */}
        <input
          ref={pickerRef}
          id={id}
          type="file"
          accept={ACCEPT}
          tabIndex={-1}
          aria-invalid={error !== null}
          onChange={(event) => onChoose(event.target.files?.[0])}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          aria-invalid={error !== null}
          onClick={() => pickerRef.current?.click()}
        >
          <ImageIcon data-icon="inline-start" aria-hidden />
          {t("prescriptions.choosePhoto")}
        </Button>
        {/* Phones open the camera straight away; desktops use the picker. */}
        <Button
          type="button"
          variant="outline"
          className="hidden pointer-coarse:inline-flex"
          onClick={() => cameraRef.current?.click()}
        >
          <CameraIcon data-icon="inline-start" aria-hidden />
          {t("prescriptions.takePhoto")}
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden
          className="hidden"
          onChange={(event) => onChoose(event.target.files?.[0])}
        />
        <span className="min-w-0 basis-full text-sm break-all text-muted-foreground sm:basis-auto">
          {photo ? photo.name : t("prescriptions.noPhoto")}
        </span>
      </div>
      {error && <FieldError>{t(error)}</FieldError>}
      {photo && preview ? (
        <img
          src={preview}
          alt={t("prescriptions.previewAlt", {
            name: photo.name,
            interpolation: { escapeValue: false },
          })}
          className="max-h-80 w-full rounded-2xl border bg-muted object-contain"
        />
      ) : (
        <div className="grid h-32 place-items-center rounded-2xl border border-dashed bg-muted/40 text-muted-foreground">
          <ImageIcon aria-hidden className="size-8" />
        </div>
      )}
    </Field>
  )
}
