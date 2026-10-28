import type { Language } from "@/stores/languageStore"

const locale = (lang: Language) => `${lang}-LK`

/** LKR amount in the reader's language, e.g. "LKR 1,250.50". */
export function formatPrice(amount: number, lang: Language): string {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency: "LKR",
  }).format(amount)
}

function unit(lang: Language, value: number, name: "meter" | "kilometer") {
  return new Intl.NumberFormat(locale(lang), {
    style: "unit",
    unit: name,
    unitDisplay: "short",
    maximumFractionDigits: name === "kilometer" ? 1 : 0,
  }).format(value)
}

/** Under 1 km: metres rounded to 50 m; otherwise km to one decimal. "" when unknown. */
export function formatDistance(km: number | null, lang: Language): string {
  if (km === null) return ""
  const metres = Math.round((km * 1000) / 50) * 50
  return metres < 1000
    ? unit(lang, metres, "meter")
    : unit(lang, km, "kilometer")
}

export function formatDateTime(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(locale(lang), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

/** A LocalDate ("YYYY-MM-DD"), read as that calendar day, e.g. "31 Dec 2027". */
export function formatDate(localDate: string, lang: Language): string {
  const [year, month, day] = localDate.split("-").map(Number)
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium" }).format(
    new Date(year, month - 1, day)
  )
}

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
]

/** "30 minutes ago" / "in 2 hours" (`now` is injectable for tests). */
export function formatRelative(
  iso: string,
  lang: Language,
  now: number = Date.now()
): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  const formatter = new Intl.RelativeTimeFormat(locale(lang), {
    numeric: "auto",
  })
  if (abs < 45) return formatter.format(0, "second")
  const [unitName, size] =
    STEPS.find(([, step]) => abs >= step) ?? STEPS[STEPS.length - 1]
  return formatter.format(Math.round(seconds / size), unitName)
}
