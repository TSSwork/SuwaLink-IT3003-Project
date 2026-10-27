import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import MapView from "@/components/map/MapView"

// Leaflet needs a real browser; capture what MapContainer is configured with.
const containerProps = vi.hoisted(() => {
  const holder: { current: Record<string, unknown> } = { current: {} }
  return holder
})
vi.mock("react-leaflet", () => ({
  MapContainer: (props: Record<string, unknown>) => {
    containerProps.current = props
    return null
  },
  Marker: () => null,
  TileLayer: () => null,
  useMap: () => null,
  useMapEvents: () => null,
}))

const point = { lat: 6.9, lng: 79.8 }

describe("MapView", () => {
  it("lets a read-only map pass touch swipes and wheel scrolls to the page", () => {
    render(<MapView value={point} height="100%" label="Map" />)
    expect(containerProps.current.dragging).toBe(false)
    expect(containerProps.current.scrollWheelZoom).toBe(false)
    expect(containerProps.current.style).toEqual({ height: "100%" })
  })

  it("keeps panning on a map the user picks a point on", () => {
    render(<MapView value={point} onPick={() => {}} height={320} label="Map" />)
    expect(containerProps.current.dragging).toBe(true)
    expect(containerProps.current.scrollWheelZoom).toBe(true)
    expect(containerProps.current.style).toEqual({ height: 320 })
  })
})
