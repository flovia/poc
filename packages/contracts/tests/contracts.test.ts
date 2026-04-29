import { beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  validateBitqueryAggregate,
  validateCdpResource,
  validateMarketSnapshot,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
} from "../src/index";

const readFixture = <T>(name: string): T => {
  const fixtureRoot = path.resolve(import.meta.dir, "fixtures");
  const raw = fs.readFileSync(path.join(fixtureRoot, name), "utf8");
  return JSON.parse(raw) as T;
};

describe("contracts schema validation", () => {
  test("accepts a valid normalized CDP resource", () => {
    const fixture = readFixture<unknown>("cdp-resource-valid.json");
    const parsed = validateCdpResource(fixture);
    expect(parsed.resourceId).toBe("resource-1");
    expect(parsed.paymentOptions).toHaveLength(2);
    expect(parsed.paymentOptions[0]?.quality?.expectedTransactionCount).toBe(12);
  });

  test("accepts a valid bitquery aggregate and rejects malformed data", () => {
    expect(
      validateBitqueryAggregate({
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
        transactionCount: 2,
        uniqueSenderCount: 1,
        totalVolumeAtomic: "9001",
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
        },
      }),
    ).toMatchObject({
      transactionCount: 2,
      totalVolumeAtomic: "9001",
    });

    expect(() =>
      validateBitqueryAggregate({
        network: "base",
        asset: "USDC",
        payTo: "0x1111111111111111111111111111111111111111",
        transactionCount: -1,
        uniqueSenderCount: 1,
        totalVolumeAtomic: "9001",
        provenance: {
          sourceKind: "bitquery",
          sourceName: "bitquery-graphql",
        },
      }),
    ).toThrow();
  });

  test("rejects invalid EVM address in Phase B customer list", () => {
    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 1,
        provenance: "onchain_fact",
        customers: [
          {
            address: "not-an-address",
            label: null,
            observationCount: 1,
            spendAtomic: "100",
            providerCount: 1,
            activityGrowth: 0,
            upsellOpportunity: "low",
            provenance: "onchain_fact",
          },
        ],
      }),
    ).toThrow();
  });

  test("rejects invalid CDP resource fixture", () => {
    const fixture = readFixture<unknown>("cdp-resource-invalid.json");
    expect(() => validateCdpResource(fixture)).toThrow();
  });

  test("validates a market snapshot fixture and rejects invalid snapshot", () => {
    const valid = readFixture<unknown>("market-snapshot-valid.json");
    const invalid = readFixture<unknown>("market-snapshot-invalid.json");

    expect(() => validateMarketSnapshot(valid)).not.toThrow();
    expect(() => validateMarketSnapshot(invalid)).toThrow();
  });

  test("accepts a valid Phase B customer list response", () => {
    expect(
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 2,
        scope: {
          providerId: "provider-1",
          network: "base",
          asset: "USDC",
          payTo: "0x3333333333333333333333333333333333333333",
        },
        provenance: "derived_insight",
        reasons: [
          {
            provenance: "demo_label",
            label: "top wallet list",
          },
        ],
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: "acme-wallet",
            observationCount: 42,
            spendAtomic: "1000000",
            providerCount: 3,
            lastSeenAt: "2026-01-01T00:00:00Z",
            activityGrowth: 0.32,
            upsellOpportunity: "high",
            provenance: "onchain_fact",
            evidence: [
              {
                provenance: "onchain_fact",
                label: "wallet spend projection",
                sourceFields: ["spendAtomic", "providerCount"],
              },
            ],
          },
          {
            address: "0x2222222222222222222222222222222222222222",
            label: null,
            observationCount: 8,
            spendAtomic: "0",
            providerCount: 1,
            activityGrowth: -0.2,
            upsellOpportunity: "low",
            provenance: "demo_label",
            evidence: [
              {
                provenance: "demo_label",
                label: "synthetic upsell score",
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      customerCount: 2,
      customers: [
        { address: "0x1111111111111111111111111111111111111111", spendAtomic: "1000000" },
        { address: "0x2222222222222222222222222222222222222222", spendAtomic: "0" },
      ],
    });
  });

  test("rejects customer list responses with mismatched customerCount", () => {
    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 2,
        provenance: "onchain_fact",
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            observationCount: 1,
            spendAtomic: "12",
            providerCount: 1,
            activityGrowth: 0.1,
            upsellOpportunity: "low",
            provenance: "onchain_fact",
          },
        ],
      }),
    ).toThrow();
  });

  test("accepts a valid Phase B profile and graph payload", () => {
    expect(
      validatePhaseBCustomerProfileResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        scope: {
          providerId: "provider-1",
          network: "base",
          asset: "USDC",
          payTo: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        provenance: "onchain_fact",
        profile: {
          identity: {
            address: "0x1111111111111111111111111111111111111111",
            label: "acme-wallet",
            network: "base",
            asset: "USDC",
            role: "payer",
            identityBasis: "spend-profile",
            caveat: null,
            provenance: "onchain_fact",
          },
          metrics: {
            spendAtomic: "150000",
            activityGrowth: 0.12,
            freeTierProgress: 0.62,
            entryPointRatio: 0.4,
            upsellOpportunity: "medium",
            totalSpendAtomic: "150000",
            txCount: 24,
            uniqueProviderCount: 4,
            averageSpendAtomic: "6250",
            firstSeenAt: "2025-12-01T00:00:00Z",
            lastSeenAt: "2026-01-01T00:00:00Z",
            provenance: "onchain_fact",
          },
          providers: [
            {
              providerId: "provider-1",
              name: "Search Service",
              providerName: "Search Service",
              payToWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0",
              spendAtomic: "50000",
              transactionCount: 10,
              firstSeenAt: "2025-12-05T00:00:00Z",
              lastSeenAt: "2026-01-01T00:00:00Z",
              confidence: 0.93,
              provenance: "onchain_fact",
            },
          ],
          timeline: [
            {
              at: "2026-01-01T00:00:00Z",
              eventType: "payment",
              description: "Observed payment for demo feature",
              amountAtomic: "1000",
              relatedProviderId: "provider-1",
              provenance: "derived_insight",
              reasons: [
                {
                  provenance: "onchain_fact",
                  label: "timeline from payment activity",
                  sourceFields: ["amountAtomic"],
                },
              ],
            },
          ],
          insights: [
            {
              key: "upsell-candidate",
              title: "Partnership opportunity",
              summary: "Recurring co-usage suggests shared integration point",
              confidence: 0.78,
              classification: "partnership",
              provenance: "derived_insight",
              reasons: [
                {
                  provenance: "onchain_fact",
                  label: "shared provider overlap",
                  sourceFields: ["providers", "spendAtomic"],
                },
              ],
            },
          ],
          provenance: "onchain_fact",
        },
      }),
    ).toMatchObject({
      profile: {
        identity: { address: "0x1111111111111111111111111111111111111111" },
      },
    });

    expect(
      validatePhaseBWalletUsageGraphResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        scope: {
          providerId: "provider-1",
          network: "base",
          asset: "USDC",
          payTo: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        provenance: "onchain_fact",
        graph: {
          generatedFrom: "phase-b-demo",
          payerWalletLanguage: "payer wallets that also use this provider",
          identityFieldsExcluded: ["providerId", "address"],
          confidence: 0.84,
          reasons: [
            {
              provenance: "onchain_fact",
              label: "co-usage graph projection",
            },
          ],
          provenance: "onchain_fact",
          providerWallets: [
            {
              providerId: "provider-1",
              providerName: "Provider 1",
              name: "Provider 1",
              payToWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              confidence: 0.9,
              firstSeenAt: "2025-11-01T00:00:00Z",
              lastSeenAt: "2026-01-01T00:00:00Z",
              provenance: "onchain_fact",
              payerWallets: [
                {
                  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  label: "payer-wallet-a",
                  sharedSpendAtomic: "78000",
                  sharedTransactionCount: 4,
                  overlapProviderCount: 2,
                  confidence: 0.88,
                  firstSeenAt: "2025-11-05T00:00:00Z",
                  lastSeenAt: "2026-01-01T00:00:00Z",
                  provenance: "onchain_fact",
                  observations: [
                    {
                      providerId: "provider-2",
                      providerName: "Payments API",
                      serviceName: "invoice",
                      sharedSpendAtomic: "125000",
                      sharedTransactionCount: 7,
                      overlapProviderCount: 3,
                      confidence: 0.93,
                      firstSeenAt: "2025-12-10T00:00:00Z",
                      lastSeenAt: "2026-01-01T00:00:00Z",
                      provenance: "onchain_fact",
                    },
                  ],
                  otherServiceCandidates: [
                    {
                      providerId: "provider-2",
                      providerName: "Payments API",
                      serviceName: "invoice",
                      coUsageCount: 3,
                      confidence: 0.76,
                      provenance: "derived_insight",
                      reasons: [
                        {
                          provenance: "onchain_fact",
                          label: "derived candidate from overlap",
                          sourceFields: ["observations"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ).toMatchObject({
      graph: {
        providerWallets: [
          {
            providerId: "provider-1",
            payerWallets: [
              {
                address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                observations: [{ providerId: "provider-2" }],
              },
            ],
          },
        ],
      },
    });
  });

  test("rejects malformed Phase B payloads", () => {
    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 1,
        provenance: "onchain_fact",
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            observationCount: 1,
            spendAtomic: "123",
            providerCount: 1,
            activityGrowth: 0.1,
            upsellOpportunity: "low",
            provenance: "bad_provenance",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      validatePhaseBCustomerListResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        customerCount: 1,
        provenance: "onchain_fact",
        customers: [
          {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            observationCount: 1,
            spendAtomic: "12.34",
            providerCount: 1,
            activityGrowth: 0.1,
            upsellOpportunity: "low",
            provenance: "onchain_fact",
          },
        ],
      }),
    ).toThrow();
  });

  test("rejects invalid derived reasons and graph confidence bounds", () => {
    expect(() =>
      validatePhaseBCustomerProfileResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        generatedFrom: "phase-b-demo",
        provenance: "onchain_fact",
        profile: {
          identity: {
            address: "0x1111111111111111111111111111111111111111",
            label: null,
            network: "base",
            asset: "USDC",
            role: "payer",
            identityBasis: "spend-profile",
            caveat: null,
            provenance: "derived_insight",
          },
          metrics: {
            spendAtomic: "150000",
            activityGrowth: 0.12,
            freeTierProgress: 0.5,
            entryPointRatio: 0.4,
            upsellOpportunity: "medium",
            txCount: 24,
            uniqueProviderCount: 4,
            provenance: "onchain_fact",
          },
          providers: [],
          timeline: [],
          insights: [],
          provenance: "onchain_fact",
        },
      }),
    ).toThrow();

    expect(() =>
      validatePhaseBWalletUsageGraphResponse({
        generatedAt: "2026-01-01T00:00:00Z",
        provenance: "onchain_fact",
        graph: {
          generatedFrom: "phase-b-demo",
          payerWalletLanguage: "payer wallets that also use this provider",
          identityFieldsExcluded: ["providerId", "address"],
          confidence: 1.2,
          reasons: [
            {
              provenance: "onchain_fact",
              label: "out-of-range confidence",
            },
          ],
          provenance: "onchain_fact",
          providerWallets: [
            {
              providerId: "provider-1",
              providerName: "Provider 1",
              name: "Provider 1",
              payToWallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              confidence: 0.9,
              provenance: "onchain_fact",
              payerWallets: [
                {
                  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  label: null,
                  sharedSpendAtomic: "78000",
                  sharedTransactionCount: 4,
                  overlapProviderCount: 2,
                  confidence: 0.88,
                  firstSeenAt: "2025-11-05T00:00:00Z",
                  lastSeenAt: "2026-01-01T00:00:00Z",
                  provenance: "onchain_fact",
                  observations: [
                    {
                      providerId: "provider-2",
                      providerName: "Payments API",
                      serviceName: "invoice",
                      sharedSpendAtomic: "125000",
                      sharedTransactionCount: 7,
                      overlapProviderCount: 3,
                      confidence: 1.2,
                      firstSeenAt: "2025-12-10T00:00:00Z",
                      lastSeenAt: "2026-01-01T00:00:00Z",
                      provenance: "onchain_fact",
                    },
                  ],
                  otherServiceCandidates: [],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
  });
});
