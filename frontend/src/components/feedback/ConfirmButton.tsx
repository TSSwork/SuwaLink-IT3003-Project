import { useTranslation } from "react-i18next"
import type { ComponentProps, ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ConfirmButtonProps {
  /** The button that opens the question. */
  label: string
  title: string
  description: string
  /** The confirming action's label; defaults to `label`. */
  confirmLabel?: string
  onConfirm: () => void
  /** Extra inputs inside the dialog, e.g. a reason field. */
  children?: ReactNode
  variant?: ComponentProps<typeof Button>["variant"]
  destructive?: boolean
  disabled?: boolean
}

/** A button that asks before doing something that cannot be undone. */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  variant = "outline",
  destructive = false,
  disabled,
}: ConfirmButtonProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel ?? label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
