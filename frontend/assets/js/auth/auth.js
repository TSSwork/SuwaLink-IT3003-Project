import { request } from "../api/apiService.js";
import { setSession, clearSession, getSession } from "./tokenStorage.js";

export async function registerCustomer({ name, email, phone, password }) {
  const data = await request("/api/auth/register/customer", {
    method: "POST",
    auth: false,
    body: { name, email, phone, password },
  });
  setSession(data);
  return data;
}

export async function registerPharmacy({ name, email, phone, password, licenceNo, address }) {
  return request("/api/auth/register/pharmacy", {
    method: "POST",
    auth: false,
    body: { name, email, phone, password, licenceNo, address },
  });
}

export async function login({ email, password }) {
  const data = await request("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  setSession(data);
  return data;
}

export async function forgotPassword({ email }) {
  return request("/api/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export async function resetPassword({ email, otp, newPassword }) {
  return request("/api/auth/reset-password", {
    method: "POST",
    auth: false,
    body: { email, otp, newPassword },
  });
}

export function logout() {
  clearSession();
  window.location.href = "index.html";
}

export function getCurrentAuth() {
  return getSession();
}

export function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

export function homePathForRole(role) {
  if (role === "PHARMACY_OWNER") return "pharmacy-dashboard.html";
  if (role === "CUSTOMER") return "patient-dashboard.html";
  if (role === "ADMIN") return "admin-dashboard.html";
  return "index.html";
}

/** Call at the top of login/register pages: bounces an already-authenticated
 * user straight to their role's home page instead of showing the auth form. */
export function redirectIfAuthenticated() {
  const session = getSession();
  if (session) {
    window.location.href = homePathForRole(session.role);
  }
  return session;
}
