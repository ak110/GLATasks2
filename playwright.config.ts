import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./app/tests",
  testIgnore: /global-setup\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./app/tests/global-setup.ts",
  use: {
    baseURL: process.env.BASE_URL ?? "https://localhost:38180",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "app/tests/.auth/user.json",
      },
    },
  ],
});
