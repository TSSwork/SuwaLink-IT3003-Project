import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
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
import { useThemeStore } from "@/stores/themeStore"
import type { Theme } from "@/stores/themeStore"

const OPTIONS: { value: Theme; labelKey: string; Icon: typeof SunIcon }[] = [
  { value: "light", labelKey: "theme.light", Icon: SunIcon },
  { value: "dark", labelKey: "theme.dark", Icon: MoonIcon },
  { value: "system", labelKey: "theme.system", Icon: MonitorIcon },
]

function isTheme(value: string): value is Theme {
  return OPTIONS.some((option) => option.value === value)
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={t("theme.current", { name: t(current.labelKey) })}
        >
          <current.Icon className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => isTheme(value) && setTheme(value)}
        >
          {OPTIONS.map(({ value, labelKey, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden />
              {t(labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
