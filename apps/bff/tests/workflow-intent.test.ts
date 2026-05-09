import { describe, expect, test } from "bun:test";
import { validatePhaseBCustomerProfileResponse } from "contracts";
import {
  WORKFLOW_INTENT_SESSION_WINDOW_SECONDS,
  buildWorkflowIntentInputFromProfile,
} from "../src/data/workflow-intent";

const evidence = { provenance: "derived_insight" as const, label: "test evidence" };
const provenanceByField = { foo: "derived_insight" as const };

const buildProfile = (
  timeline: Array<{
    at: string;
    description: string;
    relatedProviderId?: string;
    amountAtomic?: string;
  }>,
) =>
  validatePhaseBCustomerProfileResponse({
    generatedAt: "2026-05-01T00:00:00Z",
    generatedFrom: "test",
    provenance: "derived_insight",
    reasons: [evidence],
    profile: {
      identity: {
        address: "0x0000000000000000000000000000000000000001",
        label: null,
        network: "base",
        asset: "USDC",
        role: "payer_wallet",
        identityBasis: "wallet_address",
        caveat: null,
        provenance: "onchain_fact",
        provenanceByField: { address: "onchain_fact" },
      },
      metrics: {
        spendAtomic: "1000",
        activityGrowth: 0.4,
        freeTierProgress: 0.2,
        entryPointRatio: 0.5,
        upsellOpportunity: "medium",
        provenance: "derived_insight",
        provenanceByField: { spendAtomic: "onchain_fact" },
        reasons: [evidence],
      },
      providers: [
        {
          providerId: "price-api",
          name: "Price API",
          payToWallet: "0x0000000000000000000000000000000000000011",
          spendAtomic: "400",
          transactionCount: 2,
          confidence: 0.8,
          provenance: "derived_insight",
          provenanceByField,
          reasons: [evidence],
        },
        {
          providerId: "llm-api",
          name: "LLM API",
          payToWallet: "0x0000000000000000000000000000000000000022",
          spendAtomic: "600",
          transactionCount: 2,
          confidence: 0.8,
          provenance: "derived_insight",
          provenanceByField,
          reasons: [evidence],
        },
      ],
      timeline: timeline.map((event) => ({
        at: event.at,
        eventType: "payment" as const,
        description: event.description,
        amountAtomic: event.amountAtomic,
        relatedProviderId: event.relatedProviderId,
        provenance: "derived_insight",
        provenanceByField,
        reasons: [evidence],
      })),
      insights: [],
      provenance: "derived_insight",
      provenanceByField,
      reasons: [evidence],
    },
  });

describe("workflow intent session grouping", () => {
  test("groups short multi-provider bursts into one candidate session", () => {
    const profile = buildProfile([
      {
        at: "2026-05-01T10:00:00Z",
        description: "Price refresh: GET /v1/price",
        relatedProviderId: "price-api",
        amountAtomic: "100",
      },
      {
        at: "2026-05-01T10:02:00Z",
        description: "Strategy eval: POST /v1/responses",
        relatedProviderId: "llm-api",
        amountAtomic: "200",
      },
      {
        at: "2026-05-01T10:04:00Z",
        description: "Execution check: GET /v1/quote",
        relatedProviderId: "price-api",
        amountAtomic: "300",
      },
      {
        at: "2026-05-01T10:12:00Z",
        description: "Later isolated call: GET /v1/status",
        relatedProviderId: "price-api",
        amountAtomic: "50",
      },
    ]);

    const input = buildWorkflowIntentInputFromProfile(profile);

    expect(input.sessionWindowSeconds).toBe(WORKFLOW_INTENT_SESSION_WINDOW_SECONDS);
    expect(input.sessions).toHaveLength(1);
    expect(input.sessions[0]).toMatchObject({
      eventCount: 3,
      distinctProviderCount: 2,
      distinctActivityCount: 3,
      totalAmountAtomic: "600",
    });
    expect(input.sessions[0]?.providers.map((provider) => provider.providerName)).toEqual([
      "Price API",
      "LLM API",
    ]);
  });

  test("keeps same-provider sessions when multiple distinct api actions occur in the window", () => {
    const profile = buildProfile([
      {
        at: "2026-05-01T09:00:00Z",
        description: "Market scan: GET /v1/price",
        relatedProviderId: "price-api",
        amountAtomic: "100",
      },
      {
        at: "2026-05-01T09:03:00Z",
        description: "Liquidity check: GET /v1/liquidity",
        relatedProviderId: "price-api",
        amountAtomic: "120",
      },
    ]);

    const input = buildWorkflowIntentInputFromProfile(profile);

    expect(input.sessions).toHaveLength(1);
    expect(input.sessions[0]).toMatchObject({
      eventCount: 2,
      distinctProviderCount: 1,
      distinctActivityCount: 2,
      totalAmountAtomic: "220",
    });
    expect(input.sessions[0]?.events.map((event) => event.providerName)).toEqual([
      "Price API",
      "Price API",
    ]);
  });
});
