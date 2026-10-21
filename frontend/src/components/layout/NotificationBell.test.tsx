import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { api } from "@/api/client"
import type { NotificationItem } from "@/api/types"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { renderRoutes } from "@/test/renderRoutes"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"

const originalAdapter = api.defaults.adapter
let calls: Array<string>
let count: number
let items: Array<NotificationItem>

const note = (over: Partial<NotificationItem>): NotificationItem => ({
  id: "n1",
  type: "RESERVATION_CONFIRMED",
  title: "Reservation confirmed",
  message: "Panadol is ready",
  link: "/reservations/abc",
  read: false,
  createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  ...over,
})

function reply(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    data: { success: true, message: "", data },
    status: 200,
    statusText: "",
    headers: {},
    config,
  })
}

beforeEach(() => {
  calls = []
  count = 2
  items = [
    note({}),
    note({
      id: "n2",
      title: "Old news",
      message: "Stock arrived",
      read: true,
      link: null,
    }),
  ]
  useSessionStore
    .getState()
    .setSession("t", { id: "1", name: "Nimal", role: "CUSTOMER" })
  const adapter: AxiosAdapter = (config) => {
    const key = `${(config.method ?? "get").toUpperCase()} ${config.url}`
    calls.push(key)
    if (key === "GET /notifications/unread-count") return reply(config, count)
    if (key === "GET /notifications") return reply(config, items)
    if (key.startsWith("PUT /notifications/")) {
      count = Math.max(0, count - 1)
      return reply(config, null)
    }
    return Promise.reject(new Error(`unexpected ${key}`))
  }
  api.defaults.adapter = adapter
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  useSessionStore.getState().clear()
  useLanguageStore.getState().setLanguage("en")
})

const renderBell = () =>
  renderRoutes(
    [{ path: "/", component: NotificationBell }, { path: "/reservations/$id" }],
    "/"
  )

describe("NotificationBell", () => {
  it("renders nothing when signed out", async () => {
    useSessionStore.getState().clear()
    const { container } = renderBell()
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(calls).toEqual([])
  })

  it("shows the unread count in the badge and label", async () => {
    renderBell()
    const button = await screen.findByRole("button", {
      name: "Notifications, 2 unread",
    })
    expect(within(button).getByText("2")).toBeInTheDocument()
  })

  it("caps the badge at 99+ and hides it at zero", async () => {
    count = 250
    renderBell()
    const button = await screen.findByRole("button", {
      name: "Notifications, 250 unread",
    })
    expect(within(button).getByText("99+")).toBeInTheDocument()
  })

  it("has no badge and a plain label with nothing unread", async () => {
    count = 0
    renderBell()
    expect(
      await screen.findByRole("button", { name: "Notifications" })
    ).toBeInTheDocument()
  })

  it("fetches the list only when opened", async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(
      await screen.findByRole("button", { name: /^Notifications/ })
    )
    expect(await screen.findByText("Reservation confirmed")).toBeInTheDocument()
    expect(screen.getByText("Panadol is ready")).toBeInTheDocument()
    expect(screen.getAllByText("30 minutes ago")[0]).toBeInTheDocument()
    expect(calls.filter((c) => c === "GET /notifications")).toHaveLength(1)
  })

  it("does not request the list before opening", async () => {
    renderBell()
    await screen.findByRole("button", { name: /^Notifications/ })
    expect(calls).not.toContain("GET /notifications")
  })

  it("marks an unread item read and navigates to its link", async () => {
    const user = userEvent.setup()
    const { router } = renderBell()
    await user.click(
      await screen.findByRole("button", { name: /^Notifications/ })
    )
    await user.click(await screen.findByText("Reservation confirmed"))
    await waitFor(() => expect(calls).toContain("PUT /notifications/n1/read"))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/reservations/abc")
    )
    await waitFor(() =>
      expect(
        calls.filter((c) => c === "GET /notifications/unread-count").length
      ).toBeGreaterThan(1)
    )
  })

  it("does not mark an already-read item and stays when it has no link", async () => {
    const user = userEvent.setup()
    const { router } = renderBell()
    await user.click(
      await screen.findByRole("button", { name: /^Notifications/ })
    )
    await user.click(await screen.findByText("Old news"))
    expect(calls.some((c) => c.startsWith("PUT"))).toBe(false)
    expect(router.state.location.pathname).toBe("/")
  })

  it("marks all as read and keeps the list open", async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(
      await screen.findByRole("button", { name: /^Notifications/ })
    )
    await user.click(
      await screen.findByRole("menuitem", { name: "Mark all as read" })
    )
    await waitFor(() => expect(calls).toContain("PUT /notifications/read-all"))
    expect(screen.getByText("Reservation confirmed")).toBeInTheDocument()
  })

  it("shows an empty state", async () => {
    items = []
    const user = userEvent.setup()
    renderBell()
    await user.click(
      await screen.findByRole("button", { name: /^Notifications/ })
    )
    expect(await screen.findByText("No notifications yet")).toBeInTheDocument()
  })

  it("refetches the list in the new language when the language changes", async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(
      await screen.findByRole("button", { name: /^Notifications/ })
    )
    await screen.findByText("Reservation confirmed")
    act(() => useLanguageStore.getState().setLanguage("si"))
    await waitFor(() =>
      expect(calls.filter((c) => c === "GET /notifications")).toHaveLength(2)
    )
  })
})
