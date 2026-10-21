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
