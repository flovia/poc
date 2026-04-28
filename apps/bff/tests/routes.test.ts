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
});
