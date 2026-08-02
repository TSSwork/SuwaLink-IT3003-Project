import { API_BASE_URL } from "../config/env.js";
import { getToken, clearSession } from "../auth/tokenStorage.js";

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.status = status;
    this.errors = errors ?? [];
  }
}

async function handleResponse(response, auth) {
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

  return handleResponse(response, auth);
}

/**
 * Like `request`, but sends a raw FormData body (multipart/form-data) instead of JSON —
 * for endpoints that accept a file upload (e.g. POST /api/prescriptions). Always attaches
 * the Authorization header if a session exists; never sets Content-Type manually so the
 * browser can attach its own multipart boundary.
 * @param {string} path
 * @param {FormData} formData
 * @param {{method?: string}} options
 */
export async function requestMultipart(path, formData, { method = "POST" } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  return handleResponse(response, true);
}
