import { FileTextIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Marks a medicine that needs a prescription, in words as well as colour. */
export function RxBadge({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      title={t("medicine.rxHint")}
      // Wraps instead of overflowing; Sinhala and Tamil labels are long.
      className={cn(
        "h-auto border-highlight/50 bg-highlight/10 text-left whitespace-normal text-foreground",
        className
      )}
    >
      <FileTextIcon aria-hidden className="text-highlight" />
      {t("medicine.rx")}
    </Badge>
  )
}
