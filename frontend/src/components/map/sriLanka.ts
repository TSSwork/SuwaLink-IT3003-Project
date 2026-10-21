/**
 * Sri Lanka's bounding box, matching the backend's @DecimalMin/@DecimalMax on
 * pharmacy and prescription coordinates.
 */
export const SRI_LANKA_BOUNDS = {
  minLat: 5.85,
  maxLat: 9.9,
  minLng: 79.5,
  maxLng: 81.95,
} as const

/** Where a map opens when nothing is chosen yet: Colombo. */
export const DEFAULT_CENTRE = { lat: 6.9271, lng: 79.8612 } as const
export const DEFAULT_ZOOM = 13

export interface LatLng {
  lat: number
  lng: number
}

export function isInSriLanka(lat: number, lng: number): boolean {
  const { minLat, maxLat, minLng, maxLng } = SRI_LANKA_BOUNDS
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
}

/** 6 decimal places (about 10 cm), the precision the app shows and stores. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** "6.927100, 79.861200" */
export function formatLatLng({ lat, lng }: LatLng): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
