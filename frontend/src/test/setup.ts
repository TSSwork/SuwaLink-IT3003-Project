import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"
import "@/i18n"

// A file's first route render can take over the default 1 s when the whole
// suite runs in parallel on a busy machine; findBy*/waitFor wait up to 3 s.
configure({ asyncUtilTimeout: 3000 })

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
