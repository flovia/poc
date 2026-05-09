import { describe, expect, test } from "bun:test";
import type { WalletUsageGraphDto } from "@/lib/api/types";
import {
  aggregateCoUsageProviders,
  buildCoUsageProviderSankeyFlows,
  type CoUsageProviderSankeyCustomer,
} from "./co-usage-providers";

const OWN_PAY_TO = "0x0000000000000000000000000000000000000010";
const EXT_A = "0x00000000000000000000000000000000000000aa";
const EXT_B = "0x00000000000000000000000000000000000000bb";

const makeGraph = (
  payerWallets: WalletUsageGraphDto["providerWallets"][number]["payerWallets"],
): WalletUsageGraphDto => ({
  generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates",
  payerWalletLanguage: true,
  identityFieldsExcluded: [],
  providerWallets: [
    {
      payTo: OWN_PAY_TO,
      claimIds: ["Own Provider"],
      payerWallets,
    },
  ],
});

const makePayer = (
  address: string,
  candidates: WalletUsageGraphDto["providerWallets"][number]["payerWallets"][number]["otherServiceCandidates"],
) => ({
  wallet: address,
  observations: [],
  otherServiceCandidates: candidates,
});

const makeCandidate = (
  overrides: Partial<
    WalletUsageGraphDto["providerWallets"][number]["payerWallets"][number]["otherServiceCandidates"][number]
  > & { providerId: string; payToWallet: string },
) => ({
  caseId: overrides.providerId,
  candidateType: "service",
  entityId: overrides.payToWallet,
  confidence: 0.5,
  reasons: [],
  evidenceRefs: [],
  providerName: "Default Name",
  serviceName: "Default Service",
  coUsageCount: 1,
  ...overrides,
});

const makeCustomer = (
  address: string,
  overrides: Partial<CoUsageProviderSankeyCustomer> = {},
): CoUsageProviderSankeyCustomer => ({
  address: address.toLowerCase(),
  providerCount: 1,
  observationCount: 1,
  upsellOpportunity: "low",
  ...overrides,
});

describe("aggregateCoUsageProviders", () => {
  test("aggregates same external provider across multiple payer wallets", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a:spot",
          providerName: "Token Price API",
          serviceName: "Spot price",
          payToWallet: EXT_A,
          coUsageCount: 3,
          confidence: 0.8,
        }),
      ]),
      makePayer("0x2", [
        makeCandidate({
          providerId: "ext:a:spot",
          providerName: "Token Price API",
          serviceName: "Spot price",
          payToWallet: EXT_A,
          coUsageCount: 5,
          confidence: 0.6,
        }),
      ]),
    ]);

    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      payToWallet: EXT_A,
      providerName: "Token Price API",
      sharedWallets: 2,
      sharedTxCount: 8,
    });
    expect(rows[0]?.confidence).toBeCloseTo(0.7, 5);
  });

  test("only aggregates candidates for the selected provider payTo", () => {
    const graph: WalletUsageGraphDto = {
      ...makeGraph([
        makePayer("0x1", [
          makeCandidate({ providerId: "ext:a", providerName: "A", payToWallet: EXT_A }),
        ]),
      ]),
      providerWallets: [
        ...makeGraph([
          makePayer("0x1", [
            makeCandidate({ providerId: "ext:a", providerName: "A", payToWallet: EXT_A }),
          ]),
        ]).providerWallets,
        {
          payTo: "0x0000000000000000000000000000000000000099",
          claimIds: ["Other Provider"],
          payerWallets: [
            makePayer("0x2", [
              makeCandidate({ providerId: "ext:b", providerName: "B", payToWallet: EXT_B }),
            ]),
          ],
        },
      ],
    };

    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.payToWallet).toBe(EXT_A);
    expect(rows[0]?.sharedWallets).toBe(1);
  });

  test("aggregates all selected provider payTos for multi-chain services", () => {
    const SECOND_OWN_PAY_TO = "0x0000000000000000000000000000000000000020";
    const graph: WalletUsageGraphDto = {
      ...makeGraph([]),
      providerWallets: [
        {
          payTo: OWN_PAY_TO,
          claimIds: ["Own Provider Base"],
          payerWallets: [
            makePayer("0x1", [
              makeCandidate({ providerId: "ext:a", providerName: "A", payToWallet: EXT_A }),
            ]),
          ],
        },
        {
          payTo: SECOND_OWN_PAY_TO,
          claimIds: ["Own Provider Solana"],
          payerWallets: [
            makePayer("0x2", [
              makeCandidate({ providerId: "ext:a", providerName: "A", payToWallet: EXT_A }),
            ]),
          ],
        },
      ],
    };

    const rows = aggregateCoUsageProviders(graph, {
      ownPayTo: OWN_PAY_TO,
      ownPayTos: [OWN_PAY_TO, SECOND_OWN_PAY_TO],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.payToWallet).toBe(EXT_A);
    expect(rows[0]?.sharedWallets).toBe(2);
  });

  test("merges multiple endpoints under the same payToWallet into one row", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a:image",
          providerName: "AgentGram",
          serviceName: "https://agentgram.site/api/generate/image",
          payToWallet: EXT_A,
          coUsageCount: 4,
        }),
        makeCandidate({
          providerId: "ext:a:video",
          providerName: "AgentGram",
          serviceName: "https://agentgram.site/api/generate/video",
          payToWallet: EXT_A,
          coUsageCount: 6,
        }),
      ]),
      makePayer("0x2", [
        makeCandidate({
          providerId: "ext:a:image",
          providerName: "AgentGram",
          serviceName: "https://agentgram.site/api/generate/image",
          payToWallet: EXT_A,
          coUsageCount: 2,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sharedWallets).toBe(2);
    expect(rows[0]?.sharedTxCount).toBe(12);
    // Endpoints sorted by sharedTxCount desc; ties broken by sharedWallets desc.
    expect(rows[0]?.endpoints).toEqual([
      {
        serviceName: "https://agentgram.site/api/generate/image",
        sharedTxCount: 6,
        sharedWallets: 2,
      },
      {
        serviceName: "https://agentgram.site/api/generate/video",
        sharedTxCount: 6,
        sharedWallets: 1,
      },
    ]);
  });

  test("excludes the provider's own pay_to from results", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "self",
          providerName: "Self",
          payToWallet: OWN_PAY_TO,
          coUsageCount: 9,
        }),
        makeCandidate({
          providerId: "ext:a",
          providerName: "Token Price API",
          payToWallet: EXT_A,
          coUsageCount: 3,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows.map((r) => r.payToWallet)).toEqual([EXT_A]);
  });

  test("sorts by sharedWallets descending, then sharedTxCount descending", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({ providerId: "ext:b", payToWallet: EXT_B, coUsageCount: 100 }),
      ]),
      makePayer("0x2", [
        makeCandidate({ providerId: "ext:a", payToWallet: EXT_A, coUsageCount: 1 }),
      ]),
      makePayer("0x3", [
        makeCandidate({ providerId: "ext:a", payToWallet: EXT_A, coUsageCount: 1 }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows[0]?.payToWallet).toBe(EXT_A); // 2 wallets > 1 wallet
    expect(rows[1]?.payToWallet).toBe(EXT_B);
  });

  test("labels opportunity by confidence buckets", () => {
    const EXT_C = "0x00000000000000000000000000000000000000cc";
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({ providerId: "high", payToWallet: EXT_A, confidence: 0.85 }),
        makeCandidate({ providerId: "mid", payToWallet: EXT_B, confidence: 0.5 }),
        makeCandidate({ providerId: "low", payToWallet: EXT_C, confidence: 0.2 }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    const byPayTo = Object.fromEntries(rows.map((r) => [r.payToWallet, r]));
    expect(byPayTo[EXT_A]?.opportunity).toBe("high");
    expect(byPayTo[EXT_B]?.opportunity).toBe("medium");
    expect(byPayTo[EXT_C]?.opportunity).toBe("low");
  });

  test("uses provider name resolver when given (e.g. address-to-name lookup)", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a",
          providerName: EXT_A, // unresolved: name is the address itself
          payToWallet: EXT_A,
          coUsageCount: 4,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, {
      ownPayTo: OWN_PAY_TO,
      resolveProviderName: (address) => (address === EXT_A ? "Resolved API" : null),
    });
    expect(rows[0]?.providerName).toBe("Resolved API");
  });

  test("returns empty list when no candidates match", () => {
    const graph = makeGraph([makePayer("0x1", [])]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows).toEqual([]);
  });

  test("falls back to serviceName hostname when providerName looks like an EVM address", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a",
          providerName: "0x5770e66181984aa8510777790016b64aeda4f8b2",
          serviceName: "https://search.reversesandbox.com/web/search",
          payToWallet: EXT_A,
          coUsageCount: 4,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows[0]?.providerName).toBe("search.reversesandbox.com");
  });

  test("includes the list of payer wallets that pay this provider", () => {
    const graph = makeGraph([
      makePayer("0xAaa", [
        makeCandidate({ providerId: "ext:a", payToWallet: EXT_A, coUsageCount: 2 }),
      ]),
      makePayer("0xBbb", [
        makeCandidate({ providerId: "ext:a", payToWallet: EXT_A, coUsageCount: 4 }),
      ]),
      makePayer("0xCcc", [
        makeCandidate({ providerId: "ext:a", payToWallet: EXT_A, coUsageCount: 1 }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows[0]?.payerWallets).toEqual([
      { wallet: "0xbbb", sharedTxCount: 4 },
      { wallet: "0xaaa", sharedTxCount: 2 },
      { wallet: "0xccc", sharedTxCount: 1 },
    ]);
  });

  test("resolver wins over hostname fallback when both apply", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a",
          providerName: "0x5770e66181984aa8510777790016b64aeda4f8b2",
          serviceName: "https://search.reversesandbox.com/web/search",
          payToWallet: EXT_A,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, {
      ownPayTo: OWN_PAY_TO,
      resolveProviderName: () => "Reverse Search",
    });
    expect(rows[0]?.providerName).toBe("Reverse Search");
  });

  test("preserves the original payToWallet string casing (e.g. Solana base58)", () => {
    const SOLANA = "Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP";
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:solana",
          providerName: "Alibaba",
          payToWallet: SOLANA,
          coUsageCount: 2,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, { ownPayTo: OWN_PAY_TO });
    expect(rows[0]?.payToWallet).toBe(SOLANA);
  });

  test("metadata lookup works even when only useCase/assetSymbol/priceRangeUsd are provided", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a",
          payToWallet: EXT_A,
          coUsageCount: 5,
        }),
      ]),
    ]);
    const rows = aggregateCoUsageProviders(graph, {
      ownPayTo: OWN_PAY_TO,
      resolveMetadata: (payToWallet) =>
        payToWallet.toLowerCase() === EXT_A.toLowerCase()
          ? {
              useCase: "Analytics-only metadata",
              assetSymbol: "USDC",
              priceRangeUsd: { min: 0.01, max: 0.05 },
            }
          : null,
    });
    expect(rows[0]).toMatchObject({
      useCase: "Analytics-only metadata",
      assetSymbol: "USDC",
      priceRangeUsd: { min: 0.01, max: 0.05 },
    });
  });

  test("attaches metadata (description/category/serviceUrl/protocol/chain) when resolveMetadata is provided", () => {
    const graph = makeGraph([
      makePayer("0x1", [
        makeCandidate({
          providerId: "ext:a",
          payToWallet: EXT_A,
          coUsageCount: 5,
        }),
      ]),
    ]);

    const rows = aggregateCoUsageProviders(graph, {
      ownPayTo: OWN_PAY_TO,
      resolveMetadata: (payToWallet) =>
        payToWallet === EXT_A
          ? {
              title: "AgentMail",
              description: "Email inboxes for AI agents.",
              useCase: "Use to give agents email.",
              category: "messaging",
              serviceUrl: "https://x402.api.agentmail.to",
              protocol: "x402",
              chain: "Solana mainnet",
              assetSymbol: "USDC",
              priceRangeUsd: { min: 0, max: 10 },
            }
          : null,
    });

    expect(rows[0]).toMatchObject({
      description: "Email inboxes for AI agents.",
      category: "messaging",
      serviceUrl: "https://x402.api.agentmail.to",
      protocol: "x402",
      chain: "Solana mainnet",
      assetSymbol: "USDC",
    });
  });

  test("builds sankey flows from user segments to co-usage providers to target categories", () => {
    const rows = aggregateCoUsageProviders(
      makeGraph([
        makePayer("0x1", [
          makeCandidate({
            providerId: "ext:a:image",
            providerName: "AgentGram",
            serviceName: "https://agentgram.site/api/generate/image",
            payToWallet: EXT_A,
            coUsageCount: 4,
          }),
          makeCandidate({
            providerId: "ext:a:video",
            providerName: "AgentGram",
            serviceName: "https://agentgram.site/api/generate/video",
            payToWallet: EXT_A,
            coUsageCount: 6,
          }),
          makeCandidate({
            providerId: "ext:b",
            providerName: "MarketMesh",
            serviceName: "https://marketmesh.dev/v1/screeners/tokens",
            payToWallet: EXT_B,
            coUsageCount: 3,
          }),
        ]),
      ]),
      { ownPayTo: OWN_PAY_TO },
    );

    const flows = buildCoUsageProviderSankeyFlows(rows, {
      customersByWallet: new Map([
        ["0x1", makeCustomer("0x1", { providerCount: 4, upsellOpportunity: "high" })],
      ]),
      targetCategoryUsageByWallet: new Map([
        [
          "0x1",
          [
            { category: "Token detail", count: 6 },
            { category: "Simple price", count: 4 },
          ],
        ],
      ]),
      maxProviders: 2,
      maxTargetCategories: 1,
    });

    expect(flows).toEqual([
      {
        from: "segment:high-intent-power-users",
        fromLabel: "High-intent power users",
        fromStep: 0,
        occurrences: 10,
        to: `provider:${EXT_A}`,
        toLabel: "AgentGram",
        toStep: 1,
      },
      {
        from: `provider:${EXT_A}`,
        fromLabel: "AgentGram",
        fromStep: 1,
        occurrences: 6,
        to: "target-category:token-detail",
        toLabel: "Token detail",
        toStep: 2,
      },
      {
        from: `provider:${EXT_A}`,
        fromLabel: "AgentGram",
        fromStep: 1,
        occurrences: 4,
        to: `target-category:${EXT_A}:other`,
        toLabel: "Other target categories (1)",
        toStep: 2,
      },
      {
        from: "segment:high-intent-power-users",
        fromLabel: "High-intent power users",
        fromStep: 0,
        occurrences: 3,
        to: `provider:${EXT_B}`,
        toLabel: "MarketMesh",
        toStep: 1,
      },
      {
        from: `provider:${EXT_B}`,
        fromLabel: "MarketMesh",
        fromStep: 1,
        occurrences: 1.8,
        to: "target-category:token-detail",
        toLabel: "Token detail",
        toStep: 2,
      },
      {
        from: `provider:${EXT_B}`,
        fromLabel: "MarketMesh",
        fromStep: 1,
        occurrences: 1.2,
        to: `target-category:${EXT_B}:other`,
        toLabel: "Other target categories (1)",
        toStep: 2,
      },
    ]);
  });

  test("groups payer wallets into multiple user segments on the left side", () => {
    const rows = aggregateCoUsageProviders(
      makeGraph([
        makePayer("0xA", [
          makeCandidate({
            providerId: "ext:a:image",
            providerName: "AgentGram",
            serviceName: "https://agentgram.site/api/generate/image",
            payToWallet: EXT_A,
            coUsageCount: 4,
          }),
        ]),
        makePayer("0xB", [
          makeCandidate({
            providerId: "ext:a:video",
            providerName: "AgentGram",
            serviceName: "https://agentgram.site/api/generate/video",
            payToWallet: EXT_A,
            coUsageCount: 3,
          }),
        ]),
        makePayer("0xC", [
          makeCandidate({
            providerId: "ext:b",
            providerName: "MarketMesh",
            serviceName: "https://marketmesh.dev/v1/screeners/tokens",
            payToWallet: EXT_B,
            coUsageCount: 2,
          }),
        ]),
      ]),
      { ownPayTo: OWN_PAY_TO },
    );

    const flows = buildCoUsageProviderSankeyFlows(rows, {
      customersByWallet: new Map([
        [
          "0xa",
          makeCustomer("0xa", { providerCount: 4, observationCount: 9, upsellOpportunity: "high" }),
        ],
        [
          "0xb",
          makeCustomer("0xb", {
            providerCount: 2,
            observationCount: 5,
            upsellOpportunity: "medium",
          }),
        ],
        [
          "0xc",
          makeCustomer("0xc", { providerCount: 1, observationCount: 1, upsellOpportunity: "low" }),
        ],
      ]),
      maxProviders: 2,
      maxTargetCategories: 2,
    });

    expect(
      flows
        .filter((flow) => flow.to === `provider:${EXT_A}`)
        .map((flow) => ({
          from: flow.from,
          fromLabel: flow.fromLabel,
          occurrences: flow.occurrences,
        })),
    ).toEqual([
      {
        from: "segment:high-intent-power-users",
        fromLabel: "High-intent power users",
        occurrences: 4,
      },
      {
        from: "segment:multi-provider-builders",
        fromLabel: "Multi-provider builders",
        occurrences: 3,
      },
    ]);
    expect(
      flows.filter((flow) => flow.to === `provider:${EXT_B}`).map((flow) => flow.fromLabel),
    ).toEqual(["Single-purpose explorers"]);
  });
});
