import { describe, expect, it } from "vitest"
import { parsePickupCode } from "@/lib/pickupCode"

describe("parsePickupCode", () => {
  it("accepts a bare code", () => {
    expect(parsePickupCode("K7Q2MXH4PA")).toBe("K7Q2MXH4PA")
  })

  it("trims and upper-cases what was typed", () => {
    expect(parsePickupCode("  k7q2mxh4pa \n")).toBe("K7Q2MXH4PA")
  })

  it("reads the code from the reservation's QR link", () => {
    expect(parsePickupCode("http://localhost:3000/r/K7Q2MXH4PA")).toBe(
      "K7Q2MXH4PA"
    )
    expect(parsePickupCode("https://suwalink.lk/r/k7q2mxh4pa?x=1#top")).toBe(
      "K7Q2MXH4PA"
    )
  })

  it("takes only the code from a link on another origin", () => {
    expect(parsePickupCode("https://elsewhere.example/r/K7Q2MXH4PA")).toBe(
      "K7Q2MXH4PA"
    )
  })

  it.each([
    "https://suwalink.lk/reservations/K7Q2MXH4PA",
    "https://suwalink.lk/r/K7Q2MXH4PA/",
    "https://suwalink.lk/x/r/K7Q2MXH4PA",
    "https://suwalink.lk/r/",
    "https://elsewhere.example/pay",
    "/r/K7Q2MXH4PA",
  ])("rejects a link with the wrong path: %s", (input) => {
    expect(parsePickupCode(input)).toBeNull()
  })

  it.each([
    "javascript:/r/K7Q2MXH4PA",
    "javascript:alert(1)//r/K7Q2MXH4PA",
    "data:text/html,/r/K7Q2MXH4PA",
  ])("rejects a non-web link: %s", (input) => {
    expect(parsePickupCode(input)).toBeNull()
  })

  it.each([
    "K7Q2MXH40A",
    "K7Q2MXHOPA",
    "K7Q2MXH1PA",
    "K7Q2MXHIPA",
    "K7Q2MXHLPA",
  ])("rejects characters codes never use: %s", (input) => {
    expect(parsePickupCode(input)).toBeNull()
    expect(parsePickupCode(`https://suwalink.lk/r/${input}`)).toBeNull()
  })

  it.each(["K7Q2MX", "K7Q2MXH4P", "K7Q2MXH4PAB", "", "   ", "K7Q2 MXH4PA"])(
    "rejects the wrong length: %j",
    (input) => {
      expect(parsePickupCode(input)).toBeNull()
    }
  )
})
