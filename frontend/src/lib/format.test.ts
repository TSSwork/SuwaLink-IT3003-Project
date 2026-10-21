import { describe, expect, it } from "vitest"
import {
  formatDateTime,
  formatDistance,
  formatPrice,
  formatRelative,
} from "@/lib/format"

describe("formatPrice", () => {
  it("formats LKR in English", () => {
    expect(formatPrice(1250.5, "en")).toMatch(/^LKR\s?1,250\.50$/)
  })

  it("uses the language's own locale for si and ta", () => {
    const si = formatPrice(1250, "si")
    const ta = formatPrice(1250, "ta")
    expect(si).toContain("1,250")
    expect(ta).toContain("1,250")
    expect(si).not.toEqual(formatPrice(1250, "en"))
    expect(ta).not.toEqual(formatPrice(1250, "en"))
  })
})

describe("formatDistance", () => {
  it("shows metres rounded to 50 m under 1 km", () => {
    expect(formatDistance(0.42, "en")).toBe("400 m")
    expect(formatDistance(0.43, "en")).toBe("450 m")
    expect(formatDistance(0.01, "en")).toBe("0 m")
  })

  it("shows one decimal km from 1 km", () => {
    expect(formatDistance(2.44, "en")).toBe("2.4 km")
    expect(formatDistance(1, "en")).toBe("1 km")
    expect(formatDistance(12.06, "en")).toBe("12.1 km")
  })

  it("never shows 1000 m", () => {
    expect(formatDistance(0.99, "en")).toBe("1 km")
  })

  it("returns an empty string when the distance is unknown", () => {
    expect(formatDistance(null, "en")).toBe("")
  })

  it("localises the unit for si and ta", () => {
    expect(formatDistance(2.4, "si")).not.toBe(formatDistance(2.4, "en"))
    expect(formatDistance(2.4, "ta")).not.toBe(formatDistance(2.4, "en"))
    expect(formatDistance(0.4, "ta")).toContain("400")
  })
})

describe("formatDateTime and formatRelative", () => {
  it("formats a date and time", () => {
    const text = formatDateTime("2026-10-21T09:30:00Z", "en")
    expect(text).toContain("2026")
    expect(text).toMatch(/\d{1,2}:\d{2}/)
  })

  it("describes the past and future relatively", () => {
    const now = Date.parse("2026-10-21T12:00:00Z")
    expect(formatRelative("2026-10-21T11:30:00Z", "en", now)).toBe(
      "30 minutes ago"
    )
    expect(formatRelative("2026-10-21T14:00:00Z", "en", now)).toBe("in 2 hours")
    expect(formatRelative("2026-10-19T12:00:00Z", "en", now)).toBe("2 days ago")
    expect(formatRelative("2026-10-21T12:00:10Z", "en", now)).toBe("now")
  })
})
