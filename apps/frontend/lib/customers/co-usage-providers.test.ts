import { describe, expect, test } from "bun:test";
import type { WalletUsageGraphDto } from "@/lib/api/types";
import { aggregateCoUsageProviders } from "./co-usage-providers";

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
});
