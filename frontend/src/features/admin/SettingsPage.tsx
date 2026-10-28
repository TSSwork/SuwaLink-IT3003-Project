import { useState } from "react"
import { TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useAdminSettings, useResetDemo, useUpdateSettings } from "@/api/admin"
import {
  ConfirmButton,
  ConfirmDialog,
} from "@/components/feedback/ConfirmButton"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import {
  RefreshFailedNotice,
  failedWithData,
} from "@/components/feedback/RefreshFailedNotice"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { translateError } from "@/lib/translateError"

/** Demo-mode controls for showcases. */
export function SettingsPage() {
  const { t } = useTranslation()
  const settings = useAdminSettings()
  const update = useUpdateSettings()
  const reset = useResetDemo()
  const [confirmingOff, setConfirmingOff] = useState(false)
  const onError = (error: Error) => toast.error(translateError(t, error))

  const setDemoMode = (demoModePublic: boolean) =>
    update.mutate(
      { demoModePublic },
      {
        onSuccess: () =>
          toast.success(
            t(
              demoModePublic
                ? "admin.settings.turnedOn"
                : "admin.settings.turnedOff"
            )
          ),
        onError,
      }
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("admin.settings.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.settings.subtitle")}
        </p>
      </div>

      {failedWithData(settings) && (
        <RefreshFailedNotice onRetry={() => void settings.refetch()} />
      )}
      {settings.isPending ? (
        <LoadingState label={t("admin.settings.loading")} rows={2} />
      ) : settings.data === undefined ? (
        <ErrorState
          title={t("admin.settings.loadError")}
          description={translateError(t, settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="demo-mode" className="text-base font-semibold">
                  {t("admin.settings.demoTitle")}
                </Label>
                <p
                  id="demo-mode-body"
                  className="text-sm text-muted-foreground"
                >
                  {t("admin.settings.demoBody")}
                </p>
              </div>
              <Switch
                id="demo-mode"
                aria-describedby="demo-mode-body demo-mode-warning"
                checked={settings.data.demoModePublic}
                disabled={update.isPending}
                onCheckedChange={(on) =>
                  on ? setDemoMode(true) : setConfirmingOff(true)
                }
                className="mt-1"
              />
            </div>
            <p
              id="demo-mode-warning"
              className="flex gap-2 rounded-2xl bg-muted p-3 text-sm"
            >
              <TriangleAlertIcon
                className="mt-0.5 size-4 shrink-0 text-highlight"
                aria-hidden
              />
              {t("admin.settings.demoWarning")}
            </p>
            <ConfirmDialog
              open={confirmingOff}
              onOpenChange={setConfirmingOff}
              title={t("admin.settings.offTitle")}
              description={t("admin.settings.offBody")}
              confirmLabel={t("admin.settings.offConfirm")}
              destructive
              onConfirm={() => setDemoMode(false)}
            />
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold">
                {t("admin.settings.resetTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.settings.resetBody")}
              </p>
            </div>
            <div>
              <ConfirmButton
                label={t("admin.settings.resetTitle")}
                title={t("admin.settings.resetConfirmTitle")}
                description={t("admin.settings.resetConfirmBody")}
                confirmLabel={t("admin.settings.resetConfirm")}
                destructive
                disabled={reset.isPending}
                onConfirm={() =>
                  reset.mutate(undefined, {
                    onSuccess: () =>
                      toast.success(t("admin.settings.resetDone")),
                    onError,
                  })
                }
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
