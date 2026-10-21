import { beforeEach, describe, expect, it } from "vitest"
import { LOCATION_STORAGE_KEY, useLocationStore } from "@/stores/locationStore"

beforeEach(() => {
  localStorage.clear()
  useLocationStore.getState().clear()
})

describe("locationStore", () => {
  it("starts with no location", () => {
    expect(useLocationStore.getState().mode).toBe("none")
  })

  it("setPoint keeps coordinates and drops any district", () => {
    useLocationStore.getState().setDistrict("KANDY")
    useLocationStore.getState().setPoint(7.29, 80.63, "Near me")
    expect(useLocationStore.getState()).toMatchObject({
      mode: "point",
      lat: 7.29,
      lng: 80.63,
      label: "Near me",
      district: undefined,
    })
  })

  it("setDistrict drops any point", () => {
    useLocationStore.getState().setPoint(7.29, 80.63)
    useLocationStore.getState().setDistrict("KANDY")
    expect(useLocationStore.getState()).toMatchObject({
      mode: "district",
      district: "KANDY",
      lat: undefined,
      lng: undefined,
    })
  })

  it("clear goes back to none", () => {
    useLocationStore.getState().setDistrict("GALLE")
    useLocationStore.getState().clear()
    expect(useLocationStore.getState().mode).toBe("none")
    expect(useLocationStore.getState().district).toBeUndefined()
  })

  it("persists under suwalink.location", () => {
    useLocationStore.getState().setDistrict("GALLE")
    const stored = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY)!)
    expect(LOCATION_STORAGE_KEY).toBe("suwalink.location")
    expect(stored.state).toMatchObject({ mode: "district", district: "GALLE" })
  })

  it("defaultToDistrict fills only an empty location", () => {
    useLocationStore.getState().defaultToDistrict("COLOMBO")
    expect(useLocationStore.getState()).toMatchObject({
      mode: "district",
      district: "COLOMBO",
    })
    useLocationStore.getState().defaultToDistrict("KANDY")
    expect(useLocationStore.getState().district).toBe("COLOMBO")

    useLocationStore.getState().setPoint(7, 80)
    useLocationStore.getState().defaultToDistrict("KANDY")
    expect(useLocationStore.getState().mode).toBe("point")
  })
})
