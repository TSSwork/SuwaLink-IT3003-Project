import { API_BASE_URL } from "../config/env.js";
import { getToken, clearSession } from "../auth/tokenStorage.js";

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.status = status;
    this.errors = errors ?? [];
  }
}

/**
 * @param {string} path e.g. "/api/auth/login"
 * @param {{method?: string, body?: object, auth?: boolean}} options
 */
export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let envelope = null;
  try {
    envelope = await response.json();
  } catch {
    // No JSON body (e.g. network-level failure surfaced as a non-JSON response).
  }

  if (response.status === 401 && auth) {
    clearSession();
    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
  }

  if (!response.ok || !envelope?.success) {
    throw new ApiError(envelope?.message ?? "Something went wrong. Please try again.", {
      status: response.status,
      errors: envelope?.errors,
    });
  }

  return envelope.data;
}
