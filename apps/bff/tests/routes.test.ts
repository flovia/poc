import { describe, expect, test } from "bun:test";
import { createBffHandler } from "../src/http";
import {
  knownCustomerProfileAddress,
  phaseBCustomerListResponse,
} from "../src/data/phase-b-demo";
import {
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "contracts";

const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);

describe("BFF routes", () => {
  test("serves minimal read-only endpoints", async () => {
    const handler = createBffHandler();

    for (const path of ["/", "/health"] as const) {
      const response = handler(request(path));
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain("application/json");
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ service: "flovia-bff", status: "ok" }),
      );
    }
  });

  test("rejects non-GET requests to read-only endpoints", async () => {
    const handler = createBffHandler();
    const response = handler(request("/health", { method: "POST" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(405);
    expect(body.error).toBe("method_not_allowed");
  });

  test("returns JSON not found for unsupported routes", async () => {
    const handler = createBffHandler();
    const response = handler(request("/unknown"));
    const body = (await response.json()) as { error: string; message: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.message).toContain("/unknown");
  });

  test("serves customer list with schema validation", async () => {
    const handler = createBffHandler();

    const response = handler(request("/customers"));
    const body = await response.json();
    const parsed = validatePhaseBCustomerListResponse(body);

    expect(response.status).toBe(200);
    expect(parsed.customerCount).toBe(parsed.customers.length);
    expect(parsed.customerCount).toBe(phaseBCustomerListResponse.customers.length);
  });

  test("returns a validated profile for a known customer wallet", async () => {
    const handler = createBffHandler();

    const response = handler(request(`/customers/${knownCustomerProfileAddress.toUpperCase()}/profile`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(validatePhaseBCustomerProfileResponse(body).profile.identity.address).toBe(
      knownCustomerProfileAddress,
    );
  });

  test("returns not found for an unknown customer wallet", async () => {
    const handler = createBffHandler();

    const response = handler(request("/customers/0x9999999999999999999999999999999999999999/profile"));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  test("serves wallet usage graph with schema validation", async () => {
    const handler = createBffHandler();

    const response = handler(request("/wallet-usage-graph"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(validatePhaseBWalletUsageGraphResponse(body).graph.providerWallets).toHaveLength(1);
  });

  test("does not expose demo and telemetry endpoints", async () => {
    const handler = createBffHandler();

    for (const path of ["/demo-data", "/sdk-events", "/telemetry"] as const) {
      const response = handler(request(path));
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(body.error).toBe("not_found");
      expect(response.headers.get("content-type")).toContain("application/json");
    }
  });

  test("keeps product endpoints read-only", async () => {
    const handler = createBffHandler();

    const paths = [
      "/customers",
      `/customers/${knownCustomerProfileAddress}/profile`,
      "/wallet-usage-graph",
    ] as const;

    for (const path of paths) {
      const response = handler(request(path, { method: "POST" }));
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
      expect(body.error).toBe("method_not_allowed");
    }
  });
});
