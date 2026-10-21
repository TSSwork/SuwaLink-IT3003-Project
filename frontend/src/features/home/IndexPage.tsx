import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LocationChooser } from "@/components/location/LocationChooser"
import { MedicineSearchForm } from "@/components/medicine/MedicineSearchForm"
import { UploadPrescriptionButton } from "@/components/prescription/UploadPrescriptionButton"
import { RecentReservations } from "@/features/home/RecentReservations"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

const STEPS = ["search", "reply", "pickup"] as const

export function IndexPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasLocation = useLocationStore((state) => state.mode !== "none")
  const user = useSessionStore((state) => state.user)

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <section className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-[20ch] text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {t("home.title")}
            </h1>
            <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
              {t("home.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <MedicineSearchForm
              onSearch={(q) =>
                void navigate({ to: "/search", search: q ? { q } : {} })
              }
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <LocationChooser />
              {!hasLocation && (
                <p className="text-sm text-muted-foreground">
                  {t("search.locationPrompt")}
                </p>
              )}
            </div>
          </div>
        </div>

        <aside
          aria-labelledby="rx-title"
          className="flex flex-col items-start gap-3 rounded-3xl bg-accent p-5 text-accent-foreground sm:p-6"
        >
          <h2 id="rx-title" className="text-lg font-semibold">
            {t("home.rxTitle")}
          </h2>
          <p className="text-sm leading-relaxed">{t("home.rxBody")}</p>
          <UploadPrescriptionButton className="mt-1" />
          {!user && (
            <p className="text-xs opacity-80">{t("home.signInToUpload")}</p>
          )}
        </aside>
      </section>

      {user?.role === "CUSTOMER" && <RecentReservations />}

      <section aria-labelledby="how-title" className="flex flex-col gap-6">
        <h2 id="how-title" className="text-xl font-semibold">
          {t("home.howTitle")}
        </h2>
        {/* A real sequence, so it is numbered; the dashed line is the route from search to counter. */}
        <ol
          aria-labelledby="how-title"
          className="grid gap-8 md:grid-cols-3 md:gap-6"
        >
          {STEPS.map((step, index) => (
            <li key={step} className="relative flex gap-4 md:flex-col md:gap-3">
              <span
                aria-hidden
                className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 border-highlight bg-background text-sm font-bold"
              >
                {index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-11 -bottom-6 left-[17px] border-l-2 border-dashed border-highlight/40 md:top-[17px] md:right-[-1.25rem] md:bottom-auto md:left-11 md:border-t-2 md:border-l-0"
                />
              )}
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">
                  {t(`home.steps.${step}.title`)}
                </h3>
                <p className="max-w-prose text-sm text-muted-foreground">
                  {t(`home.steps.${step}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
