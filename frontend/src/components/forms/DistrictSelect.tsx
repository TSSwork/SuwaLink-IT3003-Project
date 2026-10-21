import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ComponentProps } from "react"
import type { District } from "@/api/types"
import { DISTRICTS } from "@/api/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TriggerProps = Omit<
  ComponentProps<typeof SelectTrigger>,
  "value" | "defaultValue" | "onChange" | "children"
>

export interface DistrictSelectProps extends TriggerProps {
  /** The chosen district, or "" / undefined for none (shows the placeholder). */
  value?: District | ""
  onValueChange: (district: District) => void
  /** Form field name, for native form submission. */
  name?: string
  /** Defaults to "Choose a district". */
  placeholder?: string
}

function isDistrict(value: string): value is District {
  return DISTRICTS.some((district) => district === value)
}

/**
 * Picker over Sri Lanka's 25 districts, labelled and sorted in the current
 * language. Other props (id, aria-invalid, aria-describedby, onBlur, ref,
 * disabled, className) go to the trigger button, so a <label htmlFor> names it.
 */
export function DistrictSelect({
  value,
  onValueChange,
  name,
  placeholder,
  disabled,
  className,
  ...triggerProps
}: DistrictSelectProps) {
  const { t, i18n } = useTranslation()
  const options = useMemo(() => {
    const collator = new Intl.Collator(i18n.language)
    return DISTRICTS.map((district) => ({
      value: district,
      label: t(`districts.${district}`),
    })).sort((a, b) => collator.compare(a.label, b.label))
  }, [t, i18n.language])

  return (
    <Select
      value={value ?? ""}
      onValueChange={(next) => {
        if (isDistrict(next)) onValueChange(next)
      }}
      name={name}
      disabled={disabled}
    >
      <SelectTrigger className={className ?? "w-full"} {...triggerProps}>
        <SelectValue placeholder={placeholder ?? t("common.chooseDistrict")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
