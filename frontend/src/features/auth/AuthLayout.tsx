import { CircleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import type { TranslatableError } from "@/lib/translateError"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { translateError } from "@/lib/translateError"

interface AuthLayoutProps {
  title: string
  description: string
  /** Optional block between the heading and the card. */
  lead?: ReactNode
  /** Notices and the form, inside the card. */
  children: ReactNode
  /** Links and extras under the card. */
  footer?: ReactNode
}

/** Narrow, centred column shared by the sign-in, sign-up and reset screens. */
export function AuthLayout({
  title,
  description,
  lead,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 sm:pt-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-pretty text-muted-foreground">{description}</p>
      </header>
      {lead}
      <Card>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
      </Card>
      {footer}
    </div>
  )
}

/** The translated API error above a form (field errors go under their fields). */
export function FormErrorAlert({
  title,
  error,
}: {
  title: string
  error: TranslatableError
}) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{translateError(t, error)}</AlertDescription>
    </Alert>
  )
}

/** "Question? Link" line under an auth card. */
export function AuthFooterLine({
  question,
  children,
}: {
  question: string
  children: ReactNode
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
      <span>{question}</span>
      {children}
    </p>
  )
}

/** Inline text link with a 44 px touch target. */
export const authLinkClass =
  "inline-flex min-h-11 items-center rounded-lg font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
