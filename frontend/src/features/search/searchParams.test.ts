import { describe, expect, it } from "vitest"
import { validateSearchParams } from "@/features/search/searchParams"

const CATEGORY = "3f2b8c1e-6a4d-4e2f-9b1a-0c5d7e8f9a10"

describe("validateSearchParams", () => {
  it("keeps a trimmed query, a category id and a page from 1", () => {
    expect(
      validateSearchParams({ q: "  panadol ", category: CATEGORY, page: 3 })
    ).toEqual({ q: "panadol", category: CATEGORY, page: 3 })
  })

  it("accepts the page as a string, as it arrives from a typed URL", () => {
    expect(validateSearchParams({ page: "2" })).toEqual({ page: 2 })
  })

  it("drops empty, malformed and out-of-range values instead of failing", () => {
    expect(
      validateSearchParams({ q: "   ", category: "not-an-id", page: 0 })
    ).toEqual({})
    expect(validateSearchParams({ page: "abc" })).toEqual({})
    expect(validateSearchParams({ page: 1.5 })).toEqual({})
    expect(validateSearchParams({ q: 42 })).toEqual({ q: "42" })
  })

  it("leaves page 1 out of the URL", () => {
    expect(validateSearchParams({ q: "x", page: 1 })).toEqual({ q: "x" })
  })

  it("caps an overlong query at 100 characters", () => {
    expect(validateSearchParams({ q: "a".repeat(150) }).q).toHaveLength(100)
  })
})
