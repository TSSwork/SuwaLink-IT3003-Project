import { useId, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { ReactNode } from "react"
import type { District, UserProfile } from "@/api/types"
import type { Theme } from "@/stores/themeStore"
import { useDeleteAccount, useMe, useUpdatePreferences } from "@/api/users"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { DistrictSelect } from "@/components/forms/DistrictSelect"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { translateError } from "@/lib/translateError"
import { useCartStore } from "@/stores/cartStore"
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  isLanguage,
  useLanguageStore,
} from "@/stores/languageStore"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"
import { useThemeStore } from "@/stores/themeStore"

const THEMES: Array<Theme> = ["light", "dark", "system"]

export function SettingsPage() {
  const { t } = useTranslation()
  const me = useMe()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t("settings.title")}
      </h1>
      {me.isPending ? (
        <LoadingState rows={4} />
      ) : me.isError ? (
        <ErrorState
          title={t("settings.loadError")}
          description={translateError(t, me.error)}
          onRetry={() => void me.refetch()}
        />
      ) : (
        <>
          <Profile me={me.data} />
          <Preferences me={me.data} />
          <Appearance />
          <Account />
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-6"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Profile({ me }: { me: UserProfile }) {
  const { t } = useTranslation()
  return (
    <Section title={t("settings.profile")}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("register.fullName")}</dt>
        <dd>{me.name}</dd>
        <dt className="text-muted-foreground">{t("auth.email")}</dt>
        <dd className="break-all">{me.email}</dd>
        <dt className="text-muted-foreground">{t("register.phone")}</dt>
        <dd>{me.phone ?? "—"}</dd>
      </dl>
      <p className="text-xs text-muted-foreground">
        {t("settings.profileHint")}
      </p>
    </Section>
  )
}

function Preferences({ me }: { me: UserProfile }) {
  const { t } = useTranslation()
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const location = useLocationStore()
  const update = useUpdatePreferences()
  const [language, setChoice] = useState(me.preferredLanguage)
  const [district, setDistrict] = useState<District | null>(me.district)
  const districtId = useId()

  const save = () =>
    update.mutate(
      { preferredLanguage: language, district },
      {
        onSuccess: () => {
          setLanguage(language)
          // A chosen point stays; otherwise searches start from the new district.
          if (district && location.mode !== "point") {
            location.setDistrict(district)
          }
          toast.success(t("settings.saved"))
        },
        onError: (error) => toast.error(translateError(t, error)),
      }
    )

  return (
    <Section title={t("settings.preferences")}>
      <div className="flex flex-col gap-2">
        <p id={`${districtId}-lang`} className="text-sm font-medium">
          {t("settings.language")}
        </p>
        <RadioGroup
          aria-labelledby={`${districtId}-lang`}
          value={language}
          onValueChange={(value) => {
            if (isLanguage(value)) setChoice(value)
          }}
          className="flex flex-wrap gap-x-6 gap-y-1"
        >
          {LANGUAGES.map((code) => (
            <div key={code} className="flex min-h-11 items-center gap-2">
              <RadioGroupItem value={code} id={`${districtId}-${code}`} />
              <Label htmlFor={`${districtId}-${code}`} lang={code}>
                {LANGUAGE_NAMES[code]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <Field className="max-w-sm">
        <FieldLabel htmlFor={districtId}>{t("settings.district")}</FieldLabel>
        <DistrictSelect
          id={districtId}
          value={district ?? ""}
          onValueChange={setDistrict}
        />
      </Field>
      <Button className="self-start" disabled={update.isPending} onClick={save}>
        {t("settings.save")}
      </Button>
    </Section>
  )
}

function Appearance() {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const id = useId()
  return (
    <Section title={t("theme.label")}>
      <RadioGroup
        aria-label={t("theme.label")}
        value={theme}
        onValueChange={(value) => setTheme(value as Theme)}
        className="flex flex-wrap gap-x-6 gap-y-1"
      >
        {THEMES.map((option) => (
          <div key={option} className="flex min-h-11 items-center gap-2">
            <RadioGroupItem value={option} id={`${id}-${option}`} />
            <Label htmlFor={`${id}-${option}`}>{t(`theme.${option}`)}</Label>
          </div>
        ))}
      </RadioGroup>
    </Section>
  )
}

function Account() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signOut = () => {
    useSessionStore.getState().clear()
    void navigate({ to: "/" })
  }
  return (
    <Section title={t("settings.account")}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={signOut}>
          {t("auth.signOut")}
        </Button>
        <DeleteAccount />
      </div>
    </Section>
  )
}

/** Deleting needs the password; on success nothing of the account stays in this browser. */
function DeleteAccount() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const remove = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const passwordId = useId()

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setPassword("")
      remove.reset()
    }
  }

  const confirm = () =>
    remove.mutate(password, {
      onSuccess: () => {
        useSessionStore.getState().clear()
        useCartStore.getState().clear()
        useLocationStore.getState().clear()
        toast.success(t("settings.deleted"))
        void navigate({ to: "/" })
      },
    })

  return (
    <>
      <Button
        variant="ghost"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        {t("settings.delete")}
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("settings.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("settings.deleteBody")}</DialogDescription>
          </DialogHeader>
          <form
            id={`${passwordId}-form`}
            onSubmit={(event) => {
              event.preventDefault()
              if (password) confirm()
            }}
          >
            <Field data-invalid={remove.isError}>
              <FieldLabel htmlFor={passwordId}>{t("auth.password")}</FieldLabel>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={password}
                aria-invalid={remove.isError}
                onChange={(event) => setPassword(event.target.value)}
              />
              {remove.error && (
                <FieldError>{translateError(t, remove.error)}</FieldError>
              )}
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              form={`${passwordId}-form`}
              variant="destructive"
              disabled={!password || remove.isPending}
            >
              {t("settings.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
