import { describe, expect, it } from "vitest"
import {
  SRI_LANKA_BOUNDS,
  isInSriLanka,
  roundCoordinate,
} from "@/components/map/sriLanka"

describe("isInSriLanka", () => {
  it.each([
    [6.9271, 79.8612, true], // Colombo
    [9.6615, 80.0255, true], // Jaffna
    [5.85, 79.5, true], // south-west corner, inclusive
    [9.9, 81.95, true], // north-east corner, inclusive
    [5.849, 80, false],
    [9.901, 80, false],
    [7, 79.499, false],
    [7, 81.951, false],
    [51.5072, -0.1276, false], // London
    [Number.NaN, 80, false],
  ])("(%s, %s) → %s", (lat, lng, expected) => {
    expect(isInSriLanka(lat, lng)).toBe(expected)
  })

  it("matches the backend's @DecimalMin/@DecimalMax", () => {
    expect(SRI_LANKA_BOUNDS).toEqual({
      minLat: 5.85,
      maxLat: 9.9,
      minLng: 79.5,
      maxLng: 81.95,
    })
  })
})

describe("roundCoordinate", () => {
  it("keeps 6 decimal places", () => {
    expect(roundCoordinate(6.927123456)).toBe(6.927123)
    expect(roundCoordinate(79.8612005)).toBe(79.861201)
  })
})
