import {
  validateMockEndpointAttributionFixture,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateRealTransactionFixture,
  type DataProvenance,
  type EvidenceLabel,
  type MockEndpointAttributionFixture,
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type RealTransactionFact,
  type RealTransactionFixture,
  type WalletUsageGraphResponse,
} from "contracts";

export type JoinedProjectionRecord = RealTransactionFact & {
  endpointPath: string;
  endpointName: string;
  workflowLabel: string;
  requestMethod: string;
  provenanceByField: Record<string, DataProvenance>;
  reasons: EvidenceLabel[];
};

export type PhaseBProjectionSet = {
  customerList: PhaseBCustomerListResponse;
  profilesByAddress: Record<string, PhaseBCustomerProfileResponse>;
  walletUsageGraph: WalletUsageGraphResponse;
  joinedRecords: JoinedProjectionRecord[];
};

const generatedFrom = "phase-a-real-tx-plus-mock-attribution";

const demoReason: EvidenceLabel = {
  provenance: "demo_label",
  label: "mock endpoint attribution",
  description:
    "Endpoint fields are attached by deterministic demo attribution, not inferred from onchain data.",
};

const onchainReason: EvidenceLabel = {
  provenance: "onchain_fact",
  label: "CoinGecko payTo transfer fact",
  sourceFields: ["txHash", "payerWallet", "payTo", "amount", "timestamp"],
};

export const joinTransactionAttribution = (
  transactionFixture: unknown,
  attributionFixture: unknown,
): JoinedProjectionRecord[] => {
  const transactions = validateRealTransactionFixture(transactionFixture);
  const attribution = validateMockEndpointAttributionFixture(attributionFixture);
  return joinValidatedTransactionAttribution(transactions, attribution);
};

const joinValidatedTransactionAttribution = (
  transactions: RealTransactionFixture,
  attribution: MockEndpointAttributionFixture,
): JoinedProjectionRecord[] => {
  const factsByHash = new Map(transactions.facts.map((fact) => [fact.txHash, fact]));
  return attribution.items.map((item) => {
    const fact = factsByHash.get(item.txHash);
    if (!fact) {
      throw new Error(`mock attribution references unknown txHash: ${item.txHash}`);
    }
    return {
      ...fact,
      endpointPath: item.endpointPath,
      endpointName: item.endpointName,
      workflowLabel: item.workflowLabel,
      requestMethod: item.requestMethod,
      provenanceByField: {
        txHash: "onchain_fact",
        payerWallet: "onchain_fact",
        payTo: "onchain_fact",
        amount: "onchain_fact",
        asset: "onchain_fact",
        network: "onchain_fact",
        timestamp: "onchain_fact",
        endpointPath: item.provenance.endpointPath,
        endpointName: item.provenance.endpointName,
        workflowLabel: item.provenance.workflowLabel,
        requestMethod: item.provenance.requestMethod,
      },
      reasons: item.reasons,
    };
  });
};

const sumAmounts = (records: JoinedProjectionRecord[]) =>
  records.reduce((sum, record) => sum + BigInt(record.amount), 0n).toString();

const byPayer = (records: JoinedProjectionRecord[]) => {
  const grouped = new Map<string, JoinedProjectionRecord[]>();
  for (const record of records) {
    grouped.set(record.payerWallet, [...(grouped.get(record.payerWallet) ?? []), record]);
  }
  return [...grouped.entries()].map(([payerWallet, payerRecords]) => ({
    payerWallet,
    records: payerRecords.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  }));
};

const unique = <T>(items: T[]) => [...new Set(items)];

export const buildPhaseBProjections = (
  transactionFixture: unknown,
  attributionFixture: unknown,
): PhaseBProjectionSet => {
  const transactions = validateRealTransactionFixture(transactionFixture);
  const attribution = validateMockEndpointAttributionFixture(attributionFixture);
  const joinedRecords = joinValidatedTransactionAttribution(transactions, attribution);
  const grouped = byPayer(joinedRecords);
  const generatedAt = transactions.generatedAt;
  const scope = {
    providerId: transactions.providerId,
    network: joinedRecords[0]?.network,
    asset: joinedRecords[0]?.asset,
    payTo: joinedRecords[0]?.payTo,
  };

  const customerList = validatePhaseBCustomerListResponse({
    generatedAt,
    generatedFrom,
    customers: grouped.map(({ payerWallet, records }, index) => ({
      address: payerWallet,
      label: index === 0 ? "Observed CoinGecko payer" : null,
      observationCount: records.length,
      spendAtomic: sumAmounts(records),
      providerCount: unique(records.map((record) => record.endpointPath)).length,
      lastSeenAt: records[0]?.timestamp,
      activityGrowth: Number((0.12 + index * 0.04).toFixed(2)),
      upsellOpportunity: records.length > 1 ? "high" : "medium",
      provenance: "derived_insight",
      provenanceByField: {
        address: "onchain_fact",
        observationCount: "onchain_fact",
        spendAtomic: "onchain_fact",
        providerCount: "demo_label",
        activityGrowth: "future_sdk_field",
        upsellOpportunity: "derived_insight",
      },
      evidence: [onchainReason],
      reasons: [onchainReason, demoReason],
    })),
    customerCount: grouped.length,
    scope,
    provenance: "derived_insight",
    reasons: [onchainReason, demoReason],
  });

  const profilesByAddress = Object.fromEntries(
    grouped.map(({ payerWallet, records }, index) => {
      const first = records.at(-1) ?? records[0];
      const latest = records[0];
      const spendAtomic = sumAmounts(records);
      const profile = validatePhaseBCustomerProfileResponse({
        generatedAt,
        generatedFrom,
        scope,
        provenance: "derived_insight",
        reasons: [onchainReason, demoReason],
        profile: {
          identity: {
            address: payerWallet,
            label: index === 0 ? "Observed CoinGecko payer" : null,
            network: latest.network,
            asset: latest.asset,
            role: "payer",
            identityBasis: "txHash + payerWallet + payTo transfer facts",
            caveat: "Endpoint attribution is mock demo data until SDK telemetry is available.",
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              network: "onchain_fact",
              asset: "onchain_fact",
              role: "demo_label",
              identityBasis: "onchain_fact",
              caveat: "demo_label",
            },
            evidence: [onchainReason],
            reasons: [onchainReason, demoReason],
          },
          metrics: {
            spendAtomic,
            activityGrowth: Number((0.18 + index * 0.03).toFixed(2)),
            freeTierProgress: Math.min(1, records.length / 5),
            entryPointRatio: unique(records.map((record) => record.endpointPath)).length / 5,
            upsellOpportunity: records.length > 1 ? "high" : "medium",
            totalSpendAtomic: spendAtomic,
            txCount: records.length,
            uniqueProviderCount: unique(records.map((record) => record.endpointPath)).length,
            averageSpendAtomic: (BigInt(spendAtomic) / BigInt(records.length)).toString(),
            firstSeenAt: first.timestamp,
            lastSeenAt: latest.timestamp,
            provenance: "derived_insight",
            provenanceByField: {
              spendAtomic: "onchain_fact",
              txCount: "onchain_fact",
              uniqueProviderCount: "demo_label",
              averageSpendAtomic: "derived_insight",
              freeTierProgress: "future_sdk_field",
              entryPointRatio: "demo_label",
            },
            reasons: [onchainReason, demoReason],
          },
          providers: records.map((record) => ({
            providerId: transactions.providerId,
            name: record.endpointName,
            providerName: record.endpointName,
            payToWallet: record.payTo,
            spendAtomic: record.amount,
            transactionCount: 1,
            txCount: 1,
            firstSeenAt: record.timestamp,
            lastSeenAt: record.timestamp,
            confidence: 0.8,
            provenance: "derived_insight",
            provenanceByField: {
              payToWallet: "onchain_fact",
              spendAtomic: "onchain_fact",
              transactionCount: "onchain_fact",
              name: "demo_label",
              providerName: "demo_label",
            },
            reasons: [onchainReason, demoReason],
          })),
          timeline: records.map((record) => ({
            at: record.timestamp,
            eventType: "payment",
            description: `${record.workflowLabel}: ${record.requestMethod} ${record.endpointPath}`,
            amountAtomic: record.amount,
            relatedProviderId: transactions.providerId,
            provenance: "derived_insight",
            provenanceByField: {
              at: "onchain_fact",
              amountAtomic: "onchain_fact",
              description: "demo_label",
            },
            reasons: [onchainReason, demoReason],
          })),
          insights: [
            {
              key: "mock-attribution-boundary",
              title: "Endpoint attribution remains demo-only",
              summary:
                "Onchain transfer facts are real, while endpoint and workflow labels are mock attribution.",
              confidence: 0.82,
              classification: "retention",
              provenance: "derived_insight",
              provenanceByField: { summary: "derived_insight" },
              reasons: [onchainReason, demoReason],
            },
          ],
          provenance: "derived_insight",
          provenanceByField: {
            identity: "onchain_fact",
            metrics: "derived_insight",
            providers: "demo_label",
            timeline: "derived_insight",
            insights: "derived_insight",
          },
          evidence: [onchainReason, demoReason],
          reasons: [onchainReason, demoReason],
        },
      });
      return [payerWallet, profile];
    }),
  );

  const walletUsageGraph = validatePhaseBWalletUsageGraphResponse({
    generatedAt,
    scope,
    provenance: "derived_insight",
    reasons: [onchainReason, demoReason],
    graph: {
      generatedFrom,
      payerWalletLanguage: "real payer wallets that paid the observed CoinGecko x402 payTo",
      identityFieldsExcluded: ["endpointPath", "workflowLabel"],
      confidence: 0.79,
      provenance: "derived_insight",
      provenanceByField: {
        providerWallets: "onchain_fact",
        identityFieldsExcluded: "demo_label",
      },
      reasons: [onchainReason, demoReason],
      providerWallets: [
        {
          providerId: transactions.providerId,
          providerName: "CoinGecko x402",
          name: "CoinGecko x402",
          payToWallet: scope.payTo,
          confidence: 0.86,
          firstSeenAt: joinedRecords.at(-1)?.timestamp,
          lastSeenAt: joinedRecords[0]?.timestamp,
          provenance: "derived_insight",
          provenanceByField: {
            payToWallet: "onchain_fact",
            providerName: "demo_label",
            payerWallets: "onchain_fact",
          },
          reasons: [onchainReason, demoReason],
          payerWallets: grouped.map(({ payerWallet, records }) => ({
            address: payerWallet,
            label: payerWallet === grouped[0]?.payerWallet ? "Observed CoinGecko payer" : null,
            sharedSpendAtomic: sumAmounts(records),
            sharedTransactionCount: records.length,
            overlapProviderCount: unique(records.map((record) => record.endpointPath)).length,
            confidence: 0.8,
            firstSeenAt: records.at(-1)?.timestamp,
            lastSeenAt: records[0]?.timestamp,
            provenance: "derived_insight",
            provenanceByField: {
              address: "onchain_fact",
              sharedSpendAtomic: "onchain_fact",
              sharedTransactionCount: "onchain_fact",
              overlapProviderCount: "demo_label",
            },
            reasons: [onchainReason, demoReason],
            observations: records.map((record) => ({
              providerId: transactions.providerId,
              providerName: "CoinGecko x402",
              serviceName: record.workflowLabel,
              sharedSpendAtomic: record.amount,
              sharedTransactionCount: 1,
              overlapProviderCount: 1,
              confidence: 0.75,
              firstSeenAt: record.timestamp,
              lastSeenAt: record.timestamp,
              provenance: "derived_insight",
              provenanceByField: {
                serviceName: "demo_label",
                sharedSpendAtomic: "onchain_fact",
              },
              reasons: [onchainReason, demoReason],
            })),
            otherServiceCandidates: records.map((record) => ({
              providerId: transactions.providerId,
              providerName: "CoinGecko x402",
              serviceName: record.endpointName,
              coUsageCount: 1,
              confidence: 0.65,
              payToWallet: record.payTo,
              provenance: "future_sdk_field",
              provenanceByField: {
                serviceName: "demo_label",
                coUsageCount: "future_sdk_field",
                payToWallet: "onchain_fact",
              },
              reasons: [demoReason],
            })),
          })),
        },
      ],
    },
  });

  return { customerList, profilesByAddress, walletUsageGraph, joinedRecords };
};
