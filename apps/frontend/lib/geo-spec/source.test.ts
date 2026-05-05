import { describe, expect, test } from "bun:test";
import { getGeoSpec } from "./source";

describe("geo spec source", () => {
  test("resolves live provider ids by payTo when fixture provider ids differ", () => {
    const spec = getGeoSpec(
      "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    );

    expect(spec?.serviceId).toBe("pro-api.coingecko.com");
    expect(spec?.observedEndpoints.length).toBeGreaterThan(0);
  });

  test("builds a minimal spec from live provider hints when fixture has no row", () => {
    const spec = getGeoSpec(
      "x402-gateway-production-up-railway-app--base--usdc--0x7dd5be069f2d2ead75ec7c3423b116ff043c2629",
      {
        providerId:
          "x402-gateway-production-up-railway-app--base--usdc--0x7dd5be069f2d2ead75ec7c3423b116ff043c2629",
        name: "x402-gateway-production.up.railway.app",
        serviceId: "x402-gateway-production.up.railway.app",
        serviceName: "x402-gateway-production.up.railway.app",
        payTo: "0x7dd5be069f2d2ead75ec7c3423b116ff043c2629",
        network: "base",
        asset: "USDC",
        endpointCount: 1,
      },
    );

    expect(spec).not.toBeNull();
    expect(spec?.serviceId).toBe("x402-gateway-production.up.railway.app");
    expect(spec?.atlasMissing).toBe(true);
  });
});
