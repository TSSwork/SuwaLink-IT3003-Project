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
  confirmLabel,
  variant = "outline",
  disabled,
  ...question
}: ConfirmButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <ConfirmDialogContent
        confirmLabel={confirmLabel ?? label}
        {...question}
      />
    </AlertDialog>
  )
}

type ConfirmDialogProps = Pick<
  ConfirmButtonProps,
  "title" | "description" | "onConfirm" | "children" | "destructive"
> & {
  confirmLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ConfirmButton's question without its button, for a control that opens it
 * itself (e.g. a switch that asks only when turned off).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  ...question
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <ConfirmDialogContent {...question} />
    </AlertDialog>
  )
}

function ConfirmDialogContent({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  destructive = false,
}: Omit<ConfirmDialogProps, "open" | "onOpenChange">) {
  const { t } = useTranslation()
  return (
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
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
