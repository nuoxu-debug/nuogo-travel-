import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: join(tmpdir(), "nuogo-playwright-results"),
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:5176",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm --workspace server start",
      url: "http://127.0.0.1:8788/api/health",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        PORT: "8788",
        CLIENT_ORIGIN: "http://127.0.0.1:5176",
        APP_RUNTIME_MODE: "demo",
        AI_PROVIDER: "demo",
        TRAVEL_DATA_PROVIDER: "demo",
        DEMO_ADMIN_EMAIL: "admin@nuogo.test",
        DEMO_ADMIN_PASSWORD: "NuogoAdmin123!"
      }
    },
    {
      command: "npm --workspace client run dev -- --host 127.0.0.1 --port 5176",
      url: "http://127.0.0.1:5176",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        VITE_CACHE_DIR: join(tmpdir(), `nuogo-vite-cache-${process.pid}`),
        VITE_API_URL: "http://127.0.0.1:8788/api"
      }
    }
  ],
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
