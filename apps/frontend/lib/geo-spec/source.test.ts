import { describe, expect, test } from "bun:test";
import { getGeoSpec } from "./source";

describe("geo spec source", () => {
  test("resolves live provider ids by payTo when fixture provider ids differ", () => {
    const spec = getGeoSpec(
      "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    );

    // baked JSON returns the brandKey as serviceId so the lookup is stable
    // across catalog renames (api.coingecko.com vs pro-api.coingecko.com).
    expect(spec?.serviceId).toBe("coingecko");
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
    // Baked JSON has the entry, so the spec is sourced from it.
    const spec = getGeoSpec(
      "mpp:flightapi::tempo:4217::USDC::0x6e3184c204e596ded89e8a5693b602097f4ab687",
      {
        providerId:
          "mpp:flightapi::tempo:4217::USDC::0x6e3184c204e596ded89e8a5693b602097f4ab687",
        name: "FlightAPI",
        title: "FlightAPI",
        description: "ignored — baked JSON wins",
        mppDescription: "ignored — baked JSON wins",
        useCase: null,
        category: "data",
        serviceId: "flightapi",
        serviceName: "FlightAPI",
        payTo: "0x6e3184c204e596ded89e8a5693b602097f4ab687",
        network: "tempo:4217",
        asset: "USDC",
        endpointCount: 12,
      },
    );

    expect(spec).not.toBeNull();
    // No Pay.sh entry for FlightAPI → Pay.sh side is empty.
    expect(spec?.description).toBeNull();
    expect(spec?.useCase).toBeNull();
    expect(spec?.atlasMissing).toBe(true);
    // MPP registry description comes from baked JSON.
    expect(spec?.mppDescription).toBeTruthy();
    expect(spec?.mppEndpoints.length).toBeGreaterThan(0);
  });

  test("payTo fallback does NOT collide with shared MPP gateway addresses", () => {
    // The Tempo Anthropic gateway payTo (0xca4e835f...) is shared by many MPP
    // services (anthropic, openai, gemini, openrouter, ...). A live hint with
    // an unrelated serviceId + only this shared payTo must NOT resolve to one
    // of the gateway-sharing brands by accident.
    const gatewayPayTo = "0xca4e835f803cb0b7c428222b3a3b98518d4779fe";
    const spec = getGeoSpec("totally-unknown-route", {
      providerId: "totally-unknown-route",
      name: "Some Brand New Provider",
      serviceId: "brand-not-in-baked-json",
      payTo: gatewayPayTo,
      network: "tempo:4217",
      asset: "USDC",
    });

    expect(spec).not.toBeNull();
    // Should NOT have matched any of anthropic/openai/gemini/etc. — the live
    // hint is the only signal we trust here.
    expect(spec?.serviceId).not.toBe("anthropic");
    expect(spec?.serviceId).not.toBe("openai");
    expect(spec?.serviceId).not.toBe("gemini");
    expect(spec?.serviceId).not.toBe("openrouter");
    expect(spec?.atlasMissing).toBe(true);
    expect(spec?.observedEndpoints).toEqual([]);
  });

  test("falls back to live hint when no baked entry exists", () => {
    // Synthetic provider that does NOT appear in baked JSON.
    const spec = getGeoSpec(
      "x402-totally-unknown--base--usdc--0x9999999999999999999999999999999999999999",
      {
        providerId:
          "x402-totally-unknown--base--usdc--0x9999999999999999999999999999999999999999",
        name: "Totally Unknown",
        title: "Totally Unknown",
        description: "live-only description",
        useCase: "live-only use case",
        serviceId: "x402-totally-unknown",
        serviceName: "Totally Unknown",
        payTo: "0x9999999999999999999999999999999999999999",
        network: "base",
        asset: "USDC",
      },
    );

    expect(spec).not.toBeNull();
    expect(spec?.atlasMissing).toBe(true);
    // No baked entry → Pay.sh side stays null (we don't trust live hint
    // text as Pay.sh data).
    expect(spec?.description).toBeNull();
    expect(spec?.useCase).toBeNull();
    expect(spec?.observedEndpoints).toEqual([]);
  });
});
