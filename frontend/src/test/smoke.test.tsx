import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IndexPage } from "@/features/home/IndexPage"

describe("index route", () => {
  it("renders the SuwaLink name", () => {
    render(<IndexPage />)
    expect(screen.getByText("SuwaLink")).toBeInTheDocument()
  })
})
