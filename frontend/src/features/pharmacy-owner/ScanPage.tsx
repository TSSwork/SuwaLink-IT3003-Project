import { useEffect, useId, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CameraIcon,
  CameraOffIcon,
  ScanLineIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type QrScanner from "qr-scanner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { parsePickupCode } from "@/lib/pickupCode"
import { cn } from "@/lib/utils"

type Camera = "off" | "starting" | "on"
type Problem = "denied" | "noCamera" | "insecure" | "loadFailed"

/**
 * Reads a customer's pickup QR (or a typed code) and opens the reservation
 * at `/r/<code>`. Only the parsed code is used, so a QR pointing anywhere
 * else never navigates.
 */
export function ScanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cameraTitle = useId()
  const video = useRef<HTMLVideoElement>(null)
  const scanner = useRef<QrScanner | null>(null)
  /** Bumped by every start and stop, so a start that was overtaken gives up. */
  const attempt = useRef(0)
  const [camera, setCamera] = useState<Camera>("off")
  const [problem, setProblem] = useState<Problem | null>(null)
  const [notPickupCode, setNotPickupCode] = useState(false)

  function stopCamera() {
    attempt.current++
    scanner.current?.destroy()
    scanner.current = null
    setCamera("off")
  }

  useEffect(
    () => () => {
      attempt.current++
      scanner.current?.destroy()
      scanner.current = null
    },
    []
  )

  function open(code: string) {
    stopCamera()
    void navigate({ to: "/r/$code", params: { code } })
  }

  async function startCamera() {
    setProblem(null)
    setNotPickupCode(false)
    // Browsers expose the camera only to https pages (and localhost).
    if (!window.isSecureContext) {
      setProblem("insecure")
      return
    }
    const mine = ++attempt.current
    setCamera("starting")
    let Scanner: typeof QrScanner
    try {
      // Loaded on demand so other pages do not carry the decoder.
      Scanner = (await import("qr-scanner")).default
    } catch {
      if (mine !== attempt.current) return
      setCamera("off")
      setProblem("loadFailed")
      return
    }
    // Stopped, or the page closed, while the decoder was loading.
    if (mine !== attempt.current || !video.current) return
    const instance = new Scanner(
      video.current,
      (result) => {
        if (scanner.current !== instance) return
        const code = parsePickupCode(result.data)
        if (code) open(code)
        else setNotPickupCode(true)
      },
      {
        preferredCamera: "environment",
        maxScansPerSecond: 5,
        highlightScanRegion: true,
        returnDetailedScanResult: true,
      }
    )
    scanner.current = instance
    try {
      await instance.start()
      if (scanner.current === instance) setCamera("on")
    } catch {
      // Stopped meanwhile (Stop camera, or the page closed): nothing to report.
      if (scanner.current !== instance) return
      stopCamera()
      setProblem(await cameraProblem(Scanner))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("pharmacyOwner.scan.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("pharmacyOwner.scan.subtitle")}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section
          aria-labelledby={cameraTitle}
          className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5"
        >
          <h3 id={cameraTitle} className="font-semibold">
            {t("pharmacyOwner.scan.cameraTitle")}
          </h3>
          {/* Always mounted: the scanner attaches to it before it is shown. */}
          <div
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-2xl bg-muted sm:aspect-video",
              camera === "off" && "hidden"
            )}
          >
            <video
              ref={video}
              aria-label={t("pharmacyOwner.scan.previewLabel")}
              muted
              playsInline
              className="size-full object-cover"
            />
          </div>
          {camera === "off" ? (
            <Button className="self-start" onClick={() => void startCamera()}>
              <CameraIcon aria-hidden />
              {t("pharmacyOwner.scan.start")}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {t(
                  camera === "starting"
                    ? "pharmacyOwner.scan.starting"
                    : "pharmacyOwner.scan.aim"
                )}
              </p>
              <Button variant="outline" onClick={stopCamera}>
                <CameraOffIcon aria-hidden />
                {t("pharmacyOwner.scan.stop")}
              </Button>
            </div>
          )}
          {/* Always mounted so the notice is announced; no gap while empty. */}
          <div role="status" className="empty:-mt-4">
            {notPickupCode && (
              <p className="flex gap-2 rounded-2xl border border-highlight/40 px-4 py-3 text-sm">
                <ScanLineIcon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-highlight"
                />
                {t("pharmacyOwner.scan.notPickupCode")}
              </p>
            )}
          </div>
          {problem && (
            <Alert>
              <TriangleAlertIcon aria-hidden />
              <AlertTitle>{t("pharmacyOwner.scan.problemTitle")}</AlertTitle>
              <AlertDescription>
                {t(`pharmacyOwner.scan.problems.${problem}`)}
              </AlertDescription>
            </Alert>
          )}
        </section>

        <ManualEntry onCode={open} />
      </div>
    </div>
  )
}

/** Why the camera could not start; qr-scanner reports every case alike. */
async function cameraProblem(Scanner: typeof QrScanner): Promise<Problem> {
  try {
    const status = await navigator.permissions.query({
      name: "camera",
    })
    if (status.state === "denied") return "denied"
  } catch {
    // Some browsers cannot be asked about the camera permission.
  }
  // A camera that exists but did not open was most likely refused.
  return (await Scanner.hasCamera()) ? "denied" : "noCamera"
}

function ManualEntry({ onCode }: { onCode: (code: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [value, setValue] = useState("")
  const [invalid, setInvalid] = useState(false)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const code = parsePickupCode(value)
    if (code) onCode(code)
    else setInvalid(true)
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-5"
    >
      <h3 id={`${id}-title`} className="font-semibold">
        {t("pharmacyOwner.scan.manualTitle")}
      </h3>
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>
          {t("pharmacyOwner.scan.codeLabel")}
        </FieldLabel>
        <Input
          id={id}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setInvalid(false)
          }}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
          className="font-mono tracking-wider uppercase"
        />
        {invalid ? (
          <FieldError id={`${id}-hint`}>
            {t("pharmacyOwner.scan.invalidCode")}
          </FieldError>
        ) : (
          <FieldDescription id={`${id}-hint`}>
            {t("pharmacyOwner.scan.codeHint")}
          </FieldDescription>
        )}
      </Field>
      <Button type="submit" className="self-start">
        {t("pharmacyOwner.scan.open")}
      </Button>
    </form>
  )
}
