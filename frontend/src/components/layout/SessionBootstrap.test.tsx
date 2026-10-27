import { AxiosError } from "axios"
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { api, registerRouter } from "@/api/client"
import { SessionBootstrap } from "@/components/layout/SessionBootstrap"
import { requireRole } from "@/lib/guards"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

const originalAdapter = api.defaults.adapter

function respondWith(status: number, data: unknown, calls?: Array<string>) {
  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    calls?.push(`${config.method} ${config.url}`)
    const response = { data, status, statusText: "", headers: {}, config }
    return status < 400
      ? Promise.resolve(response)
      : Promise.reject(
          new AxiosError("fail", "ERR_BAD_REQUEST", config, null, response)
        )
  }
  api.defaults.adapter = adapter
}

const me = {
  id: "1",
  name: "Nimal Perera",
  email: "n@x.lk",
  phone: null,
  role: "CUSTOMER",
  preferredLanguage: "en",
  district: "KANDY",
  pharmacy: null,
}

beforeEach(() => {
  useSessionStore.getState().clear()
  useLocationStore.getState().clear()
})
afterEach(() => {
  api.defaults.adapter = originalAdapter
  registerRouter(null)
})

describe("SessionBootstrap", () => {
  it("refreshes the stored name and role, and defaults the location to the preferred district", async () => {
    useSessionStore
      .getState()
      .setSession("tok", { id: "1", name: "Old Name", role: "CUSTOMER" })
    respondWith(200, { success: true, message: "", data: me })
    render(<SessionBootstrap />)

    await waitFor(() =>
      expect(useSessionStore.getState().user?.name).toBe("Nimal Perera")
    )
    expect(useSessionStore.getState().token).toBe("tok")
    expect(useLocationStore.getState()).toMatchObject({
      mode: "district",
      district: "KANDY",
    })
  })

  it("does not overwrite an existing location choice", async () => {
    useSessionStore
      .getState()
      .setSession("tok", { id: "1", name: "Old", role: "CUSTOMER" })
    useLocationStore.getState().setDistrict("GALLE")
    respondWith(200, { success: true, message: "", data: me })
    render(<SessionBootstrap />)
    await waitFor(() =>
      expect(useSessionStore.getState().user?.name).toBe("Nimal Perera")
    )
    expect(useLocationStore.getState().district).toBe("GALLE")
  })

  it("clears an expired token without redirecting the visitor", async () => {
    const navigate = vi.fn()
    registerRouter({
      state: { location: { href: "/", pathname: "/" } },
      navigate,
    })
    useSessionStore
      .getState()
      .setSession("expired", { id: "1", name: "Old", role: "CUSTOMER" })
    respondWith(401, { success: false, code: "TOKEN_EXPIRED", message: "x" })
    render(<SessionBootstrap />)

    await waitFor(() => expect(useSessionStore.getState().token).toBeNull())
    expect(navigate).not.toHaveBeenCalled()
  })

  it("keeps the session on a network failure", async () => {
    useSessionStore
      .getState()
      .setSession("tok", { id: "1", name: "Old", role: "CUSTOMER" })
    api.defaults.adapter = () =>
      Promise.reject(new AxiosError("down", "ERR_NETWORK"))
    render(<SessionBootstrap />)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(useSessionStore.getState().token).toBe("tok")
  })

  it("defaults the location to the district after an in-app sign-in", async () => {
    const calls: Array<string> = []
    respondWith(200, { success: true, message: "", data: me }, calls)
    render(<SessionBootstrap />)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(calls).toEqual([])

    // What LoginPage / RegisterPage do on success.
    act(() =>
      useSessionStore.getState().setSession("fresh", {
        id: "1",
        name: "Nimal Perera",
        role: "CUSTOMER",
      })
    )
    await waitFor(() =>
      expect(useLocationStore.getState()).toMatchObject({
        mode: "district",
        district: "KANDY",
      })
    )
    expect(calls).toEqual(["get /users/me"])
  })

  it("makes no request without a token", async () => {
    const calls: Array<string> = []
    respondWith(200, { success: true, message: "", data: me }, calls)
    render(<SessionBootstrap />)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(calls).toEqual([])
  })
})

describe("SessionBootstrap with route guards", () => {
  function renderApp(initialPath: string) {
    const root = createRootRoute({
      component: () => (
        <>
          <SessionBootstrap />
          <Outlet />
        </>
      ),
    })
    const routes = [
      createRoute({
        getParentRoute: () => root,
        path: "/",
        component: () => <p>public home</p>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/reservations",
        beforeLoad: requireRole("CUSTOMER"),
        component: () => <p>my reservations</p>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/login",
        validateSearch: (s: Record<string, unknown>) => s,
        component: () => <p>login page</p>,
      }),
    ]
    const router = createRouter({
      routeTree: root.addChildren(routes),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    })
    render(<RouterProvider router={router} />)
    return router
  }

  beforeEach(() => {
    useSessionStore
      .getState()
      .setSession("expired", { id: "1", name: "Old", role: "CUSTOMER" })
    respondWith(401, { success: false, code: "TOKEN_EXPIRED", message: "x" })
  })

  it("sends an expired visitor on a protected route to /login with reason=expired", async () => {
    const router = renderApp("/reservations")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toMatchObject({
      redirect: "/reservations",
      reason: "expired",
    })
    expect(useSessionStore.getState().token).toBeNull()
  })

  it("leaves an expired visitor on a public route", async () => {
    const router = renderApp("/")
    await waitFor(() => expect(useSessionStore.getState().token).toBeNull())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(router.state.location.pathname).toBe("/")
  })
})
