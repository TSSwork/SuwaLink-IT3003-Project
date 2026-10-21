import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"

/**
 * Placeholder legal text (spec §13): the wording lives in the locale files
 * under legal.privacyDoc / legal.termsDoc and is pending review.
 */
interface LegalDocProps {
  titleKey: string
  docKey: string
  sections: ReadonlyArray<string>
}

function LegalDoc({ titleKey, docKey, sections }: LegalDocProps) {
  const { t } = useTranslation()
  return (
    <article className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <header className="flex flex-col items-start gap-3">
        <Badge variant="secondary" className="h-auto py-1 text-sm">
          {t("legal.draftBadge")}
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t(titleKey)}
        </h1>
        <p className="text-sm text-muted-foreground">{t("legal.draftNote")}</p>
      </header>
      <p className="text-lg text-pretty">{t(`${docKey}.intro`)}</p>
      {sections.map((section) => (
        <section key={section} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">
            {t(`${docKey}.${section}Title`)}
          </h2>
          <p className="text-pretty">{t(`${docKey}.${section}Body`)}</p>
        </section>
      ))}
    </article>
  )
}

export function PrivacyPage() {
  return (
    <LegalDoc
      titleKey="legal.privacyTitle"
      docKey="legal.privacyDoc"
      sections={["collect", "prescriptions", "use", "rights"]}
    />
  )
}

export function TermsPage() {
  return (
    <LegalDoc
      titleKey="legal.termsTitle"
      docKey="legal.termsDoc"
      sections={["service", "accounts", "reservations", "advice"]}
    />
  )
}
