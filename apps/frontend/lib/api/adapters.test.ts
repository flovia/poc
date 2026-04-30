import { describe, expect, test } from "bun:test";
import type {
  PhaseBCustomerListResponse,
  PhaseBCustomerProfileResponse,
  WalletUsageGraphResponse,
} from "contracts";
import { adaptCustomerList, adaptCustomerProfile, adaptWalletUsageGraph } from "./adapters";

const evidence = {
  provenance: "onchain_fact" as const,
  label: "fixture evidence",
};

const provenanceByField = {
  address: "onchain_fact" as const,
  label: "demo_label" as const,
};

describe("BFF canonical adapters", () => {
  test("adapts customer list envelope to customer table view model", () => {
    const response: PhaseBCustomerListResponse = {
      generatedAt: "2026-04-29T00:00:00.000Z",
      generatedFrom: "phase-b-demo",
      customerCount: 1,
      provenance: "derived_insight",
      reasons: [evidence],
      customers: [
        {
          address: "0x0000000000000000000000000000000000000001",
          label: "Agent wallet",
          observationCount: 4,
          spendAtomic: "1200",
          providerCount: 2,
          lastSeenAt: "2026-04-28T12:00:00.000Z",
          activityGrowth: 0.4,
          upsellOpportunity: "high",
          provenance: "derived_insight",
          provenanceByField,
          reasons: [evidence],
        },
      ],
    };

    expect(adaptCustomerList(response)).toEqual([
      {
        address: "0x0000000000000000000000000000000000000001",
        label: "Agent wallet",
        observationCount: 4,
        spendAtomic: "1200",
        providerCount: 2,
        lastSeenAt: Date.parse("2026-04-28T12:00:00.000Z") / 1000,
        activityGrowth: 0.4,
        upsellOpportunity: "high",
      },
    ]);
  });

  test("adapts customer profile envelope to wallet screen view model", () => {
    const response: PhaseBCustomerProfileResponse = {
      generatedAt: "2026-04-29T00:00:00.000Z",
      generatedFrom: "phase-b-demo",
      provenance: "derived_insight",
      reasons: [evidence],
      profile: {
        provenance: "derived_insight",
        provenanceByField,
        reasons: [evidence],
        identity: {
          address: "0x0000000000000000000000000000000000000001",
          label: "Agent wallet",
          network: "base",
          asset: "usdc",
          role: "payer_wallet",
          identityBasis: "wallet_address",
          caveat: null,
          provenance: "onchain_fact",
          provenanceByField,
        },
        metrics: {
          spendAtomic: "1200",
          activityGrowth: 0.5,
          freeTierProgress: 0.8,
          entryPointRatio: 0.6,
          upsellOpportunity: "medium",
          provenance: "derived_insight",
          provenanceByField,
          reasons: [evidence],
        },
        providers: [
          {
            providerId: "provider-a",
            name: "Provider A",
            providerName: "Provider A canonical",
            payToWallet: "0x0000000000000000000000000000000000000002",
            spendAtomic: "700",
            transactionCount: 3,
            firstSeenAt: "2026-04-20T00:00:00.000Z",
            lastSeenAt: "2026-04-28T00:00:00.000Z",
            confidence: 0.9,
            provenance: "onchain_fact",
            provenanceByField,
          },
        ],
        timeline: [
          {
            at: "2026-04-28T00:00:00.000Z",
            eventType: "co_usage",
            description: "Used another provider",
            relatedProviderId: "provider-a",
            provenance: "derived_insight",
            provenanceByField,
            reasons: [evidence],
          },
        ],
        insights: [
          {
            key: "upsell",
            title: "Upsell candidate",
            summary: "High co-usage with agent endpoints.",
            confidence: 0.82,
            classification: "upsell",
            provenance: "derived_insight",
            provenanceByField,
            reasons: [evidence],
          },
        ],
      },
    };

    const profile = adaptCustomerProfile(response);

    expect(profile.customer.caveat).toContain("Payer wallet identity");
    expect(profile.providers[0]?.name).toBe("Provider A canonical");
    expect(profile.timeline[0]?.type).toBe("provider_usage");
    expect(profile.insights[0]?.severity).toBe("opportunity");
  });

  test("aggregates duplicate profile providers before rendering", () => {
    const duplicateProvider = {
      providerId: "coingecko",
      name: "CoinGecko",
      providerName: "CoinGecko",
      payToWallet: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      confidence: 0.9,
      provenance: "onchain_fact" as const,
      provenanceByField,
    };
    const response: PhaseBCustomerProfileResponse = {
      generatedAt: "2026-04-29T00:00:00.000Z",
      generatedFrom: "phase-b-demo",
      provenance: "derived_insight",
      reasons: [evidence],
      profile: {
        provenance: "derived_insight",
        provenanceByField,
        reasons: [evidence],
        identity: {
          address: "0x0000000000000000000000000000000000000001",
          label: null,
          network: "base",
          asset: "usdc",
          role: "payer_wallet",
          identityBasis: "wallet_address",
          caveat: null,
          provenance: "onchain_fact",
          provenanceByField,
        },
        metrics: {
          spendAtomic: "1200",
          activityGrowth: 0.5,
          freeTierProgress: 0.8,
          entryPointRatio: 0.6,
          upsellOpportunity: "medium",
          provenance: "derived_insight",
          provenanceByField,
          reasons: [evidence],
        },
        providers: [
          {
            ...duplicateProvider,
            spendAtomic: "700",
            transactionCount: 3,
            firstSeenAt: "2026-04-20T00:00:00.000Z",
            lastSeenAt: "2026-04-27T00:00:00.000Z",
          },
          {
            ...duplicateProvider,
            spendAtomic: "500",
            transactionCount: 2,
            firstSeenAt: "2026-04-22T00:00:00.000Z",
            lastSeenAt: "2026-04-28T00:00:00.000Z",
          },
        ],
        timeline: [],
        insights: [],
      },
    };

    const profile = adaptCustomerProfile(response);

    expect(profile.providers).toHaveLength(1);
    expect(profile.providers[0]).toMatchObject({
      providerId: "coingecko",
      payToWallet: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
      spendAtomic: "1200",
      transactionCount: 5,
      firstSeenAt: Date.parse("2026-04-20T00:00:00.000Z") / 1000,
      lastSeenAt: Date.parse("2026-04-28T00:00:00.000Z") / 1000,
    });
  });

  test("adapts wallet usage graph envelope to patterns view model", () => {
    const response: WalletUsageGraphResponse = {
      generatedAt: "2026-04-29T00:00:00.000Z",
      provenance: "derived_insight",
      reasons: [evidence],
      graph: {
        generatedFrom: "phase-b-demo",
        payerWalletLanguage: "payer wallet",
        identityFieldsExcluded: ["email", "ip"],
        confidence: 0.8,
        reasons: [evidence],
        provenance: "derived_insight",
        provenanceByField,
        providerWallets: [
          {
            providerId: "provider-a",
            providerName: "Provider A",
            name: "Provider A wallet",
            payToWallet: "0x0000000000000000000000000000000000000002",
            confidence: 0.9,
            provenance: "onchain_fact",
            provenanceByField,
            payerWallets: [
              {
                address: "0x0000000000000000000000000000000000000001",
                label: null,
                sharedSpendAtomic: "900",
                sharedTransactionCount: 2,
                overlapProviderCount: 1,
                confidence: 0.85,
                firstSeenAt: "2026-04-20T00:00:00.000Z",
                lastSeenAt: "2026-04-28T00:00:00.000Z",
                provenance: "derived_insight",
                provenanceByField,
                reasons: [evidence],
                observations: [
                  {
                    providerId: "provider-a",
                    providerName: "Provider A",
                    serviceName: "Inference API",
                    sharedSpendAtomic: "900",
                    sharedTransactionCount: 2,
                    overlapProviderCount: 1,
                    confidence: 0.85,
                    firstSeenAt: "2026-04-20T00:00:00.000Z",
                    lastSeenAt: "2026-04-28T00:00:00.000Z",
                    provenance: "onchain_fact",
                    provenanceByField,
                  },
                ],
                otherServiceCandidates: [],
              },
            ],
          },
        ],
      },
    };

    const graph = adaptWalletUsageGraph(response);

    expect(graph.payerWalletLanguage).toBe(true);
    expect(graph.identityFieldsExcluded).toEqual(["email", "ip"]);
    expect(graph.providerWallets[0]?.claimIds).toContain("Provider A");
    expect(graph.providerWallets[0]?.payerWallets[0]?.observations).toHaveLength(1);
  });
});
