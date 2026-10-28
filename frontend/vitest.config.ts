import { defineConfig } from "vitest/config"
import viteReact from "@vitejs/plugin-react"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
    css: false,
    // Long Testing Library flows time out when every core runs a file on a
    // loaded machine; four workers keep the full suite stable.
    maxWorkers: 4,
  },
})
