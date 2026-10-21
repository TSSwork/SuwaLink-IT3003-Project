import axios from "axios"
import type { InternalAxiosRequestConfig } from "axios"
import type { ApiErrorBody, ApiFieldError } from "@/api/types"
import { getCurrentLanguage } from "@/i18n"
import { useSessionStore } from "@/stores/sessionStore"

/** Fits `translateError`'s `{code, message}` input. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Array<ApiFieldError>

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Array<ApiFieldError> = []
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

/** The slice of the TanStack router the client needs; see `registerRouter`. */
interface NavigableRouter {
  state: { location: { href: string; pathname: string } }
  navigate: (options: { href: string; replace?: boolean }) => unknown
}

let router: NavigableRouter | null = null

/** Called once by the root layout so a 401 can navigate without a reload. */
export function registerRouter(instance: NavigableRouter | null): void {
  router = instance
}

export const api = axios.create({ baseURL: "/api" })

const LOGIN_PATH = "/auth/login"

api.interceptors.request.use((config) => {
  const { token } = useSessionStore.getState()
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  config.headers.set("Accept-Language", getCurrentLanguage())
  return config
})

function isLoginRequest(config?: InternalAxiosRequestConfig): boolean {
  return config?.method?.toLowerCase() === "post" && config.url === LOGIN_PATH
}

/**
 * Ends an expired session. Only the first 401 of a burst acts: it clears the
 * session, so the others no longer carry the live token and are ignored. That
 * also covers a stale in-flight request finishing after a fresh sign-in.
 */
function handleUnauthorized(config?: InternalAxiosRequestConfig): void {
  const sentAuth = config?.headers.get("Authorization")
  const { token, clear } = useSessionStore.getState()
  if (!token || sentAuth !== `Bearer ${token}`) return
  clear()

  const here = router
    ? router.state.location
    : {
        href: window.location.pathname + window.location.search,
        pathname: window.location.pathname,
      }
  if (here.pathname === "/login") return
  const href = `/login?redirect=${encodeURIComponent(here.href)}&reason=expired`
  if (router) void router.navigate({ href, replace: true })
  else window.location.assign(href)
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error) || axios.isCancel(error)) {
      return Promise.reject(error instanceof Error ? error : new Error("?"))
    }
    if (!error.response) {
      return Promise.reject(new ApiError(0, "NETWORK_ERROR", error.message, []))
    }
    const { status, data } = error.response
    if (status === 401 && !isLoginRequest(error.config)) {
      handleUnauthorized(error.config)
    }
    const body = (data ?? {}) as Partial<ApiErrorBody>
    return Promise.reject(
      new ApiError(
        status,
        body.code ?? "UNKNOWN",
        body.message ?? error.message,
        body.errors ?? []
      )
    )
  }
)
