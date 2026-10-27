import { useId, useState } from "react"
import { SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

interface MedicineSearchFormProps {
  /** Starting text; remount (key) to reset it from outside. */
  defaultValue?: string
  /** Called with the trimmed query ("" browses everything). */
  onSearch: (q: string) => void
}

/** The labelled medicine search box used on home and /search. */
export function MedicineSearchForm({
  defaultValue = "",
  onSearch,
}: MedicineSearchFormProps) {
  const { t } = useTranslation()
  const id = useId()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      role="search"
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(value.trim())
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {t("search.label")}
      </label>
      {/* SuwaLink: a 56 px field on every pointer type; it is the page's main control. */}
      <InputGroup className="h-14 rounded-3xl border-border bg-card shadow-sm pointer-coarse:h-14">
        <InputGroupAddon>
          <SearchIcon aria-hidden className="ml-2 size-5" />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={100}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("search.placeholder")}
          className="h-full text-base md:text-base pointer-coarse:h-full"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            variant="default"
            size="sm"
            className="mr-1 h-11 rounded-2xl px-5 pointer-coarse:h-11"
          >
            {t("search.submit")}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
