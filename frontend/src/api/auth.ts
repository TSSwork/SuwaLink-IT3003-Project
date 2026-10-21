import { api } from "@/api/client"
import type {
  ApiResponse,
  AuthResponse,
  CustomerRegisterRequest,
  LoginRequest,
  PharmacyRegisterRequest,
  PublicSettings,
  ResetPasswordRequest,
  UserProfile,
} from "@/api/types"

async function data<T>(request: Promise<{ data: ApiResponse<T> }>) {
  return (await request).data.data
}

export const login = (body: LoginRequest) =>
  data<AuthResponse>(api.post("/auth/login", body))

export const registerCustomer = (body: CustomerRegisterRequest) =>
  data<AuthResponse>(api.post("/auth/register/customer", body))

/** Pharmacies register as pending: no token comes back. */
export const registerPharmacy = (body: PharmacyRegisterRequest) =>
  data<void>(api.post("/auth/register/pharmacy", body))

export const forgotPassword = (email: string) =>
  data<void>(api.post("/auth/forgot-password", { email }))

export const resetPassword = (body: ResetPasswordRequest) =>
  data<void>(api.post("/auth/reset-password", body))

export const getMe = () => data<UserProfile>(api.get("/users/me"))

export const getPublicSettings = () =>
  data<PublicSettings>(api.get("/settings/public"))
