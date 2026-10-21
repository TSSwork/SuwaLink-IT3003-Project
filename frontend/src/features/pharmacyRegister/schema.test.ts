import { describe, expect, it } from "vitest"
import {
  locationStepSchema,
  ownerStepSchema,
  pharmacyStepSchema,
} from "@/features/pharmacyRegister/schema"

const owner = {
  name: "Nimal Perera",
  email: "nimal@example.lk",
  phone: "0771234567",
  password: "secret123",
  confirmPassword: "secret123",
}

const pharmacy = {
  pharmacyName: "Nimal Pharmacy",
  licenceNo: "NMRA-1234",
  address: "12 Temple Road",
  district: "KANDY",
  city: "Kandy",
  openingHours: "",
}

function messages(result: {
  success: boolean
  error?: { issues: Array<{ path: Array<PropertyKey>; message: string }> }
}) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      issue.path.join("."),
      issue.message,
    ])
  )
}

describe("ownerStepSchema", () => {
  it("accepts a complete owner", () => {
    expect(ownerStepSchema.safeParse(owner).success).toBe(true)
  })

  it("needs a matching password of 8+ characters", () => {
    expect(
      messages(
        ownerStepSchema.safeParse({
          ...owner,
          password: "short",
          confirmPassword: "short",
        })
      )
    ).toEqual({ password: "validation.passwordLength" })
    expect(
      messages(
        ownerStepSchema.safeParse({ ...owner, confirmPassword: "secret124" })
      )
    ).toEqual({ confirmPassword: "validation.passwordMismatch" })
  })
})

describe("pharmacyStepSchema", () => {
  it("accepts a pharmacy without opening hours", () => {
    expect(pharmacyStepSchema.safeParse(pharmacy).success).toBe(true)
  })

  it("requires a district from the list", () => {
    expect(
      messages(pharmacyStepSchema.safeParse({ ...pharmacy, district: "" }))
    ).toEqual({
      district: "validation.required",
    })
    expect(
      pharmacyStepSchema.safeParse({ ...pharmacy, district: "ATLANTIS" })
        .success
    ).toBe(false)
  })

  it("applies the backend's length limits", () => {
    expect(
      messages(
        pharmacyStepSchema.safeParse({
          ...pharmacy,
          pharmacyName: "x".repeat(121),
          city: "x".repeat(81),
          openingHours: "x".repeat(256),
        })
      )
    ).toEqual({
      pharmacyName: "validation.tooLong",
      city: "validation.tooLong",
      openingHours: "validation.tooLong",
    })
  })
})

describe("locationStepSchema", () => {
  it.each([
    ["5.85", "79.50"],
    ["9.90", "81.95"],
    ["6.927100", "79.861200"],
  ])("accepts (%s, %s)", (latitude, longitude) => {
    expect(locationStepSchema.safeParse({ latitude, longitude }).success).toBe(
      true
    )
  })

  it.each([
    ["5.84", "80", "latitude"],
    ["9.91", "80", "latitude"],
    ["7", "79.49", "longitude"],
    ["7", "81.96", "longitude"],
  ])("rejects (%s, %s) as outside Sri Lanka", (latitude, longitude, field) => {
    expect(
      messages(locationStepSchema.safeParse({ latitude, longitude }))
    ).toEqual({
      [field]: "validation.coordinatesRange",
    })
  })

  it("requires numbers", () => {
    expect(
      messages(locationStepSchema.safeParse({ latitude: "", longitude: "abc" }))
    ).toEqual({
      latitude: "validation.required",
      longitude: "validation.number",
    })
  })
})
