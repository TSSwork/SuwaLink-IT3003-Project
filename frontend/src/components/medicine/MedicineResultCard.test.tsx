import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MedicineResultCard } from "@/components/medicine/MedicineResultCard"
import { formatDistance, formatPrice } from "@/lib/format"
import { searchResult } from "@/test/fixtures"
import { renderRoutes } from "@/test/renderRoutes"

function renderCard(result = searchResult()) {
  return renderRoutes(
    [{ path: "/", component: () => <MedicineResultCard result={result} /> }],
    "/"
  )
}

describe("MedicineResultCard", () => {
  it("shows the medicine, where it is stocked and the lowest price", async () => {
    renderCard()
    const link = await screen.findByRole("link", { name: /Panadol/ })
    expect(link).toHaveAttribute(
      "href",
      "/medicines/9b1d0c1e-1111-4e2f-9b1a-0c5d7e8f9a10"
    )
    const card = link.closest("article")!
    const inCard = within(card)
    expect(inCard.getByText("Paracetamol · 500 mg · Tablet")).toBeVisible()
    expect(inCard.getByText("Pain relief")).toBeVisible()
    expect(inCard.getByText("3 pharmacies")).toBeVisible()
    // The matcher collapses the formatter's no-break space.
    expect(card).toHaveTextContent(
      `from ${formatPrice(12.5, "en")}`.replace(/\s/g, " ")
    )
    expect(inCard.queryByText("Prescription needed")).not.toBeInTheDocument()
    expect(card).not.toHaveTextContent(/nearest/i)
  })

  it("uses the singular for one pharmacy", async () => {
    renderCard(searchResult({ pharmacyCount: 1 }))
    expect(await screen.findByText("1 pharmacy")).toBeInTheDocument()
  })

  it("marks prescription medicines and shows the nearest distance when known", async () => {
    renderCard(
      searchResult({
        legalCategory: "PRESCRIPTION",
        requiresPrescription: true,
        nearestDistanceKm: 1.24,
      })
    )
    expect(await screen.findByText("Prescription needed")).toBeVisible()
    expect(
      screen.getByText(`nearest ${formatDistance(1.24, "en")}`)
    ).toBeVisible()
  })
})
