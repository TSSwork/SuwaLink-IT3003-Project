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
