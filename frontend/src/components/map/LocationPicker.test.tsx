import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LocationPicker } from "@/components/map/LocationPicker"

// Leaflet needs a real browser; the map itself is replaced by a button that
// "clicks" the map at Kandy.
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

function failingGeolocation(code: number): Geo {
  return {
    getCurrentPosition: (_ok, fail) =>
      fail?.({
        code,
        message: "",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }),
  }
}

afterEach(() => stubGeolocation(undefined))

describe("LocationPicker", () => {
  it("reports a map click and shows the chosen point to 6 dp", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<LocationPicker onChange={onChange} />)
    await userEvent.click(
      await screen.findByRole("button", { name: "fake map" })
    )
    expect(onChange).toHaveBeenCalledWith(7.2906, 80.6337)

    rerender(
      <LocationPicker
        value={{ lat: 7.2906, lng: 80.6337 }}
        onChange={onChange}
      />
    )
    expect(screen.getByText("7.290600, 80.633700")).toBeInTheDocument()
  })

  it("uses the device location with a 10 s timeout", async () => {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>((ok) =>
      ok({
        coords: { latitude: 6.0535, longitude: 80.221 },
      } as GeolocationPosition)
    )
    stubGeolocation({ getCurrentPosition })
    const onChange = vi.fn()
    render(<LocationPicker onChange={onChange} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" })
    )

    expect(onChange).toHaveBeenCalledWith(6.0535, 80.221)
    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({
      timeout: 10_000,
    })
  })

  it("explains a denied permission and keeps the map usable", async () => {
    stubGeolocation(failingGeolocation(1))
    const onChange = vi.fn()
    render(<LocationPicker onChange={onChange} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" })
    )

    expect(screen.getByText(/Location access is blocked/)).toBeInTheDocument()
    await userEvent.click(
      await screen.findByRole("button", { name: "fake map" })
    )
    expect(onChange).toHaveBeenCalledWith(7.2906, 80.6337)
  })

  it("explains a timeout", async () => {
    stubGeolocation(failingGeolocation(3))
    render(<LocationPicker onChange={vi.fn()} />)
    await userEvent.click(
      screen.getByRole("button", { name: "Use my location" })
    )
    expect(screen.getByText(/could not find your location/)).toBeInTheDocument()
  })

  it("explains when the browser cannot share a location", async () => {
    stubGeolocation(undefined)
    render(<LocationPicker onChange={vi.fn()} />)
    await act(() =>
      userEvent.click(screen.getByRole("button", { name: "Use my location" }))
    )
    expect(
      screen.getByText(/This browser cannot share your location/)
    ).toBeInTheDocument()
  })

  it("flags a point outside Sri Lanka", () => {
    render(
      <LocationPicker
        value={{ lat: 51.5072, lng: -0.1276 }}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.getByText("The location must be within Sri Lanka.")
    ).toBeInTheDocument()
  })

  it("does not flag a point inside Sri Lanka", () => {
    render(
      <LocationPicker
        value={{ lat: 6.9271, lng: 79.8612 }}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.queryByText("The location must be within Sri Lanka.")
    ).not.toBeInTheDocument()
  })
})
