import { describe, expect, test } from "bun:test";
import type { PhaseBCustomerProfileResponse, WalletUsageGraphResponse } from "contracts";
import type { ProviderCatalogItemDto } from "@/lib/api/types";
import { buildX402LiveAnalysisViewModelFromData } from "./live-data";

const PROVIDERS: ProviderCatalogItemDto[] = [
  {
    providerId: "pro-api-coingecko-com--base--usdc--0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    name: "pro-api.coingecko.com",
    serviceName: "pro-api.coingecko.com",
    network: "base",
    asset: "USDC",
    payTo: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
    transactionCount: 55,
    uniqueSenderCount: 43,
    totalVolumeAtomic: "550000",
    endpointCount: 6,
    resourceCount: 6,
    endpointAttributionStatus: "direct_payto_endpoint",
    attributionConfidence: 0.95,
    hasCustomerFacts: true,
    customerFactCount: 43,
    provenance: "onchain_fact",
    provenanceByField: {},
    reasons: [],
  },
  {
    providerId: "x402-quicknode-com--base--usdc--0xf46394addda95a3d5bcc1124605e3d15d204623c",
    name: "x402.quicknode.com",
    serviceName: "x402.quicknode.com",
    network: "base",
    asset: "USDC",
    payTo: "0xf46394addda95a3d5bcc1124605e3d15d204623c",
    transactionCount: 7,
    uniqueSenderCount: 11,
    totalVolumeAtomic: "7000",
    endpointCount: 4,
    resourceCount: 4,
    endpointAttributionStatus: "direct_payto_endpoint",
    attributionConfidence: 0.95,
    hasCustomerFacts: true,
    customerFactCount: 11,
    provenance: "onchain_fact",
    provenanceByField: {},
    reasons: [],
  },
  {
    providerId:
      "cryptobuddy-96zq-onrender-com--base--usdc--0x58be3eb5c86dacfc6ac71fad3aad8a7d07eeb391",
    name: "cryptobuddy-96zq.onrender.com",
    serviceName: "cryptobuddy-96zq.onrender.com",
    network: "base",
    asset: "USDC",
    payTo: "0x58be3eb5c86dacfc6ac71fad3aad8a7d07eeb391",
    transactionCount: 116,
    uniqueSenderCount: 6,
    totalVolumeAtomic: "13820602",
    endpointCount: 2,
    resourceCount: 2,
    endpointAttributionStatus: "direct_payto_endpoint",
    attributionConfidence: 0.95,
    hasCustomerFacts: true,
    customerFactCount: 6,
    provenance: "onchain_fact",
    provenanceByField: {},
    reasons: [],
  },
];

const WALLET_USAGE_GRAPH = {
  generatedAt: "2026-05-02T00:00:00.000Z",
  graph: {
    identityFieldsExcluded: ["endpointPath"],
    providerWallets: [
      {
        providerId: "coingecko",
        providerName: "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
        name: "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
        payToWallet: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
        payerWallets: [
          {
            address: "0x41fa1a9de7dbbc742f0e5ce8053aea6d8898c93e",
            label: null,
            sharedSpendAtomic: "550000",
            sharedTransactionCount: 55,
            overlapProviderCount: 6,
            confidence: 0.95,
            firstSeenAt: "2026-03-11T09:07:43Z",
            lastSeenAt: "2026-03-11T09:07:43Z",
            observations: [],
            otherServiceCandidates: [],
            provenance: "onchain_fact",
            provenanceByField: {},
          },
          {
            address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            label: null,
            sharedSpendAtomic: "80000",
            sharedTransactionCount: 8,
            overlapProviderCount: 3,
            confidence: 0.91,
            firstSeenAt: "2026-03-10T10:00:00Z",
            lastSeenAt: "2026-03-10T10:00:00Z",
            observations: [],
            otherServiceCandidates: [],
            provenance: "onchain_fact",
            provenanceByField: {},
          },
        ],
        confidence: 0.95,
        provenance: "onchain_fact",
        provenanceByField: {},
      },
      {
        providerId: "quicknode",
        providerName: "https://x402.quicknode.com/solana-mainnet",
        name: "https://x402.quicknode.com/solana-mainnet",
        payToWallet: "0xf46394addda95a3d5bcc1124605e3d15d204623c",
        payerWallets: [
          {
            address: "0xaf49177b7b497420a755fe4f3acbcac845f17661",
            label: null,
            sharedSpendAtomic: "7000",
            sharedTransactionCount: 7,
            overlapProviderCount: 12,
            confidence: 0.95,
            firstSeenAt: "2026-04-22T14:28:21Z",
            lastSeenAt: "2026-04-22T14:28:21Z",
            observations: [],
            otherServiceCandidates: [],
            provenance: "onchain_fact",
            provenanceByField: {},
          },
        ],
        confidence: 0.95,
        provenance: "onchain_fact",
        provenanceByField: {},
      },
      {
        providerId: "cryptobuddy",
        providerName: "https://cryptobuddy-96zq.onrender.com/signal",
        name: "https://cryptobuddy-96zq.onrender.com/signal",
        payToWallet: "0x58be3eb5c86dacfc6ac71fad3aad8a7d07eeb391",
        payerWallets: [
          {
            address: "0xc1ec78f70680342930f52707d1f653d492bcd603",
            label: null,
            sharedSpendAtomic: "13820602",
            sharedTransactionCount: 116,
            overlapProviderCount: 2,
            confidence: 0.95,
            firstSeenAt: "2026-04-29T09:58:53Z",
            lastSeenAt: "2026-04-29T09:58:53Z",
            observations: [],
            otherServiceCandidates: [],
            provenance: "onchain_fact",
            provenanceByField: {},
          },
        ],
        confidence: 0.95,
        provenance: "onchain_fact",
        provenanceByField: {},
      },
    ],
  },
} as unknown as WalletUsageGraphResponse;

const PROFILES = [
  {
    generatedAt: "2026-05-02T00:00:00.000Z",
    profile: {
      identity: {
        address: "0x41fa1a9de7dbbc742f0e5ce8053aea6d8898c93e",
      },
      metrics: {
        spendAtomic: "550000",
        activityGrowth: 0,
        freeTierProgress: 1,
        entryPointRatio: 1,
        upsellOpportunity: "high",
        lastSeenAt: "2026-03-11T09:07:43Z",
      },
      providers: [
        {
          providerId: "coingecko-search",
          name: "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
          providerName: "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
          payToWallet: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
          spendAtomic: "550000",
          transactionCount: 55,
          txCount: 55,
          firstSeenAt: "2026-03-11T09:07:43Z",
          lastSeenAt: "2026-03-11T09:07:43Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
        {
          providerId: "coingecko-eth",
          name: "https://pro-api.coingecko.com/api/v3/x402/onchain/simple/networks/eth/token_price/:address",
          providerName:
            "https://pro-api.coingecko.com/api/v3/x402/onchain/simple/networks/eth/token_price/:address",
          payToWallet: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
          spendAtomic: "550000",
          transactionCount: 55,
          txCount: 55,
          firstSeenAt: "2026-03-11T09:07:43Z",
          lastSeenAt: "2026-03-11T09:07:43Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
        {
          providerId: "coingecko-solana",
          name: "https://pro-api.coingecko.com/api/v3/x402/onchain/simple/networks/solana/token_price/:solana_address",
          providerName:
            "https://pro-api.coingecko.com/api/v3/x402/onchain/simple/networks/solana/token_price/:solana_address",
          payToWallet: "0x110cdbba7fe6434ec4ce3464cc523942ad6fb784",
          spendAtomic: "550000",
          transactionCount: 55,
          txCount: 55,
          firstSeenAt: "2026-03-11T09:07:43Z",
          lastSeenAt: "2026-03-11T09:07:43Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
      ],
      timeline: [],
      insights: [],
      provenance: "derived_insight",
      provenanceByField: {},
    },
    provenance: "derived_insight",
  },
  {
    generatedAt: "2026-05-02T00:00:00.000Z",
    profile: {
      identity: {
        address: "0xaf49177b7b497420a755fe4f3acbcac845f17661",
      },
      metrics: {
        spendAtomic: "7000",
        activityGrowth: 0,
        freeTierProgress: 0.7,
        entryPointRatio: 1,
        upsellOpportunity: "high",
        lastSeenAt: "2026-04-22T14:28:21Z",
      },
      providers: [
        {
          providerId: "quicknode-solana",
          name: "https://x402.quicknode.com/solana-mainnet",
          providerName: "https://x402.quicknode.com/solana-mainnet",
          payToWallet: "0xf46394addda95a3d5bcc1124605e3d15d204623c",
          spendAtomic: "7000",
          transactionCount: 7,
          txCount: 7,
          firstSeenAt: "2026-04-22T14:28:21Z",
          lastSeenAt: "2026-04-22T14:28:21Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
        {
          providerId: "quicknode-base",
          name: "https://x402.quicknode.com/base-mainnet",
          providerName: "https://x402.quicknode.com/base-mainnet",
          payToWallet: "0xf46394addda95a3d5bcc1124605e3d15d204623c",
          spendAtomic: "7000",
          transactionCount: 7,
          txCount: 7,
          firstSeenAt: "2026-04-22T14:28:21Z",
          lastSeenAt: "2026-04-22T14:28:21Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
        {
          providerId: "quicknode-hypercore",
          name: "https://x402.quicknode.com/hype-mainnet/hypercore",
          providerName: "https://x402.quicknode.com/hype-mainnet/hypercore",
          payToWallet: "0xf46394addda95a3d5bcc1124605e3d15d204623c",
          spendAtomic: "7000",
          transactionCount: 7,
          txCount: 7,
          firstSeenAt: "2026-04-22T14:28:21Z",
          lastSeenAt: "2026-04-22T14:28:21Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
      ],
      timeline: [],
      insights: [],
      provenance: "derived_insight",
      provenanceByField: {},
    },
    provenance: "derived_insight",
  },
  {
    generatedAt: "2026-05-02T00:00:00.000Z",
    profile: {
      identity: {
        address: "0xc1ec78f70680342930f52707d1f653d492bcd603",
      },
      metrics: {
        spendAtomic: "13820602",
        activityGrowth: 0,
        freeTierProgress: 1,
        entryPointRatio: 0.4,
        upsellOpportunity: "high",
        lastSeenAt: "2026-04-29T09:58:53Z",
      },
      providers: [
        {
          providerId: "cryptobuddy-signal",
          name: "https://cryptobuddy-96zq.onrender.com/signal",
          providerName: "https://cryptobuddy-96zq.onrender.com/signal",
          payToWallet: "0x58be3eb5c86dacfc6ac71fad3aad8a7d07eeb391",
          spendAtomic: "13820602",
          transactionCount: 116,
          txCount: 116,
          firstSeenAt: "2026-04-29T09:58:53Z",
          lastSeenAt: "2026-04-29T09:58:53Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
        {
          providerId: "cryptobuddy-analysis",
          name: "https://cryptobuddy-96zq.onrender.com/analysis",
          providerName: "https://cryptobuddy-96zq.onrender.com/analysis",
          payToWallet: "0x58be3eb5c86dacfc6ac71fad3aad8a7d07eeb391",
          spendAtomic: "13820602",
          transactionCount: 116,
          txCount: 116,
          firstSeenAt: "2026-04-29T09:58:53Z",
          lastSeenAt: "2026-04-29T09:58:53Z",
          confidence: 0.95,
          provenance: "onchain_fact",
          provenanceByField: {},
        },
      ],
      timeline: [],
      insights: [],
      provenance: "derived_insight",
      provenanceByField: {},
    },
    provenance: "derived_insight",
  },
] as unknown as PhaseBCustomerProfileResponse[];

describe("buildX402LiveAnalysisViewModelFromData", () => {
  test("builds live sankey models from wallet usage graph and sampled profiles", () => {
    const viewModel = buildX402LiveAnalysisViewModelFromData({
      providers: PROVIDERS,
      walletUsageGraph: WALLET_USAGE_GRAPH,
      profiles: PROFILES,
    });

    expect(
      viewModel.category_definitions.map((item) => item.display_label ?? item.category),
    ).toEqual([
      "Market data",
      "Chain & query access",
      "Signals & analysis",
      "Agent tools & entitlements",
    ]);
    expect(viewModel.sankey_patterns).toHaveLength(2);
    expect(viewModel.intermediary_summary[0]?.api_intermediary).toBe("Cryptobuddy");
    expect(viewModel.endpoint_master.some((row) => row.provider === "CoinGecko")).toBe(true);
    expect(
      viewModel.request_events_sample.some((row) => row.endpoint.includes("quicknode.com")),
    ).toBe(true);

    const intentPattern = viewModel.sankey_patterns.find(
      (pattern) => pattern.id === "intent_intermediary_target_category",
    );
    const endpointPattern = viewModel.sankey_patterns.find(
      (pattern) => pattern.id === "endpoint_sequence",
    );

    expect(
      intentPattern?.flows.some(
        (flow) =>
          flow.left_label === "Monitor token and pool prices" &&
          flow.middle_label === "x402" &&
          flow.right_label === "Market data",
      ),
    ).toBe(true);
    expect(
      intentPattern?.flows.some(
        (flow) =>
          flow.left_label === "Query chain state and liquidity" &&
          flow.middle_label === "x402" &&
          flow.right_label === "Chain & query access",
      ),
    ).toBe(true);
    expect(
      intentPattern?.flows.some(
        (flow) =>
          flow.left_label === "Generate signals and risk views" &&
          flow.middle_label === "x402" &&
          flow.right_label === "Signals & analysis",
      ),
    ).toBe(true);
    expect(
      endpointPattern?.flows.some(
        (flow) =>
          flow.left_label === "Pool search" &&
          flow.middle_label === "ETH token price" &&
          flow.right_label === "Solana token price",
      ),
    ).toBe(true);
    expect(
      endpointPattern?.flows.every(
        (flow) =>
          !flow.left_label.includes("http") &&
          !flow.middle_label.includes("http") &&
          !flow.right_label.includes("http") &&
          !flow.left_label.includes("/api/") &&
          !flow.middle_label.includes("/api/") &&
          !flow.right_label.includes("/api/"),
      ),
    ).toBe(true);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.left_label) ?? []).size,
    ).toBeGreaterThanOrEqual(5);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.left_label) ?? []).size,
    ).toBeLessThanOrEqual(6);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.middle_label) ?? []).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.middle_label) ?? []).size,
    ).toBeLessThanOrEqual(6);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.right_label) ?? []).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(endpointPattern?.flows.map((flow) => flow.right_label) ?? []).size,
    ).toBeLessThanOrEqual(6);
  });

  test("limits pattern 1 to representative rails and uses graph-sized flow counts", () => {
    const extendedGraph = {
      ...WALLET_USAGE_GRAPH,
      graph: {
        ...WALLET_USAGE_GRAPH.graph,
        providerWallets: [
          ...WALLET_USAGE_GRAPH.graph.providerWallets,
          {
            providerId: "agentgram",
            providerName: "https://www.agentgram.site/api/generate/video",
            name: "https://www.agentgram.site/api/generate/video",
            payToWallet: "0x054ade63d8046e189fbad70fae1e6203f92190ee",
            payerWallets: Array.from({ length: 12 }, (_, index) => ({
              address: `0x00000000000000000000000000000000000000${(index + 10).toString(16).padStart(2, "0")}`,
              label: null,
              sharedSpendAtomic: "10000",
              sharedTransactionCount: 1,
              overlapProviderCount: 1,
              confidence: 0.95,
              firstSeenAt: "2026-04-30T00:00:00Z",
              lastSeenAt: "2026-04-30T00:00:00Z",
              observations: [],
              otherServiceCandidates: [],
              provenance: "onchain_fact",
              provenanceByField: {},
            })),
            confidence: 0.95,
            provenance: "onchain_fact",
            provenanceByField: {},
          },
          {
            providerId: "game-theory-agent",
            providerName:
              "https://game-theory-agent-production.up.railway.app/entrypoints/analyze/invoke",
            name: "https://game-theory-agent-production.up.railway.app/entrypoints/analyze/invoke",
            payToWallet: "0x81fd234f63dd559d0eda56d17bb1bb78f236db37",
            payerWallets: Array.from({ length: 11 }, (_, index) => ({
              address: `0x00000000000000000000000000000000000000${(index + 40).toString(16).padStart(2, "0")}`,
              label: null,
              sharedSpendAtomic: "10000",
              sharedTransactionCount: 1,
              overlapProviderCount: 1,
              confidence: 0.95,
              firstSeenAt: "2026-04-30T00:00:00Z",
              lastSeenAt: "2026-04-30T00:00:00Z",
              observations: [],
              otherServiceCandidates: [],
              provenance: "onchain_fact",
              provenanceByField: {},
            })),
            confidence: 0.95,
            provenance: "onchain_fact",
            provenanceByField: {},
          },
          {
            providerId: "evplus",
            providerName: "https://evplus-funding-server.onrender.com/api/x402/bias/recommend",
            name: "https://evplus-funding-server.onrender.com/api/x402/bias/recommend",
            payToWallet: "0xc1a2f762f67af72fd05e79afa23f8358a4d7dbaf",
            payerWallets: Array.from({ length: 15 }, (_, index) => ({
              address: `0x00000000000000000000000000000000000000${(index + 70).toString(16).padStart(2, "0")}`,
              label: null,
              sharedSpendAtomic: "10000",
              sharedTransactionCount: 1,
              overlapProviderCount: 1,
              confidence: 0.95,
              firstSeenAt: "2026-04-30T00:00:00Z",
              lastSeenAt: "2026-04-30T00:00:00Z",
              observations: [],
              otherServiceCandidates: [],
              provenance: "onchain_fact",
              provenanceByField: {},
            })),
            confidence: 0.95,
            provenance: "onchain_fact",
            provenanceByField: {},
          },
          {
            providerId: "folio",
            providerName: "https://folio-seven-swart.vercel.app/api/x402/entitlements/x402-monthly",
            name: "https://folio-seven-swart.vercel.app/api/x402/entitlements/x402-monthly",
            payToWallet: "0x9f02988adb650e55cc5eb5619c383fd223848bb5",
            payerWallets: Array.from({ length: 4 }, (_, index) => ({
              address: `0x00000000000000000000000000000000000000${(index + 100).toString(16).padStart(2, "0")}`,
              label: null,
              sharedSpendAtomic: "10000",
              sharedTransactionCount: 1,
              overlapProviderCount: 1,
              confidence: 0.95,
              firstSeenAt: "2026-04-30T00:00:00Z",
              lastSeenAt: "2026-04-30T00:00:00Z",
              observations: [],
              otherServiceCandidates: [],
              provenance: "onchain_fact",
              provenanceByField: {},
            })),
            confidence: 0.95,
            provenance: "onchain_fact",
            provenanceByField: {},
          },
          {
            providerId: "empty-provider",
            providerName: "https://book-bot.app/api/x402",
            name: "https://book-bot.app/api/x402",
            payToWallet: "0x26b354827942a0802552e433d357c78d78d2e987",
            payerWallets: [],
            confidence: 0.95,
            provenance: "onchain_fact",
            provenanceByField: {},
          },
        ],
      },
    } as unknown as WalletUsageGraphResponse;

    const viewModel = buildX402LiveAnalysisViewModelFromData({
      providers: PROVIDERS,
      walletUsageGraph: extendedGraph,
      profiles: PROFILES,
    });

    const intentPattern = viewModel.sankey_patterns.find(
      (pattern) => pattern.id === "intent_intermediary_target_category",
    );
    const rails = Array.from(new Set(intentPattern?.flows.map((flow) => flow.middle_label) ?? []));
    const marketDataFlow = intentPattern?.flows.find(
      (flow) =>
        flow.left_label === "Monitor token and pool prices" &&
        flow.middle_label === "x402" &&
        flow.right_label === "Market data",
    );

    expect(rails.length).toBeLessThanOrEqual(2);
    expect(rails.includes("Folio")).toBe(false);
    expect(rails.includes("Book Bot")).toBe(false);
    expect(marketDataFlow?.flow_count).toBe(2);
  });
});
