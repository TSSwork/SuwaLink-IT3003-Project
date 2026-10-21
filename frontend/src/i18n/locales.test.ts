import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import en from "@/locales/en.json"
import si from "@/locales/si.json"
import ta from "@/locales/ta.json"
import { translateError } from "@/lib/translateError"

type Tree = { [key: string]: string | Tree }
const locales: Record<string, Tree> = { en, si, ta }

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      return typeof value === "string"
        ? { ...acc, [path]: value }
        : { ...acc, ...flatten(value, path) }
    },
    {}
  )
}

const flat = {
  en: flatten(en),
  si: flatten(si),
  ta: flatten(ta),
}

const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort()

/** The code column of the table in README/I18N.md (the frontend contract). */
function backendCodes(): string[] {
  const md = readFileSync(resolve(__dirname, "../../../README/I18N.md"), "utf8")
  return [...md.matchAll(/^\|\s*([A-Z][A-Z_]+)\s*\|/gm)].map((m) => m[1])
}

const DISTRICTS = [
  "AMPARA", "ANURADHAPURA", "BADULLA", "BATTICALOA", "COLOMBO", "GALLE",
  "GAMPAHA", "HAMBANTOTA", "JAFFNA", "KALUTARA", "KANDY", "KEGALLE",
  "KILINOCHCHI", "KURUNEGALA", "MANNAR", "MATALE", "MATARA", "MONARAGALA",
  "MULLAITIVU", "NUWARA_ELIYA", "POLONNARUWA", "PUTTALAM", "RATNAPURA",
  "TRINCOMALEE", "VAVUNIYA",
] // prettier-ignore

describe("locale files", () => {
  it("have identical key sets in en, si and ta", () => {
    const keys = Object.keys(flat.en).sort()
    expect(Object.keys(flat.si).sort()).toEqual(keys)
    expect(Object.keys(flat.ta).sort()).toEqual(keys)
  })

  it("use the same {{placeholders}} for every key", () => {
    for (const [key, text] of Object.entries(flat.en)) {
      expect(placeholders(flat.si[key]), `si ${key}`).toEqual(
        placeholders(text)
      )
      expect(placeholders(flat.ta[key]), `ta ${key}`).toEqual(
        placeholders(text)
      )
    }
  })

  it("have no empty strings", () => {
    for (const [lang, entries] of Object.entries(flat)) {
      for (const [key, text] of Object.entries(entries)) {
        expect(text.trim(), `${lang} ${key}`).not.toBe("")
      }
    }
  })

  it("translate every backend error code from README/I18N.md", () => {
    const codes = backendCodes()
    expect(codes.length).toBeGreaterThan(25)
    for (const code of [...codes, "NETWORK_ERROR", "UNKNOWN"]) {
      for (const lang of Object.keys(flat)) {
        expect(
          flat[lang as keyof typeof flat][`errors.${code}`],
          `${lang} errors.${code}`
        ).toBeTruthy()
      }
    }
  })

  it("label all 25 districts", () => {
    for (const district of DISTRICTS) {
      for (const lang of Object.keys(flat)) {
        expect(
          flat[lang as keyof typeof flat][`districts.${district}`]
        ).toBeTruthy()
      }
    }
    expect(Object.keys(locales.en.districts)).toHaveLength(25)
  })
})

describe("translateError", () => {
  const t = (key: string) => (key in flat.en ? flat.en[key] : key)
  // Mirrors i18next's `t(key, { defaultValue })` contract for the fake.
  const tWithDefault = (key: string, options?: { defaultValue?: string }) =>
    key in flat.en ? flat.en[key] : (options?.defaultValue ?? key)

  it("uses errors.<code> when the code is known", () => {
    expect(translateError(t, { code: "EMAIL_TAKEN", message: "x" })).toBe(
      flat.en["errors.EMAIL_TAKEN"]
    )
  })

  it("falls back to the server message for an unknown code", () => {
    expect(
      translateError(tWithDefault, {
        code: "BRAND_NEW",
        message: "Server says",
      })
    ).toBe("Server says")
  })

  it("falls back to errors.UNKNOWN with neither code nor message", () => {
    expect(translateError(tWithDefault, {})).toBe(flat.en["errors.UNKNOWN"])
  })
})
