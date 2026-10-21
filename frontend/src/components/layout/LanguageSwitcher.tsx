import { LanguagesIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  isLanguage,
  useLanguageStore,
} from "@/stores/languageStore"

/** Compact trigger (icon + short code) so the 360 px header stays uncrowded. */
export function LanguageSwitcher() {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 min-w-11 gap-1 px-2"
          aria-label={t("common.languageCurrent", {
            name: LANGUAGE_NAMES[language],
          })}
        >
          <LanguagesIcon className="size-5" aria-hidden />
          <span aria-hidden className="text-xs font-semibold uppercase">
            {language}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(value) => isLanguage(value) && setLanguage(value)}
        >
          {LANGUAGES.map((code) => (
            // Each name is written in its own language, whatever the UI language.
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {LANGUAGE_NAMES[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
