import { describe, expect, it } from "vitest"
import { safeRedirect } from "@/features/auth/schemas"

describe("safeRedirect", () => {
  it.each([
    ["/pharmacy?tab=1", "/pharmacy?tab=1"],
    ["/reservations#latest", "/reservations#latest"],
    ["https://evil.com", undefined],
    ["javascript:alert(1)", undefined],
    ["//evil.com", undefined],
    ["/\\evil.com", undefined],
    ["/\t/evil.com", undefined],
    ["/\n/evil.com", undefined],
    ["", undefined],
    [undefined, undefined],
  ])("%j -> %j", (target, expected) => {
    expect(safeRedirect(target)).toBe(expected)
  })
})
