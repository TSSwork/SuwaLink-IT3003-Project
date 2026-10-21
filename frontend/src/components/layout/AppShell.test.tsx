import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AppShell } from "@/components/layout/AppShell"

function renderShell(nav?: React.ReactNode) {
  const rootRoute = createRootRoute({
    component: () => (
      <AppShell nav={nav}>
        <p>Page body</p>
      </AppShell>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  return render(<RouterProvider router={router} />)
}

describe("AppShell", () => {
  it("renders the home wordmark, page content and legal links", async () => {
    renderShell()
    expect(
      await screen.findByRole("link", { name: "SuwaLink home" })
    ).toHaveAttribute("href", "/")
    expect(screen.getByRole("main")).toHaveTextContent("Page body")
    const legal = screen.getByRole("navigation", { name: "Legal" })
    expect(
      within(legal).getByRole("link", { name: "Privacy" })
    ).toHaveAttribute("href", "/privacy")
    expect(within(legal).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms"
    )
    expect(screen.queryByRole("button", { name: "Open menu" })).toBeNull()
  })

  it("opens the navigation in a sheet and closes it when a link is chosen", async () => {
    const user = userEvent.setup()
    renderShell(<a href="#find">Find medicine</a>)

    await user.click(await screen.findByRole("button", { name: "Open menu" }))
    const sheet = await screen.findByRole("dialog", { name: "Menu" })
    expect(
      within(sheet).getByRole("navigation", { name: "Main menu" })
    ).toBeInTheDocument()
    expect(within(sheet).getByRole("button", { name: "Close" })).toHaveClass(
      "size-11"
    )
    await user.click(within(sheet).getByRole("link", { name: "Find medicine" }))

    expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull()
  })
})
