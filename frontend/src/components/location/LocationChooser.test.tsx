import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocationChooser } from "@/components/location/LocationChooser"
import { useLocationStore } from "@/stores/locationStore"

vi.mock("@/components/map/MapView", () => ({
  default: ({ onPick }: { onPick: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => onPick(7.2906, 80.6337)}>
      fake map
    </button>
  ),
}))

type Geo = Pick<Geolocation, "getCurrentPosition">

function stubGeolocation(geo: Geo | undefined) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: geo,
  })
}

beforeEach(() => useLocationStore.getState().clear())
afterEach(() => stubGeolocation(undefined))

describe("LocationChooser", () => {
  it("shows a prompt chip when nothing is chosen", () => {
    render(<LocationChooser />)
    expect(
      screen.getByRole("button", { name: /Set your location/ })
    ).toBeInTheDocument()
  })

  it("uses the device location and shows 'Near me'", async () => {
    stubGeolocation({
      getCurrentPosition: (ok) =>
        ok({
          coords: { latitude: 6.9271, longitude: 79.8612 },
        } as GeolocationPosition),
    })
    const user = userEvent.setup()
    render(<LocationChooser />)
    await user.click(screen.getByRole("button", { name: /Set your location/ }))
    await user.click(screen.getByRole("button", { name: "Use my location" }))

    expect(useLocationStore.getState()).toMatchObject({
      mode: "point",
      lat: 6.9271,
      lng: 79.8612,
    })
    expect(screen.getByRole("button", { name: /Near me/ })).toBeInTheDocument()
  })

  it("falls back to a district when location access is denied", async () => {
    stubGeolocation({
      getCurrentPosition: (_ok, fail) =>
        fail?.({
          code: 1,
          message: "",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        }),
    })
    const user = userEvent.setup()
    render(<LocationChooser />)
    await user.click(screen.getByRole("button", { name: /Set your location/ }))
    await user.click(screen.getByRole("button", { name: "Use my location" }))
    expect(screen.getByText(/Location access is blocked/)).toBeInTheDocument()
    expect(useLocationStore.getState().mode).toBe("none")

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Kandy" }))

    expect(useLocationStore.getState()).toMatchObject({
      mode: "district",
      district: "KANDY",
    })
    expect(screen.getByRole("button", { name: /Kandy/ })).toBeInTheDocument()
  })

  it("lets the person choose a point on the map", async () => {
    const user = userEvent.setup()
    render(<LocationChooser />)
    await user.click(screen.getByRole("button", { name: /Set your location/ }))
    await user.click(screen.getByRole("button", { name: "Choose on map" }))
    await user.click(await screen.findByRole("button", { name: "fake map" }))

    expect(useLocationStore.getState()).toMatchObject({
      mode: "point",
      lat: 7.2906,
      lng: 80.6337,
    })
  })

  it("clears the location", async () => {
    useLocationStore.getState().setDistrict("GALLE")
    const user = userEvent.setup()
    render(<LocationChooser />)
    await user.click(screen.getByRole("button", { name: /Galle/ }))
    await user.click(screen.getByRole("button", { name: "Clear location" }))
    expect(useLocationStore.getState().mode).toBe("none")
  })
})
