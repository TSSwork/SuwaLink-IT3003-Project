/** Shapes of the backend DTOs (backend/src/main/java/com/suwalink/dto/**). */

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface ApiFieldError {
  field: string
  code: string
  message: string
}

/** Body of every non-2xx response (ApiErrorResponse). */
export interface ApiErrorBody {
  success: false
  code: string
  message: string
  errors?: Array<ApiFieldError> | null
}

export type Role = "CUSTOMER" | "PHARMACY_OWNER" | "ADMIN"

export const DISTRICTS = [
  "AMPARA",
  "ANURADHAPURA",
  "BADULLA",
  "BATTICALOA",
  "COLOMBO",
  "GALLE",
  "GAMPAHA",
  "HAMBANTOTA",
  "JAFFNA",
  "KALUTARA",
  "KANDY",
  "KEGALLE",
  "KILINOCHCHI",
  "KURUNEGALA",
  "MANNAR",
  "MATALE",
  "MATARA",
  "MONARAGALA",
  "MULLAITIVU",
  "NUWARA_ELIYA",
  "POLONNARUWA",
  "PUTTALAM",
  "RATNAPURA",
  "TRINCOMALEE",
  "VAVUNIYA",
] as const
export type District = (typeof DISTRICTS)[number]

export type LanguageCode = "en" | "si" | "ta"

export interface AuthResponse {
  token: string
  role: Role
  id: string
  name: string
}

export interface PharmacyInfo {
  id: string
  licenceNo: string
  address: string
  status: string
}

/** GET /api/users/me */
export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  preferredLanguage: LanguageCode
  district: District | null
  /** Present for pharmacy owners only. */
  pharmacy: PharmacyInfo | null
}

export interface DemoAccount {
  role: Role
  email: string
  password: string
}

/** GET /api/settings/public (AppSettingsResponse). */
export interface PublicSettings {
  demoModePublic: boolean
  demoAccounts: Array<DemoAccount>
}

export interface LoginRequest {
  email: string
  password: string
}

export interface CustomerRegisterRequest {
  name: string
  email: string
  phone: string
  password: string
  acceptTerms: boolean
}

export interface PharmacyRegisterRequest {
  name: string
  email: string
  phone: string
  password: string
  licenceNo: string
  address: string
  pharmacyName: string
  district: District
  city: string
  latitude: number
  longitude: number
  openingHours?: string
  acceptTerms: boolean
}

export interface ResetPasswordRequest {
  email: string
  otp: string
  newPassword: string
}

/** GET /api/categories (public): active categories only. */
export interface CategoryOption {
  id: string
  name: string
}

/** GET /api/notifications item (NotificationResponse), rendered in the request language. */
export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  /** Frontend route to open, or null. */
  link: string | null
  read: boolean
  createdAt: string
}

/** PageResponse<T>: `page` is 0-based. */
export interface Page<T> {
  content: Array<T>
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** PrescriptionStatus: anything but OTC needs a prescription. */
export type LegalCategory =
  "OTC" | "PRESCRIPTION" | "CONTROLLED" | "SCHEDULE_III"

/** GET /api/medicines/search item (MedicineSearchResult). */
export interface MedicineSearchResult {
  medicineId: string
  brandName: string
  genericName: string
  dosageForm: string
  strength: string
  category: string
  manufacturer: string
  legalCategory: LegalCategory
  requiresPrescription: boolean
  imageUrl: string | null
  /** Distinct pharmacies with stock; always at least 1. */
  pharmacyCount: number
  lowestPrice: number
  currency: "LKR"
  /** Null when no lat/lng was sent. */
  nearestDistanceKm: number | null
}

/** GET /api/medicines/{id} (MedicineDetailResponse). */
export interface MedicineDetail {
  medicineId: string
  brandName: string
  genericName: string
  dosageForm: string
  strength: string
  category: string
  manufacturer: string
  legalCategory: LegalCategory
  requiresPrescription: boolean
  imageUrl: string | null
  description: string | null
}

/** GET /api/medicines/{id}/offers item (OfferResponse). */
export interface Offer {
  inventoryId: string
  unitPrice: number
  currency: "LKR"
  stockQuantity: number
  /** LocalDate, "YYYY-MM-DD". */
  expireDate: string
  distanceKm: number | null
  pharmacy: {
    id: string
    name: string
    phone: string | null
    address: string
    district: District
    city: string
    latitude: number
    longitude: number
    openingHours: string | null
  }
}

export type OfferSort = "distance" | "price"

export type ReservationStatus =
  "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED"

/** ReservationResponse; dates are LocalDateTime strings without a zone. */
export interface Reservation {
  id: string
  pickupCode: string
  status: ReservationStatus
  expiresAt: string
  createdAt: string
  cancelReason: string | null
  cancelledBy: "PATIENT" | "PHARMACY" | null
  prescriptionRequestId: string | null
  /** True when any line needs a prescription at pickup. */
  requiresPrescription: boolean
  total: number
  pharmacy: {
    id: string
    name: string
    phone: string | null
    address: string
    city: string
    district: District
    latitude: number
    longitude: number
  }
  customer: { id: string; name: string }
  items: Array<{
    id: string
    inventoryItemId: string
    medicineName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    requiresPrescription: boolean
  }>
}

/** GET /api/pharmacies/{id} item (PharmacyPublicResponse.Item): in stock, available, not expired. */
export interface PublicPharmacyItem {
  inventoryId: string
  medicineId: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  requiresPrescription: boolean
  unitPrice: number
  currency: "LKR"
  stockQuantity: number
}

/** GET /api/pharmacies/{id} (PharmacyPublicResponse); 404 unless publicly visible. */
export interface PublicPharmacy {
  id: string
  name: string
  phone: string | null
  address: string
  district: District
  city: string
  latitude: number
  longitude: number
  openingHours: string | null
  items: Array<PublicPharmacyItem>
}

/** InventoryResponse, as nested in a bookmark. */
export interface InventoryItem {
  id: string
  unitPrice: number
  currency: "LKR"
  stockQuantity: number
  /** LocalDate, "YYYY-MM-DD". */
  expireDate: string
  available: boolean
  imageUrl: string | null
  medicine: {
    id: string
    brandName: string
    genericName: string
    dosageForm: string
    strength: string
    unitOfMeasure: string
    legalCategory: LegalCategory
    category: string | null
    manufacturer: string | null
  }
  pharmacy: { id: string; name: string; address: string }
}

/** GET /api/bookmarks item (BookmarkResponse), newest first. */
export interface Bookmark {
  id: string
  createdAt: string
  inventory: InventoryItem
}

export type PrescriptionStatus = "PENDING" | "RESPONDED" | "CLOSED" | "EXPIRED"

/** TargetScope: which pharmacies receive a prescription request. */
export type TargetScope = "RADIUS_10KM" | "DISTRICT" | "ALL"

/** PrescriptionRequestResponse; dates are LocalDateTime strings without a zone. */
export interface PrescriptionRequest {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  note: string | null
  status: PrescriptionStatus
  imageId: string
  /** Authenticated: "/api/images/{id}/content"; fetch with the token, never as a plain <img src>. */
  imageUrl: string
  targetScope: TargetScope
  /** Set for DISTRICT requests. */
  district: District | null
  /** How many pharmacies received it. */
  targetCount: number
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

/** PrescriptionResponseResponse: one pharmacy's reply with quoted lines. */
export interface PrescriptionReply {
  id: string
  prescriptionRequestId: string
  pharmacyId: string
  pharmacyName: string
  /** False once the pharmacy was deactivated. */
  pharmacyActive: boolean
  message: string | null
  items: Array<{
    /** prescriptionResponseItemId when reserving. */
    id: string
    inventoryItemId: string
    medicineBrandName: string
    /** The quoted quantity (the reservable maximum). */
    quantity: number
    unitPrice: number
  }>
  createdAt: string
}
