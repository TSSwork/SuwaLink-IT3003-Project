import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RxBadge } from "@/components/medicine/RxBadge"
import i18n from "@/i18n"

describe("RxBadge", () => {
  it("says in words that a prescription is needed, not by colour alone", () => {
    render(<RxBadge />)
    const badge = screen.getByText("Prescription needed")
    expect(badge).toBeVisible()
    expect(badge.closest("[title]")).toHaveAttribute(
      "title",
      "The pharmacy hands this over only against a valid prescription."
    )
  })

  it("is translated", async () => {
    await i18n.changeLanguage("si")
    try {
      render(<RxBadge />)
      expect(screen.queryByText("Prescription needed")).not.toBeInTheDocument()
    } finally {
      await i18n.changeLanguage("en")
    }
  })
})
