import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { HourglassIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { PharmacyRegisterRequest } from "@/api/types"
import type { WizardData } from "@/features/pharmacyRegister/draft"
import type { StepFieldError } from "@/features/pharmacyRegister/schema"
import { ApiError } from "@/api/client"
import { registerPharmacy } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { AuthLayout, FormErrorAlert } from "@/features/auth/AuthLayout"
import { LocationStep } from "@/features/pharmacyRegister/LocationStep"
import { OwnerStep } from "@/features/pharmacyRegister/OwnerStep"
import { PharmacyStep } from "@/features/pharmacyRegister/PharmacyStep"
import { ReviewStep } from "@/features/pharmacyRegister/ReviewStep"
import { StepFrame } from "@/features/pharmacyRegister/StepFrame"
import {
  EMPTY_WIZARD,
  clearDraft,
  hasContent,
  loadDraft,
  saveDraft,
} from "@/features/pharmacyRegister/draft"
import {
  locationStepSchema,
  ownerStepSchema,
  pharmacyStepSchema,
} from "@/features/pharmacyRegister/schema"

type Translate = ReturnType<typeof useTranslation>["t"]

/** Which step owns each request field, for placing server field errors. */
const FIELD_STEP: Record<string, number> = {
  name: 0,
  email: 0,
  phone: 0,
  password: 0,
  pharmacyName: 1,
  licenceNo: 1,
  address: 1,
  district: 1,
  city: 1,
  openingHours: 1,
  latitude: 2,
  longitude: 2,
}

interface RoutedError {
  step: number
  errors: Partial<Record<number, Array<StepFieldError>>>
}

/** Sends a submit error back to the step that can fix it, if there is one. */
function routeError(error: unknown, t: Translate): RoutedError | undefined {
  if (!(error instanceof ApiError)) return undefined
  if (error.code === "EMAIL_TAKEN") {
    return {
      step: 0,
      errors: { 0: [{ field: "email", message: "errors.EMAIL_TAKEN" }] },
    }
  }
  if (error.code === "DUPLICATE") {
    return {
      step: 1,
      errors: {
        1: [{ field: "licenceNo", message: "pharmacyRegister.licenceTaken" }],
      },
    }
  }
  const errors: RoutedError["errors"] = {}
  for (const fieldError of error.fieldErrors) {
    const step = FIELD_STEP[fieldError.field] as number | undefined
    if (step === undefined) continue
    const message =
      t(`validation.${fieldError.code}`, { defaultValue: "" }) ||
      fieldError.message
    ;(errors[step] ??= []).push({ field: fieldError.field, message })
  }
  const steps = Object.keys(errors).map(Number)
  return steps.length ? { step: Math.min(...steps), errors } : undefined
}

/** The request body, or the first step whose data no longer validates. */
function toRequest(data: WizardData): PharmacyRegisterRequest | number {
  const owner = ownerStepSchema.safeParse(data.owner)
  if (!owner.success) return 0
  const pharmacy = pharmacyStepSchema.safeParse(data.pharmacy)
  if (!pharmacy.success) return 1
  const location = locationStepSchema.safeParse(data.location)
  if (!location.success) return 2
  const { name, email, phone, password } = owner.data
  const { openingHours, ...rest } = pharmacy.data
  return {
    name,
    email,
    phone,
    password,
    ...rest,
    latitude: Number(location.data.latitude),
    longitude: Number(location.data.longitude),
    ...(openingHours ? { openingHours } : {}),
    acceptTerms: true,
  }
}

function initialData(): { data: WizardData; restored: boolean } {
  const draft = loadDraft()
  return draft && hasContent(draft)
    ? { data: draft, restored: true }
    : { data: EMPTY_WIZARD, restored: false }
}

/**
 * Four-step pharmacy registration: owner account, pharmacy, location, review.
 * The draft (never the password) is kept in sessionStorage, so a reload
 * comes back to step 1 with everything else filled in.
 */
export function PharmacyRegisterPage() {
  const { t } = useTranslation()
  const [initial] = useState(initialData)
  const [data, setData] = useState(initial.data)
  const [restored, setRestored] = useState(initial.restored)
  const [step, setStep] = useState(0)
  const [moved, setMoved] = useState(false)
  const [serverErrors, setServerErrors] = useState<RoutedError["errors"]>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) saveDraft(data)
  }, [data, done])

  const submit = useMutation({
    mutationFn: registerPharmacy,
    onSuccess: () => {
      clearDraft()
      setDone(true)
    },
    onError: (error) => {
      const routed = routeError(error, t)
      if (!routed) return
      setServerErrors(routed.errors)
      goTo(routed.step)
    },
  })

  const goTo = (next: number) => {
    submit.reset()
    setStep(next)
    setMoved(true)
  }
  const update = <TKey extends keyof WizardData>(
    key: TKey,
    value: WizardData[TKey]
  ) => setData((previous) => ({ ...previous, [key]: value }))
  const advance = <TKey extends keyof WizardData>(
    key: TKey,
    value: WizardData[TKey]
  ) => {
    update(key, value)
    setServerErrors((previous) => ({ ...previous, [step]: [] }))
    goTo(step + 1)
  }

  if (done) return <SubmittedPanel />

  const banner =
    submit.error && !routeError(submit.error, t) ? (
      <FormErrorAlert
        title={t("pharmacyRegister.failed")}
        error={submit.error}
      />
    ) : undefined
  const back = () => goTo(step - 1)

  return (
    <AuthLayout
      title={t("pharmacyRegister.title")}
      description={t("pharmacyRegister.subtitle")}
    >
      <StepFrame
        key={step}
        index={step}
        focusHeading={moved && !serverErrors[step]?.length}
      >
        {step === 0 && (
          <OwnerStep
            values={data.owner}
            restored={restored}
            serverErrors={serverErrors[0]}
            onChange={(values) => update("owner", values)}
            onNext={(values) => {
              setRestored(false)
              advance("owner", values)
            }}
          />
        )}
        {step === 1 && (
          <PharmacyStep
            values={data.pharmacy}
            serverErrors={serverErrors[1]}
            onChange={(values) => update("pharmacy", values)}
            onNext={(values) => advance("pharmacy", values)}
            onBack={back}
          />
        )}
        {step === 2 && (
          <LocationStep
            values={data.location}
            serverErrors={serverErrors[2]}
            onChange={(values) => update("location", values)}
            onNext={(values) => advance("location", values)}
            onBack={back}
          />
        )}
        {step === 3 && (
          <ReviewStep
            data={data}
            pending={submit.isPending}
            banner={banner}
            onChange={({ acceptTerms }) => update("acceptTerms", acceptTerms)}
            onEdit={goTo}
            onBack={back}
            onSubmit={() => {
              const request = toRequest(data)
              if (typeof request === "number") goTo(request)
              else submit.mutate(request)
            }}
          />
        )}
      </StepFrame>
    </AuthLayout>
  )
}

function SubmittedPanel() {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-4 sm:pt-6">
      <span className="grid size-12 place-items-center rounded-full bg-secondary/40 text-foreground">
        <HourglassIcon className="size-6" aria-hidden />
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-3xl font-extrabold tracking-tight text-balance outline-none"
      >
        {t("pharmacyRegister.successTitle")}
      </h1>
      <p className="text-pretty text-muted-foreground">
        {t("pharmacyRegister.successBody")}
      </p>
      <Button asChild variant="outline" size="lg">
        <Link to="/">{t("pharmacyRegister.backHome")}</Link>
      </Button>
    </div>
  )
}
