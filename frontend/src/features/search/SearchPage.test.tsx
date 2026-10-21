import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { MedicineSearchResult, Page } from "@/api/types"
import { SearchPage } from "@/features/search/SearchPage"
import { validateSearchParams } from "@/features/search/searchParams"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"
import { searchResult } from "@/test/fixtures"
import { fail, mockApi } from "@/test/mockApi"
import { renderRoutes } from "@/test/renderRoutes"

const PAIN = "3f2b8c1e-6a4d-4e2f-9b1a-0c5d7e8f9a10"
const ANTIBIOTICS = "7a1c2d3e-4f50-4a6b-8c9d-0e1f2a3b4c5d"

let api: ReturnType<typeof mockApi>
let pages: (params: Record<string, unknown>) => Page<MedicineSearchResult>

function page(
  content: Array<MedicineSearchResult>,
  over: Partial<Page<MedicineSearchResult>> = {}
): Page<MedicineSearchResult> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...over,
  }
}

function renderSearch(path = "/search") {
  return renderRoutes(
    [
      {
        path: "/search",
        component: SearchPage,
        validateSearch: validateSearchParams,
      },
      { path: "/login" },
      { path: "/medicines/$id" },
    ],
    path
  )
}

const searches = () => api.callsTo("/medicines/search").map((c) => c.params)

beforeEach(() => {
  useLocationStore.getState().clear()
  useSessionStore.getState().clear()
  pages = () => page([searchResult()])
  api = mockApi({
    "/categories": () => [
      { id: ANTIBIOTICS, name: "Antibiotics" },
      { id: PAIN, name: "Pain relief" },
    ],
    "/medicines/search": ({ params }) => pages(params),
  })
})
afterEach(() => api.restore())

describe("SearchPage", () => {
  it("searches with the query, category and page from the URL", async () => {
    renderSearch(`/search?q=panadol&category=${PAIN}&page=2`)
    expect(await screen.findByRole("link", { name: /Panadol/ })).toBeVisible()
    expect(searches()).toEqual([
      { q: "panadol", categoryId: PAIN, page: 1, size: 20 },
    ])
    expect(screen.getByLabelText("Medicine or generic name")).toHaveValue(
      "panadol"
    )
  })

  it("asks for a location when none is set, and shows no distances", async () => {
    renderSearch("/search?q=panadol")
    await screen.findByRole("link", { name: /Panadol/ })
    expect(
      screen.getByText("Set your location to see the nearest pharmacies first.")
    ).toBeVisible()
    expect(screen.queryByText(/^nearest /)).not.toBeInTheDocument()
    expect(searches()[0]).not.toHaveProperty("lat")
    expect(searches()[0]).not.toHaveProperty("district")
  })

  it("sends a chosen point and shows the nearest distance", async () => {
    useLocationStore.getState().setPoint(6.9271, 79.8612, "device")
    pages = () => page([searchResult({ nearestDistanceKm: 2.3 })])
    renderSearch("/search?q=panadol")
    expect(await screen.findByText("nearest 2.3 km")).toBeVisible()
    expect(searches()[0]).toMatchObject({ lat: 6.9271, lng: 79.8612 })
    expect(
      screen.queryByText(/Set your location to see/)
    ).not.toBeInTheDocument()
  })

  it("sends a chosen district", async () => {
    useLocationStore.getState().setDistrict("KANDY")
    renderSearch("/search?q=panadol")
    await screen.findByRole("link", { name: /Panadol/ })
    expect(searches()[0]).toMatchObject({ district: "KANDY" })
    expect(searches()[0]).not.toHaveProperty("lat")
  })

  it("writes a new query to the URL and starts again from page 1", async () => {
    const user = userEvent.setup()
    const { router } = renderSearch("/search?q=panadol&page=3")
    const box = await screen.findByLabelText("Medicine or generic name")
    await user.clear(box)
    await user.type(box, "amoxil{Enter}")
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ q: "amoxil" })
    )
    await waitFor(() =>
      expect(searches().at(-1)).toEqual({ q: "amoxil", page: 0, size: 20 })
    )
  })

  it("filters by a category chip and clears it with All", async () => {
    const user = userEvent.setup()
    const { router } = renderSearch("/search?q=a")
    const chip = await screen.findByRole("button", { name: "Antibiotics" })
    expect(chip).toHaveAttribute("aria-pressed", "false")
    await user.click(chip)
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        q: "a",
        category: ANTIBIOTICS,
      })
    )
    expect(
      await screen.findByRole("button", { name: "Antibiotics", pressed: true })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(searches().at(-1)).toMatchObject({ categoryId: ANTIBIOTICS })
    )

    await user.click(screen.getByRole("button", { name: "All" }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ q: "a" })
    )
  })

  it("pages through results and keeps the page in the URL", async () => {
    pages = (params) =>
      page([searchResult({ brandName: `Result ${String(params.page)}` })], {
        page: params.page as number,
        totalPages: 3,
        totalElements: 45,
      })
    const user = userEvent.setup()
    const { router } = renderSearch("/search?q=a")
    expect(await screen.findByText("Result 0")).toBeVisible()
    expect(screen.getByText("Page 1 of 3")).toBeVisible()
    expect(screen.getByText("45 medicines")).toBeVisible()
    expect(
      screen.queryByRole("link", { name: "Previous page" })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Next page" }))
    expect(await screen.findByText("Result 1")).toBeVisible()
    expect(router.state.location.search).toEqual({ q: "a", page: 2 })
    expect(screen.getByText("Page 2 of 3")).toBeVisible()

    await user.click(screen.getByRole("link", { name: "Previous page" }))
    expect(await screen.findByText("Result 0")).toBeVisible()
    expect(router.state.location.search).toEqual({ q: "a" })
  })

  it("explains an empty result and what to try next", async () => {
    pages = () => page([])
    renderSearch("/search?q=zzz")
    expect(
      await screen.findByRole("heading", { name: "No medicines found" })
    ).toBeVisible()
    const tips = screen.getByRole("list", { name: "Try this" })
    expect(within(tips).getAllByRole("listitem")).toHaveLength(3)
    expect(tips).toHaveTextContent("Check the spelling")
    expect(tips).toHaveTextContent("Try the generic name")
    expect(
      screen.getByRole("link", { name: "Upload a prescription" })
    ).toHaveAttribute("href", "/login?redirect=%2Fprescriptions%2Fnew")
  })

  it("shows the error with a retry that loads again", async () => {
    let attempts = 0
    pages = () => {
      attempts += 1
      if (attempts === 1) fail(500, "INTERNAL_ERROR")
      return page([searchResult()])
    }
    const user = userEvent.setup()
    renderSearch("/search?q=panadol")
    expect(
      await screen.findByText("Medicines could not be loaded")
    ).toBeVisible()
    expect(
      screen.getByText("Something went wrong on our side. Please try again later.")
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("link", { name: /Panadol/ })).toBeVisible()
  })

  it("shows skeletons while loading", async () => {
    pages = () => page([searchResult()])
    renderSearch("/search?q=panadol")
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Searching medicines…"
    )
    expect(await screen.findByRole("link", { name: /Panadol/ })).toBeVisible()
  })
})
