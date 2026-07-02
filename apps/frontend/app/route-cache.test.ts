import { describe, expect, test } from "bun:test";

const dashboardRouteFiles = [
  "app/providers/[providerId]/api-growth/page.tsx",
  "app/providers/[providerId]/customers/page.tsx",
  "app/providers/[providerId]/customers/co-usage-providers/page.tsx",
  "app/providers/[providerId]/geo-spec/page.tsx",
  "app/providers/[providerId]/machine-payment-routes/page.tsx",
  "app/providers/[providerId]/macro-metrics/page.tsx",
  "app/providers/[providerId]/metrics-catalog/page.tsx",
  "app/providers/[providerId]/wallet/[address]/page.tsx",
  "app/[providerId]/wallet/[address]/page.tsx",
] as const;

describe("dashboard route caching", () => {
  for (const filePath of dashboardRouteFiles) {
    test(`${filePath} opts into one-hour ISR`, async () => {
      const source = await Bun.file(filePath).text();
      expect(source).toContain('export const dynamic = "force-static";');
      expect(source).toContain("export const revalidate = 10800;");
    });
  }
});
