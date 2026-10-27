import MockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api, registerRouter } from "@/api/client"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"

const user = { id: "u1", name: "Nimal Perera", role: "CUSTOMER" as const }
let mock: MockAdapter
const navigate = vi.fn()

function signIn(token = "tok-1") {
  useSessionStore.getState().setSession(token, user)
}

beforeEach(() => {
  mock = new MockAdapter(api)
  navigate.mockReset()
  registerRouter({
    state: {
      location: { href: "/reservations?tab=1", pathname: "/reservations" },
    },
    navigate,
  })
  useSessionStore.getState().clear()
  useLanguageStore.getState().setLanguage("en")
})

afterEach(() => {
  mock.restore()
  registerRouter(null)
})

describe("request headers", () => {
  it("sends the bearer token and Accept-Language", async () => {
    signIn()
    useLanguageStore.getState().setLanguage("si")
    mock.onGet("/users/me").reply(200, { success: true, data: {} })
    await api.get("/users/me")
    const headers = mock.history.get[0].headers
    expect(headers?.Authorization).toBe("Bearer tok-1")
    expect(headers?.["Accept-Language"]).toBe("si")
  })

  it("omits Authorization when signed out", async () => {
    mock.onGet("/settings/public").reply(200, {})
    await api.get("/settings/public")
    expect(mock.history.get[0].headers?.Authorization).toBeUndefined()
    expect(mock.history.get[0].headers?.["Accept-Language"]).toBe("en")
  })
})

describe("error mapping", () => {
  it("maps a backend error body to ApiError with field errors", async () => {
    const errors = [{ field: "email", code: "EMAIL_INVALID", message: "bad" }]
    mock.onPost("/auth/register/customer").reply(400, {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors,
    })
    const error = await api.post("/auth/register/customer", {}).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      fieldErrors: errors,
    })
  })

  it("maps a network failure to NETWORK_ERROR", async () => {
    mock.onGet("/x").networkError()
    const error = await api.get("/x").catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" })
  })

  it("reads the code from a blob request's error body", async () => {
    mock.onGet("/images/i1/content").reply(
      403,
      new Blob(
        [
          JSON.stringify({
            success: false,
            code: "ACCESS_DENIED",
            message: "no",
          }),
        ],
        { type: "application/json" }
      )
    )
    const error = await api
      .get("/images/i1/content", { responseType: "blob" })
      .catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 403,
      code: "ACCESS_DENIED",
      message: "no",
    })
  })

  it("falls back to UNKNOWN for a blob error body that is not JSON", async () => {
    mock.onGet("/images/i1/content").reply(500, new Blob(["<html>"]))
    const error = await api
      .get("/images/i1/content", { responseType: "blob" })
      .catch((e) => e)
    expect(error).toMatchObject({ status: 500, code: "UNKNOWN" })
  })

  it("falls back to UNKNOWN for a body without a code", async () => {
    mock.onGet("/x").reply(500, "oops")
    const error = await api.get("/x").catch((e) => e)
    expect(error).toMatchObject({ status: 500, code: "UNKNOWN" })
  })
})

describe("401 handling", () => {
  it("clears the session and redirects once for parallel failures", async () => {
    signIn()
    mock
      .onGet()
      .reply(401, { success: false, code: "UNAUTHORIZED", message: "x" })
    const results = await Promise.allSettled([api.get("/a"), api.get("/b")])
    expect(results.every((r) => r.status === "rejected")).toBe(true)
    expect(useSessionStore.getState().token).toBeNull()
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith({
      href: "/login?redirect=%2Freservations%3Ftab%3D1&reason=expired",
      replace: true,
    })
  })

  it("does not redirect a 401 from login", async () => {
    signIn()
    mock.onPost("/auth/login").reply(401, {
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "Bad",
    })
    const error = await api.post("/auth/login", {}).catch((e) => e)
    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" })
    expect(navigate).not.toHaveBeenCalled()
    expect(useSessionStore.getState().token).toBe("tok-1")
  })

  it("ignores a 401 for a request sent without a session", async () => {
    mock.onGet("/a").reply(401, {})
    await api.get("/a").catch(() => undefined)
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not redirect when already on /login", async () => {
    signIn()
    registerRouter({
      state: { location: { href: "/login", pathname: "/login" } },
      navigate,
    })
    mock.onGet("/a").reply(401, {})
    await api.get("/a").catch(() => undefined)
    expect(useSessionStore.getState().token).toBeNull()
    expect(navigate).not.toHaveBeenCalled()
  })
})
