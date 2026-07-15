const STORAGE_KEY = "suwalink.auth";

export function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession({ token, role, id, name }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role, id, name }));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return getSession()?.token ?? null;
}
