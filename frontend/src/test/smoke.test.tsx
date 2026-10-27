import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IndexPage } from "@/features/home/IndexPage"
import { renderRoutes } from "@/test/renderRoutes"

describe("index route", () => {
  it("renders the home headline", async () => {
    renderRoutes([{ path: "/", component: IndexPage }], "/")
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Find your medicine at a pharmacy nearby.",
      })
    ).toBeInTheDocument()
  })
})
