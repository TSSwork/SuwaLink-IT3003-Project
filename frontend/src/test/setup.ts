import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import "@/i18n"

// jsdom does not implement scrolling; the router calls it on navigation.
window.scrollTo = () => {}

// jsdom has no ResizeObserver; Radix (e.g. Checkbox) measures with it.
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => cleanup())

// jsdom lacks pointer capture and scrollIntoView; Radix Select calls them.
Element.prototype.hasPointerCapture = () => false
Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}
