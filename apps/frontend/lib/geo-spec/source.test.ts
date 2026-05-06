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
        title: "x402 Gateway",
        description: "Live provider description",
        useCase: "Use for live provider tests",
        category: "gateway",
        serviceId: "x402-gateway-production.up.railway.app",
        serviceName: "x402-gateway-production.up.railway.app",
        payTo: "0x7dd5be069f2d2ead75ec7c3423b116ff043c2629",
        network: "base",
        asset: "USDC",
        endpointCount: 1,
      },
    );

    expect(spec).not.toBeNull();
    expect(spec?.title).toBe("x402 Gateway");
    // Pay.sh atlas に matched しなかったので description / useCase は null。
    // Pay.sh 由来であることを保証できないテキストは Pay.sh ラベルで出さない。
    expect(spec?.description).toBeNull();
    expect(spec?.useCase).toBeNull();
    expect(spec?.serviceId).toBe("x402-gateway-production.up.railway.app");
    expect(spec?.atlasMissing).toBe(true);
  });

  test("MPP row + Pay.sh row sharing the same payTo render their own data (no cross-leak)", () => {
    // AgentMail's MPP row and Pay.sh atlas Base row share payTo
    // 0x6e3184c204e596ded89e8a5693b602097f4ab687. Hitting the MPP route id with
    // an MPP hint must NOT fall through to the Pay.sh atlas row's data.
    const sharedPayTo = "0x6e3184c204e596ded89e8a5693b602097f4ab687";
    const mppHint = {
      providerId: `mpp:agentmail::tempo:4217::USDC::${sharedPayTo}`,
      name: "AgentMail",
      title: "AgentMail",
      description: "Email inboxes for AI agents.",
      mppDescription: "Email inboxes for AI agents.",
      useCase: null,
      category: "ai",
      serviceId: "agentmail",
      serviceName: "AgentMail",
      payTo: sharedPayTo,
      network: "tempo:4217",
      asset: "USDC",
      endpointCount: 83,
      resources: [
        {
          resource: "https://mpp.api.agentmail.to/v0/inboxes",
          method: "POST",
          description: "Create inbox",
          intent: "charge" as const,
          amountAtomic: "2000000",
          decimals: 6,
        },
      ],
    };
    const spec = getGeoSpec(mppHint.providerId, mppHint);
    expect(spec).not.toBeNull();
    // MPP description should win, NOT Pay.sh atlas description.
    expect(spec?.mppDescription).toBe("Email inboxes for AI agents.");
    expect(spec?.serviceId).toBe("agentmail");
    // MPP-registry endpoints must surface (not zero) regardless of Pay.sh
    // atlas having a same-payTo entry.
    expect(spec?.mppEndpoints.length).toBeGreaterThan(0);
  });

  test("MPP-only providers expose mppDescription but not description/useCase", () => {
    // FlightAPI is registered in MPP registry only, not in Pay.sh atlas.
    const spec = getGeoSpec(
      "mpp:flightapi::tempo:4217::USDC::0x1111111111111111111111111111111111111111",
      {
        providerId:
          "mpp:flightapi::tempo:4217::USDC::0x1111111111111111111111111111111111111111",
        name: "FlightAPI",
        title: "FlightAPI",
        // MPP normalizer が両方に同じ値を入れる構造を再現
        description: "Real-time flight data API",
        mppDescription: "Real-time flight data API",
        useCase: null,
        category: "data",
        serviceId: "flightapi",
        serviceName: "FlightAPI",
        payTo: "0x1111111111111111111111111111111111111111",
        network: "tempo:4217",
        asset: "USDC",
        endpointCount: 12,
      },
    );

    expect(spec).not.toBeNull();
    expect(spec?.atlasMissing).toBe(true);
    // Pay.sh atlas に居ないので Pay.sh-side の description は出さない。
    expect(spec?.description).toBeNull();
    expect(spec?.useCase).toBeNull();
    // MPP registry の description は別軸で利用可能。
    expect(spec?.mppDescription).toBe("Real-time flight data API");
  });
});
