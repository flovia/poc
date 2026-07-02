import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? 3333);
const bffPort = Number(process.env.PLAYWRIGHT_BFF_PORT ?? 3334);
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const bffUrl = `http://127.0.0.1:${bffPort}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: frontendUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
  webServer: [
    {
      command: `PORT=${bffPort} BFF_ANALYTICS_SOURCE=fixture bun --filter bff start`,
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: `${bffUrl}/health`,
    },
    {
      command: `BFF_URL=${bffUrl} NEXT_PUBLIC_BFF_URL=/api bun --filter frontend dev -- --hostname 127.0.0.1 --port ${frontendPort}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: `${frontendUrl}/providers`,
    },
  ],
});
