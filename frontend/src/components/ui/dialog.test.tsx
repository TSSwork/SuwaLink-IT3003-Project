import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import i18n from "@/i18n"

afterEach(() => i18n.changeLanguage("en"))

describe("Dialog", () => {
  it("labels the footer close button in the current language", async () => {
    await act(() => i18n.changeLanguage("ta"))
    render(
      <Dialog open>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole("button", { name: "மூடு" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
  })
})
