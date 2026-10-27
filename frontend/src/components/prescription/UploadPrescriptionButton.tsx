import { Link } from "@tanstack/react-router"
import { CameraIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSessionStore } from "@/stores/sessionStore"

const UPLOAD_PATH = "/prescriptions/new"

/** "Upload a prescription"; signed-out visitors sign in first and come back. */
export function UploadPrescriptionButton({
  variant = "default",
  className,
}: Pick<ComponentProps<typeof Button>, "variant" | "className">) {
  const { t } = useTranslation()
  const signedIn = useSessionStore((state) => state.user !== null)
  const label = (
    <>
      <CameraIcon data-icon="inline-start" aria-hidden />
      {t("home.uploadPrescription")}
    </>
  )
  return (
    // Wraps long si/ta labels; SuwaLink: pointer-coarse min-h-11 keeps 44 px.
    <Button
      asChild
      size="lg"
      variant={variant}
      className={cn(
        "h-auto min-h-9 py-2 whitespace-normal pointer-coarse:h-auto pointer-coarse:min-h-11",
        className
      )}
    >
      {signedIn ? (
        <Link to={UPLOAD_PATH}>{label}</Link>
      ) : (
        <Link to="/login" search={{ redirect: UPLOAD_PATH }}>
          {label}
        </Link>
      )}
    </Button>
  )
}
