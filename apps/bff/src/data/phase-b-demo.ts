import {
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  type PhaseBCustomerProfileResponse,
} from "contracts";

const GENERATED_AT = "2026-01-02T00:00:00.000Z";
const GENERATED_FROM = "phase-b-demo-bff";

export const CUSTOMER_ADDRESSES = {
  ACME: "0x1111111111111111111111111111111111111111",
  BETA: "0x2222222222222222222222222222222222222222",
  GAMMA: "0x3333333333333333333333333333333333333333",
} as const;

export const phaseBCustomerListResponse = validatePhaseBCustomerListResponse({
  generatedAt: GENERATED_AT,
  generatedFrom: GENERATED_FROM,
  customers: [
    {
      address: CUSTOMER_ADDRESSES.ACME,
      label: "Acme Commerce",
      observationCount: 26,
      spendAtomic: "1523000",
      providerCount: 4,
      lastSeenAt: "2026-01-01T10:00:00Z",
      activityGrowth: 0.31,
      upsellOpportunity: "high",
      provenance: "onchain_fact",
      provenanceByField: {
        spendAtomic: "onchain_fact",
        activityGrowth: "future_sdk_field",
        providerCount: "future_sdk_field",
      },
      evidence: [
        {
          provenance: "onchain_fact",
          label: "wallet spend projection",
          description: "Phase-B spend aggregation from onchain activity",
          sourceFields: ["spendAtomic", "providerCount"],
        },
      ],
    },
    {
      address: CUSTOMER_ADDRESSES.BETA,
      label: null,
      observationCount: 11,
      spendAtomic: "420000",
      providerCount: 2,
      lastSeenAt: "2025-12-28T16:44:00Z",
      activityGrowth: 0.04,
      upsellOpportunity: "medium",
      provenance: "demo_label",
      evidence: [
        {
          provenance: "demo_label",
          label: "synthetic demo segment assignment",
          description: "Demo label used for onboarding variation",
        },
      ],
    },
  ],
  customerCount: 2,
  scope: {
    network: "base",
    asset: "USDC",
    providerId: "provider-0",
  },
  provenance: "onchain_fact",
});

export const phaseBCustomerProfilesByAddress: Record<string, PhaseBCustomerProfileResponse> = {
  [CUSTOMER_ADDRESSES.ACME]: validatePhaseBCustomerProfileResponse({
    generatedAt: GENERATED_AT,
    generatedFrom: GENERATED_FROM,
    scope: {
      network: "base",
      asset: "USDC",
      payTo: "0xdddddddddddddddddddddddddddddddddddddddd",
    },
    provenance: "onchain_fact",
    profile: {
      identity: {
        address: CUSTOMER_ADDRESSES.ACME,
        label: "Acme Commerce",
        network: "base",
        asset: "USDC",
        role: "payer",
        identityBasis: "wallet-spend-and-activity",
        caveat: null,
        provenance: "onchain_fact",
        provenanceByField: {
          role: "demo_label",
          identityBasis: "onchain_fact",
        },
        evidence: [
          {
            provenance: "onchain_fact",
            label: "identity inferred from spend profile",
            sourceFields: ["address", "spendAtomic"],
          },
        ],
      },
      metrics: {
        spendAtomic: "1523000",
        activityGrowth: 0.31,
        freeTierProgress: 0.74,
        entryPointRatio: 0.58,
        upsellOpportunity: "high",
        totalSpendAtomic: "1523000",
        txCount: 24,
        uniqueProviderCount: 4,
        averageSpendAtomic: "63458",
        firstSeenAt: "2025-11-02T09:00:00Z",
        lastSeenAt: "2026-01-01T10:00:00Z",
        provenance: "derived_insight",
        provenanceByField: {
          freeTierProgress: "future_sdk_field",
          entryPointRatio: "future_sdk_field",
          averageSpendAtomic: "future_sdk_field",
        },
        reasons: [
          {
            provenance: "onchain_fact",
            label: "derived wallet metric projection",
            sourceFields: ["spendAtomic", "txCount", "uniqueProviderCount"],
          },
        ],
      },
      providers: [
        {
          providerId: "provider-1",
          name: "Payments API",
          providerName: "Payments API",
          payToWallet: "0xdddddddddddddddddddddddddddddddddddddddd",
          spendAtomic: "720000",
          transactionCount: 14,
          firstSeenAt: "2025-11-10T12:00:00Z",
          lastSeenAt: "2026-01-01T10:00:00Z",
          confidence: 0.93,
          provenance: "onchain_fact",
        },
        {
          providerId: "provider-2",
          name: "Identity Layer",
          providerName: "Identity Layer",
          payToWallet: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          spendAtomic: "400000",
          transactionCount: 8,
          firstSeenAt: "2025-11-22T08:15:00Z",
          lastSeenAt: "2026-01-01T09:00:00Z",
          confidence: 0.88,
          provenance: "derived_insight",
          provenanceByField: {
            providerName: "future_sdk_field",
            spendAtomic: "future_sdk_field",
          },
          reasons: [
            {
              provenance: "onchain_fact",
              label: "derived partnership signal from co-spend",
              sourceFields: ["sharedSpendAtomic", "txCount"],
            },
          ],
        },
      ],
      timeline: [
        {
          at: "2025-12-01T14:12:00Z",
          eventType: "payment",
          description: "Observed payment to Payments API",
          amountAtomic: "85000",
          relatedProviderId: "provider-1",
          provenance: "onchain_fact",
        },
        {
          at: "2026-01-01T09:00:00Z",
          eventType: "insight",
          description: "Likely onboarding through partner network",
          provenance: "derived_insight",
          relatedProviderId: "provider-2",
          reasons: [
            {
              provenance: "onchain_fact",
              label: "timeline inferred from repeated co-usage",
              sourceFields: ["providers", "sharedSpendAtomic"],
            },
          ],
        },
      ],
      insights: [
        {
          key: "upsell-partner",
          title: "High-volume growth",
          summary: "Wallet is concentrated across two providers, suggesting a targeted upsell opportunity.",
          confidence: 0.81,
          classification: "upsell",
          provenance: "derived_insight",
          provenanceByField: {
            summary: "future_sdk_field",
          },
          reasons: [
            {
              provenance: "onchain_fact",
              label: "inferred from provider concentration",
              sourceFields: ["providers", "activityGrowth"],
            },
          ],
        },
      ],
      provenance: "onchain_fact",
      provenanceByField: {
        providers: "future_sdk_field",
      },
      evidence: [
        {
          provenance: "onchain_fact",
          label: "aggregated profile snapshot",
          sourceFields: ["identity", "metrics", "providers"],
        },
      ],
    },
  }),
  [CUSTOMER_ADDRESSES.BETA]: validatePhaseBCustomerProfileResponse({
    generatedAt: GENERATED_AT,
    generatedFrom: GENERATED_FROM,
    provenance: "demo_label",
    profile: {
      identity: {
        address: CUSTOMER_ADDRESSES.BETA,
        label: null,
        network: "base",
        asset: "USDC",
        role: "payer",
        identityBasis: "beta-segment-bucket",
        caveat: "Demo-only identity",
        provenance: "demo_label",
      },
      metrics: {
        spendAtomic: "420000",
        activityGrowth: 0.04,
        freeTierProgress: 0.42,
        entryPointRatio: 0.34,
        upsellOpportunity: "medium",
        totalSpendAtomic: "420000",
        txCount: 9,
        uniqueProviderCount: 2,
        firstSeenAt: "2025-11-15T08:00:00Z",
        lastSeenAt: "2025-12-28T16:44:00Z",
        provenance: "onchain_fact",
      },
      providers: [
        {
          providerId: "provider-3",
          name: "Messaging Service",
          providerName: "Messaging Service",
          payToWallet: "0xffffffffffffffffffffffffffffffffffffffff",
          spendAtomic: "420000",
          transactionCount: 9,
          firstSeenAt: "2025-11-20T10:00:00Z",
          lastSeenAt: "2025-12-28T16:44:00Z",
          confidence: 0.86,
          provenance: "onchain_fact",
        },
      ],
      timeline: [
        {
          at: "2025-12-10T11:22:00Z",
          eventType: "activation",
          description: "Demo label activated for wallet cohort",
          provenance: "demo_label",
          reasons: [
            {
              provenance: "demo_label",
              label: "sample activation record",
            },
          ],
        },
      ],
      insights: [
        {
          key: "cohort-entry",
          title: "Demo onboarding path",
          summary: "Wallet is currently included in demo cohort for monitoring.",
          confidence: 0.95,
          classification: "retention",
          provenance: "demo_label",
        },
      ],
      provenance: "demo_label",
      provenanceByField: {
        timeline: "demo_label",
        insights: "demo_label",
      },
    },
  }),
};

export const getPhaseBCustomerProfileByAddress = (address: string): PhaseBCustomerProfileResponse | undefined =>
  phaseBCustomerProfilesByAddress[address.toLowerCase()];

export const phaseBWalletUsageGraphResponse = validatePhaseBWalletUsageGraphResponse({
  generatedAt: GENERATED_AT,
  scope: {
    network: "base",
    asset: "USDC",
    payTo: "0xdddddddddddddddddddddddddddddddddddddddd",
  },
  provenance: "onchain_fact",
  graph: {
    generatedFrom: GENERATED_FROM,
    payerWalletLanguage: "payer wallets that also use this provider",
    identityFieldsExcluded: ["providerId", "address", "payToWallet"],
    confidence: 0.87,
    reasons: [
      {
        provenance: "onchain_fact",
        label: "co-usage graph from prepared demo read model",
      },
    ],
    provenance: "onchain_fact",
    providerWallets: [
      {
        providerId: "provider-1",
        providerName: "Payments API",
        name: "Payments API",
        payToWallet: "0xdddddddddddddddddddddddddddddddddddddddd",
        confidence: 0.92,
        firstSeenAt: "2025-11-01T10:00:00Z",
        lastSeenAt: "2026-01-01T10:00:00Z",
        provenance: "onchain_fact",
        payerWallets: [
          {
            address: CUSTOMER_ADDRESSES.ACME,
            label: "Acme Commerce",
            sharedSpendAtomic: "920000",
            sharedTransactionCount: 19,
            overlapProviderCount: 2,
            confidence: 0.9,
            firstSeenAt: "2025-11-12T12:00:00Z",
            lastSeenAt: "2026-01-01T09:00:00Z",
            provenance: "onchain_fact",
            provenanceByField: {
              overlapProviderCount: "future_sdk_field",
            },
            observations: [
              {
                providerId: "provider-2",
                providerName: "Identity Layer",
                serviceName: "kyc",
                sharedSpendAtomic: "320000",
                sharedTransactionCount: 8,
                overlapProviderCount: 2,
                confidence: 0.88,
                firstSeenAt: "2025-12-05T11:11:00Z",
                lastSeenAt: "2026-01-01T08:00:00Z",
                provenance: "onchain_fact",
              },
              {
                providerId: "provider-4",
                providerName: "Wallet API",
                serviceName: "wallet-notify",
                sharedSpendAtomic: "120000",
                sharedTransactionCount: 2,
                overlapProviderCount: 1,
                confidence: 0.74,
                firstSeenAt: "2025-12-20T18:20:00Z",
                lastSeenAt: "2026-01-01T07:00:00Z",
                provenance: "derived_insight",
                provenanceByField: {
                  confidence: "future_sdk_field",
                },
                reasons: [
                  {
                    provenance: "onchain_fact",
                    label: "overlap inferred from recurring wallet notifications",
                    sourceFields: ["payerWallets", "sharedTransactionCount"],
                  },
                ],
              },
            ],
            otherServiceCandidates: [
              {
                providerId: "provider-2",
                providerName: "Identity Layer",
                serviceName: "kyc-check",
                coUsageCount: 3,
                confidence: 0.76,
                payToWallet: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                provenance: "future_sdk_field",
                provenanceByField: {
                  coUsageCount: "future_sdk_field",
                },
              },
            ],
          },
          {
            address: CUSTOMER_ADDRESSES.BETA,
            label: null,
            sharedSpendAtomic: "310000",
            sharedTransactionCount: 7,
            overlapProviderCount: 1,
            confidence: 0.83,
            firstSeenAt: "2025-11-22T09:30:00Z",
            lastSeenAt: "2025-12-28T16:44:00Z",
            provenance: "derived_insight",
            reasons: [
              {
                provenance: "demo_label",
                label: "candidate relation inferred from demo segment overlap",
              },
            ],
            observations: [
              {
                providerId: "provider-5",
                providerName: "Analytics Service",
                serviceName: "usage-telemetry",
                sharedSpendAtomic: "190000",
                sharedTransactionCount: 4,
                overlapProviderCount: 1,
                confidence: 0.66,
                firstSeenAt: "2025-12-12T15:00:00Z",
                lastSeenAt: "2025-12-28T15:40:00Z",
                provenance: "future_sdk_field",
                provenanceByField: {
                  sharedSpendAtomic: "future_sdk_field",
                },
              },
            ],
            otherServiceCandidates: [
              {
                providerId: "provider-3",
                providerName: "Messaging Service",
                serviceName: "webhooks",
                coUsageCount: 4,
                confidence: 0.72,
                payToWallet: "0xffffffffffffffffffffffffffffffffffffffff",
                provenance: "future_sdk_field",
              },
            ],
          },
        ],
      },
    ],
  },
});

export const knownCustomerProfileAddress = CUSTOMER_ADDRESSES.ACME;
