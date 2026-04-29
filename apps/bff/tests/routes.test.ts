import { describe, expect, test } from "bun:test";
import { createBffHandler } from "../src/http";
import { createTestService } from "./fixtures";

const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);

describe("BFF routes", () => {
  test("serves all read-only endpoints", async () => {
    const { service, close } = createTestService();
    const handler = createBffHandler(service);

    try {
      const cases = [
        "/health",
        "/summary",
        "/observations",
        "/attribution-candidates",
        "/metrics/daily",
        "/wallets/payers",
        "/wallets/recipients",
        "/wallets/relayers",
        "/wallet-usage-graph",
        "/metrics/retention/d14",
        "/customers",
        "/customers/0xpayer/profile",
      ] as const;

      for (const path of cases) {
        const response = handler(request(path));
        expect(response.status, path).toBe(200);
        expect(response.headers.get("content-type"), path).toContain("application/json");
        const body = await response.json();
        expect(body, path).toBeDefined();

        if (path === "/summary") {
          expect(body).toEqual(
            expect.objectContaining({
              counts: expect.objectContaining({ observations: 2 }),
              scopeNote: expect.stringContaining("payer-wallet intelligence"),
            }),
          );
        }

        if (path === "/observations") {
          expect(body).toEqual([
            expect.objectContaining({ txHash: "0xtx1", payerWallet: "0xpayer" }),
            expect.objectContaining({ txHash: "0xtx2", payerWallet: "0xpayer" }),
          ]);
        }

        if (path === "/customers") {
          expect(body).toHaveLength(1);
          expect(body[0]).toMatchObject({
            address: "0xpayer",
            spendAtomic: "3000000",
            providerCount: 2,
            upsellOpportunity: "medium",
          });
        }

        if (path === "/metrics/retention/d14") {
          expect(body).toEqual(
            expect.objectContaining({
              metric: "d14_retention",
              retentionDays: 14,
              cohortSize: 1,
              retainedCount: 0,
              retentionRate: 0,
              cohorts: [
                expect.objectContaining({
                  cohortDate: "2026-04-27",
                  cohortSize: 1,
                  retainedCount: 0,
                }),
              ],
            }),
          );
        }

        if (path === "/customers/0xpayer/profile") {
          expect(body.customer).toMatchObject({ address: "0xpayer" });
          expect(body.metrics).toMatchObject({ freeTierProgress: 1 });
          expect(Array.isArray(body.providers)).toBe(true);
          expect(Array.isArray(body.timeline)).toBe(true);
          expect(Array.isArray(body.insights)).toBe(true);
        }
      }
    } finally {
      close();
    }
  });

  test("does not execute mutation or job endpoints", async () => {
    const { service, close } = createTestService();
    const handler = createBffHandler(service);

    try {
      for (const path of ["/ingest/rpc-tx", "/ingest/rpc-range", "/score", "/aggregate"]) {
        const response = handler(request(path, { method: "POST" }));
        const body = (await response.json()) as { error: string };

        expect(response.status, path).toBe(405);
        expect(body.error, path).toBe("method_not_allowed");
      }
    } finally {
      close();
    }
  });

  test("returns JSON not found for unsupported routes", async () => {
    const { service, close } = createTestService();
    const handler = createBffHandler(service);

    try {
      const response = handler(request("/unknown"));
      const body = (await response.json()) as { error: string; message: string };

      expect(response.status).toBe(404);
      expect(body.error).toBe("not_found");
      expect(body.message).toContain("/unknown");
    } finally {
      close();
    }
  });

  test("returns JSON not found for unknown customer profiles", async () => {
    const { service, close } = createTestService();
    const handler = createBffHandler(service);

    try {
      const response = handler(request("/customers/0xmissing/profile"));
      const body = (await response.json()) as { error: string; message: string };

      expect(response.status).toBe(404);
      expect(body.error).toBe("customer_not_found");
      expect(body.message).toContain("0xmissing");
    } finally {
      close();
    }
  });

  test("rejects non-GET requests to customer projection routes", async () => {
    const { service, close } = createTestService();
    const handler = createBffHandler(service);

    try {
      for (const path of ["/metrics/retention/d14", "/customers", "/customers/0xpayer/profile"]) {
        const response = handler(request(path, { method: "POST" }));
        const body = (await response.json()) as { error: string };

        expect(response.status, path).toBe(405);
        expect(body.error, path).toBe("method_not_allowed");
      }
    } finally {
      close();
    }
  });
});
