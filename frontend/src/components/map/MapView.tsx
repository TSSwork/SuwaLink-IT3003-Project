import { useEffect } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png"
import markerIconUrl from "leaflet/dist/images/marker-icon.png"
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png"
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"
import type { LatLng } from "@/components/map/sriLanka"
import { DEFAULT_CENTRE, DEFAULT_ZOOM } from "@/components/map/sriLanka"

// Leaflet's default icon finds its images by a CSS-relative path that Vite's
// bundling breaks; import them so Vite fingerprints and serves them.
const markerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
})

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
// OSM's licence requires this credit as written.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const FOCUS_ZOOM = 16

/** A request to centre the map on a point, e.g. after "Use my location". */
export interface CentreRequest extends LatLng {
  /** Changes on every request, so the same point can be centred twice. */
  seq: number
}

export interface MapViewProps {
  value?: LatLng
  onPick: (lat: number, lng: number) => void
  centreRequest?: CentreRequest
  height: number
  label: string
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

function PickOnClick({ onPick }: Pick<MapViewProps, "onPick">) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) })
  return null
}

/**
 * Names the map's focusable container (MapContainer does not pass ARIA props
 * through). "application": arrow keys pan and +/- zoom while it has focus.
 */
function LabelContainer({ label }: { label: string }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    container.setAttribute("role", "application")
    container.setAttribute("aria-label", label)
  }, [map, label])
  return null
}

/** Centres on request, and follows a value typed elsewhere off-screen. */
function FollowValue({
  value,
  centreRequest,
}: Pick<MapViewProps, "value" | "centreRequest">) {
  const map = useMap()
  useEffect(() => {
    if (!centreRequest) return
    map.setView([centreRequest.lat, centreRequest.lng], FOCUS_ZOOM, {
      animate: !prefersReducedMotion(),
    })
  }, [map, centreRequest])
  const lat = value?.lat
  const lng = value?.lng
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    if (!map.getBounds().contains([lat, lng])) {
      map.setView([lat, lng], Math.max(map.getZoom(), FOCUS_ZOOM), {
        animate: false,
      })
    }
  }, [map, lat, lng])
  return null
}

/** The Leaflet map behind LocationPicker. Browser-only: load it lazily. */
export default function MapView({
  value,
  onPick,
  centreRequest,
  height,
  label,
}: MapViewProps) {
  const centre = value ?? DEFAULT_CENTRE
  return (
    <MapContainer
      center={[centre.lat, centre.lng]}
      zoom={value ? FOCUS_ZOOM : DEFAULT_ZOOM}
      style={{ height }}
      className="z-0 w-full"
    >
      <LabelContainer label={label} />
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <PickOnClick onPick={onPick} />
      <FollowValue value={value} centreRequest={centreRequest} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const { lat, lng } = (event.target as L.Marker).getLatLng()
              onPick(lat, lng)
            },
          }}
        />
      )}
    </MapContainer>
  )
}
