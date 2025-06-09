import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["appjs/**/*.test.ts"],
    setupFiles: ["appjs/vitest.setup.ts"],
  },
})
