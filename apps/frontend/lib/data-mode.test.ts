import { afterEach, describe, expect, test } from "bun:test";
import { getServerDashboardMode } from "./server/dashboard-mode";

const originalFrontendDataSource = process.env.FRONTEND_DATA_SOURCE;
const originalBffUrl = process.env.BFF_URL;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercel = process.env.VERCEL;

afterEach(() => {
  process.env.FRONTEND_DATA_SOURCE = originalFrontendDataSource;
  process.env.BFF_URL = originalBffUrl;
  Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
  process.env.VERCEL = originalVercel;
});

describe("server dashboard mode", () => {
  test("uses SDK connected display mode for fixture data source", async () => {
    process.env.FRONTEND_DATA_SOURCE = "fixture";
    delete process.env.BFF_URL;
    Reflect.set(process.env, "NODE_ENV", "production");

    await expect(getServerDashboardMode()).resolves.toBe("sdkConnected");
  });

  test("keeps on-chain display mode for BFF data source", async () => {
    process.env.FRONTEND_DATA_SOURCE = "bff";
    process.env.BFF_URL = "https://bff.example.com";
    Reflect.set(process.env, "NODE_ENV", "production");

    await expect(getServerDashboardMode()).resolves.toBe("onChainOnly");
  });
});
