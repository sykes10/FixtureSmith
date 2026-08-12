import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: ["**/.pnpm-store/**", "**/dist/**", "**/node_modules/**"],
  },
})
