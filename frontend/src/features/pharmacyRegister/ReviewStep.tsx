import { zodResolver } from "@hookform/resolvers/zod"
import { ExternalLinkIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import type { WizardData } from "@/features/pharmacyRegister/draft"
import type { ReviewStepValues } from "@/features/pharmacyRegister/schema"
import { TermsCheckbox } from "@/components/forms/TermsCheckbox"
import { formatLatLng } from "@/components/map/sriLanka"
import { Button } from "@/components/ui/button"
import { toLatLng } from "@/features/pharmacyRegister/LocationStep"
import { StepNav } from "@/features/pharmacyRegister/StepFrame"
import { reviewStepSchema } from "@/features/pharmacyRegister/schema"
import { useReportValues } from "@/features/pharmacyRegister/stepForm"

interface ReviewStepProps {
  data: WizardData
  pending: boolean
  /** The translated submit error, if any, shown above the consent. */
  banner?: ReactNode
  onChange: (values: ReviewStepValues) => void
  onEdit: (step: number) => void
  onBack: () => void
  onSubmit: () => void
}

export function ReviewStep({
  data,
  pending,
  banner,
  onChange,
  onEdit,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const { t } = useTranslation()
  const form = useForm<ReviewStepValues>({
    resolver: zodResolver(reviewStepSchema),
    defaultValues: { acceptTerms: data.acceptTerms },
  })
  useReportValues(form, onChange)
  const { owner, pharmacy, location } = data
  const point = toLatLng(location)

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <ReviewGroup
        title={t("pharmacyRegister.steps.owner")}
        onEdit={() => onEdit(0)}
      >
        <Row label={t("register.fullName")}>{owner.name}</Row>
        <Row label={t("auth.email")}>{owner.email}</Row>
        <Row label={t("register.phone")}>{owner.phone}</Row>
      </ReviewGroup>
      <ReviewGroup
        title={t("pharmacyRegister.steps.pharmacy")}
        onEdit={() => onEdit(1)}
      >
        <Row label={t("pharmacyRegister.pharmacyName")}>
          {pharmacy.pharmacyName}
        </Row>
        <Row label={t("pharmacyRegister.licenceNumber")}>
          <span className="font-mono">{pharmacy.licenceNo}</span>
        </Row>
        <Row label={t("pharmacyRegister.address")}>{pharmacy.address}</Row>
        <Row label={t("pharmacyRegister.city")}>{pharmacy.city}</Row>
        <Row label={t("pharmacyRegister.district")}>
          {pharmacy.district && t(`districts.${pharmacy.district}`)}
        </Row>
        <Row label={t("pharmacyRegister.openingHours")}>
          {pharmacy.openingHours || (
            <span className="font-normal text-muted-foreground">
              {t("pharmacyRegister.openingHoursNone")}
            </span>
          )}
        </Row>
      </ReviewGroup>
      <ReviewGroup
        title={t("pharmacyRegister.steps.location")}
        onEdit={() => onEdit(2)}
      >
        {point && (
          <Row label={t("map.chosen")}>
            <span className="font-mono tabular-nums">
              {formatLatLng(point)}
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=18/${point.lat}/${point.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg font-normal text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-0"
            >
              {t("pharmacyRegister.viewOnMap")}
              <ExternalLinkIcon className="size-3.5" aria-hidden />
              <span className="sr-only"> {t("register.opensInNewTab")}</span>
            </a>
          </Row>
        )}
      </ReviewGroup>
      {banner}
      <TermsCheckbox control={form.control} name="acceptTerms" />
      <StepNav
        onBack={onBack}
        pending={pending}
        submitLabel={
          pending
            ? t("pharmacyRegister.submitting")
            : t("pharmacyRegister.submit")
        }
      />
    </form>
  )
}

function ReviewGroup({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 border-b pb-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={t("pharmacyRegister.editSection", { section: title })}
        >
          {t("pharmacyRegister.edit")}
        </Button>
      </div>
      <dl className="flex flex-col gap-2">{children}</dl>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-col items-start text-sm font-medium break-words">
        {children}
      </dd>
    </div>
  )
}
