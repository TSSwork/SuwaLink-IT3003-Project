import { useTranslation } from "react-i18next"

// Placeholder landing page; replaced by the real home screen in a later task.
export function IndexPage() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {t("common.appName")}
      </h1>
      <p className="max-w-prose text-muted-foreground">{t("common.tagline")}</p>
    </section>
  )
}
