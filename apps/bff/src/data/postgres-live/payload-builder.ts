import type { GeneratedReadModelFile } from "../analytics-source";
import { PaymentRecipientAddressSchema } from "contracts";
import {
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "../phase-b-demo";
import type { CustomerAggregate, CustomerRow, ProviderRow } from "./types";

const generatedAt = () => new Date().toISOString();
const normalizePaymentAddressForNetwork = (value: unknown, network: string) => {
  const raw = String(value ?? "");
  return network.toLowerCase() === "base" ? raw.toLowerCase() : raw;
};
const addAtomic = (left: string, right: string) => (BigInt(left) + BigInt(right)).toString();
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "provider";
const providerIdFor = (input: {
  serviceId: string;
  network: string;
  asset: string;
  payTo: string;
}) =>
  `${slug(input.serviceId)}--${slug(input.network)}--${slug(input.asset)}--${normalizePaymentAddressForNetwork(input.payTo, input.network)}`;
const serviceIdForComparison = (serviceId: string) =>
  serviceId.toLowerCase().includes("coingecko") ? "coingecko" : serviceId.toLowerCase();
const isValidPaymentRecipientAddress = (value: string) =>
  PaymentRecipientAddressSchema.safeParse(value).success;
const endpointPathForResource = (resource: string) => {
  try {
    const url = new URL(resource);
    return `${decodeURI(url.pathname)}${url.search}`;
  } catch {
    return resource;
  }
};

const candidateForProvider = (provider: CustomerRow) => ({
  providerId: providerIdFor({
    serviceId: provider.serviceId,
    network: provider.network,
    asset: provider.asset,
    payTo: provider.payTo,
  }),
  providerName: provider.serviceName,
  serviceName: provider.serviceName,
  coUsageCount: provider.transactionCount,
  confidence: 0.5,
  payToWallet: provider.payTo,
  provenance: "derived_insight" as const,
  provenanceByField: { payToWallet: "onchain_fact", coUsageCount: "onchain_fact" },
  reasons: [{ provenance: "derived_insight" as const, label: "postgres live co-usage" }],
});
const aggregateCustomers = (rows: CustomerRow[]) => {
  const byPayer = new Map<string, CustomerAggregate>();
  for (const row of rows) {
    const existing = byPayer.get(row.payer) ?? {
      payer: row.payer,
      transactionCount: 0,
      totalVolumeAtomic: "0",
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      providers: [],
    };
    existing.transactionCount += row.transactionCount;
    existing.totalVolumeAtomic = addAtomic(existing.totalVolumeAtomic, row.totalVolumeAtomic);
    if (Date.parse(row.firstSeenAt) < Date.parse(existing.firstSeenAt)) {
      existing.firstSeenAt = row.firstSeenAt;
    }
    if (Date.parse(row.lastSeenAt) > Date.parse(existing.lastSeenAt)) {
      existing.lastSeenAt = row.lastSeenAt;
    }
    existing.providers.push(row);
    byPayer.set(row.payer, existing);
  }
  return [...byPayer.values()].sort((left, right) => {
    const byAmount = BigInt(right.totalVolumeAtomic) - BigInt(left.totalVolumeAtomic);
    if (byAmount !== 0n) return byAmount > 0n ? 1 : -1;
    return left.payer.localeCompare(right.payer);
  });
};

const timelineForCustomer = (customer: CustomerAggregate) =>
  customer.providers
    .flatMap((provider) => provider.timelineEvents.map((event) => ({ provider, event })))
    .sort((left, right) => Date.parse(right.event.at) - Date.parse(left.event.at))
    .slice(0, 20)
    .map(({ provider, event }) => ({
      at: event.at,
      eventType: "payment" as const,
      description: `Payment to ${provider.serviceName}`,
      amountAtomic: event.amountAtomic,
      relatedProviderId: providerIdFor({
        serviceId: provider.serviceId,
        network: provider.network,
        asset: provider.asset,
        payTo: provider.payTo,
      }),
      provenance: "derived_insight" as const,
      provenanceByField: { amountAtomic: "onchain_fact" as const },
      reasons: [
        {
          provenance: "derived_insight" as const,
          label: "postgres live transfer timeline",
          ...(event.transactionId
            ? { description: `source transaction: ${event.transactionId}` }
            : {}),
        },
      ],
    }));

export const buildPayload = (
  providerRows: ProviderRow[],
  customerRows: CustomerRow[],
): GeneratedReadModelFile => {
  const now = generatedAt();
  const providers = providerRows.filter((row) => row.payTo);
  const catalogProviders = providers.filter((provider) => provider.catalogSource !== "raw_x402");
  const catalogProviderById = new Map<string, ProviderRow>();
  for (const provider of catalogProviders) {
    const providerId = providerIdFor({
      serviceId: provider.serviceId,
      network: provider.network,
      asset: provider.asset,
      payTo: provider.payTo,
    });
    const existing = catalogProviderById.get(providerId);
    if (!existing || provider.resources.length > existing.resources.length) {
      catalogProviderById.set(providerId, provider);
    }
  }
  const apiPathsForProvider = (provider: CustomerRow) => {
    const row = catalogProviderById.get(
      providerIdFor({
        serviceId: provider.serviceId,
        network: provider.network,
        asset: provider.asset,
        payTo: provider.payTo,
      }),
    );
    return Array.from(
      new Set(row?.resources.map((resource) => endpointPathForResource(resource.resource)) ?? []),
    );
  };
  const walletGraphProviders = providers.filter((provider) =>
    isValidPaymentRecipientAddress(provider.payTo),
  );
  const customerProviderRows = customerRows.filter((row) => row.payer && row.payTo);
  const customers = aggregateCustomers(customerProviderRows);
  const customersByPayer = new Map(customers.map((customer) => [customer.payer, customer]));
  const totalTransactions = providers.reduce((sum, row) => sum + row.transactionCount, 0);
  const totalUsers = customers.length;
  const serviceRows = providers.length
    ? providers
    : [
        {
          network: "base",
          asset: "USDC",
          payTo: "0x0000000000000000000000000000000000000000",
          serviceId: "coingecko",
          serviceName: "CoinGecko",
          transactionCount: 0,
          uniqueSenderCount: 0,
          totalVolumeAtomic: "0",
          firstSeenAt: now,
          lastSeenAt: now,
        },
      ];
  const comparisonServices = serviceRows.map((provider) => ({
    serviceId: serviceIdForComparison(provider.serviceId),
    serviceName: provider.serviceName,
    userCount: provider.uniqueSenderCount,
    transactionCount: provider.transactionCount,
    repeatUserRate: provider.uniqueSenderCount
      ? Math.max(
          0,
          (provider.transactionCount - provider.uniqueSenderCount) / provider.transactionCount,
        )
      : 0,
    averageTransactionsPerUser: provider.uniqueSenderCount
      ? provider.transactionCount / provider.uniqueSenderCount
      : 0,
    endpointDiversity: 1,
    userOverlapWithCoinGecko:
      serviceIdForComparison(provider.serviceId) === "coingecko" ? provider.uniqueSenderCount : 0,
    sampleBasis: "postgres live raw read model",
    endpointAttributionStatus: "bundled_payto_unknown_endpoint",
    attributionConfidence: 0.5,
    provenance: "derived_insight",
    provenanceByField: { transactionCount: "onchain_fact", userCount: "onchain_fact" },
    reasons: [{ provenance: "derived_insight", label: "postgres live service aggregate" }],
  }));
  if (!comparisonServices.some((service) => service.serviceId === "coingecko")) {
    comparisonServices.push({
      ...comparisonServices[0],
      serviceId: "coingecko",
      serviceName: "CoinGecko",
      userCount: 0,
      transactionCount: 0,
      repeatUserRate: 0,
      averageTransactionsPerUser: 0,
      userOverlapWithCoinGecko: 0,
    });
  }

  return {
    providers: {
      generatedAt: now,
      generatedFrom: "postgres-live-read-model",
      providers: catalogProviders.map((provider) => ({
        providerId: providerIdFor({
          serviceId: provider.serviceId,
          network: provider.network,
          asset: provider.asset,
          payTo: provider.payTo,
        }),
        name: provider.serviceName,
        serviceId: provider.serviceId,
        serviceName: provider.serviceName,
        network: provider.network,
        asset: provider.asset,
        payTo: provider.payTo,
        catalogSource: provider.catalogSource,
        transactionCount: provider.transactionCount,
        uniqueSenderCount: provider.uniqueSenderCount,
        totalVolumeAtomic: provider.totalVolumeAtomic,
        endpointCount: provider.endpointCount ?? provider.resources.length,
        resourceCount: provider.resources.length,
        mappingPattern: "one_payto_many_endpoints",
        endpointAttributionStatus: "bundled_payto_unknown_endpoint",
        attributionConfidence: 0.5,
        hasCustomerFacts: provider.uniqueSenderCount > 0,
        customerFactCount: provider.uniqueSenderCount,
        ...(provider.title ? { title: provider.title } : {}),
        ...(provider.description ? { description: provider.description } : {}),
        ...(provider.useCase ? { useCase: provider.useCase } : {}),
        ...(provider.category ? { category: provider.category } : {}),
        ...(provider.serviceUrl ? { serviceUrl: provider.serviceUrl } : {}),
        ...(provider.hasMetering !== undefined ? { hasMetering: provider.hasMetering } : {}),
        ...(provider.hasFreeTier !== undefined ? { hasFreeTier: provider.hasFreeTier } : {}),
        ...(provider.providerSha ? { providerSha: provider.providerSha } : {}),
        ...(provider.registryVersion ? { registryVersion: provider.registryVersion } : {}),
        ...(provider.registryGeneratedAt
          ? { registryGeneratedAt: provider.registryGeneratedAt }
          : {}),
        ...(provider.registrySourceUrl ? { registrySourceUrl: provider.registrySourceUrl } : {}),
        ...(provider.offers.length ? { offers: provider.offers } : {}),
        ...(provider.protocol ? { protocol: provider.protocol } : {}),
        ...(provider.chain ? { chain: provider.chain } : {}),
        ...(provider.assetSymbol ? { assetSymbol: provider.assetSymbol } : {}),
        ...(provider.priceRangeUsd ? { priceRangeUsd: provider.priceRangeUsd } : {}),
        ...(provider.resources.length ? { resources: provider.resources } : {}),
        provenance: "derived_insight",
        provenanceByField: { payTo: "onchain_fact", transactionCount: "onchain_fact" },
        reasons: [{ provenance: "derived_insight", label: "postgres live provider aggregate" }],
      })),
      providerCount: catalogProviders.length,
      provenance: "derived_insight",
      provenanceByField: { providers: "onchain_fact" },
      reasons: [{ provenance: "derived_insight", label: "postgres live provider catalog" }],
    },
    customers: {
      ...phaseBCustomerListResponse,
      generatedAt: now,
      generatedFrom: "postgres-live-read-model",
      customers: customers.map((customer) => ({
        address: customer.payer,
        label: `Wallet ${customer.payer.slice(0, 6)}`,
        observationCount: customer.transactionCount,
        spendAtomic: customer.totalVolumeAtomic,
        providerCount: customer.providers.length,
        lastSeenAt: customer.lastSeenAt,
        activityGrowth: 0,
        upsellOpportunity: customer.transactionCount >= 5 ? "high" : "medium",
        provenance: "derived_insight",
        provenanceByField: { address: "onchain_fact", spendAtomic: "onchain_fact" },
        reasons: [{ provenance: "derived_insight", label: "postgres live customer aggregate" }],
      })),
      customerCount: customers.length,
      provenance: "derived_insight",
      reasons: [{ provenance: "derived_insight", label: "postgres live customers" }],
    },
    walletUsageGraph: {
      ...phaseBWalletUsageGraphResponse,
      generatedAt: now,
      graph: {
        ...phaseBWalletUsageGraphResponse.graph,
        generatedFrom: "postgres-live-read-model",
        providerWallets: walletGraphProviders.map((provider) => ({
          providerId: providerIdFor({
            serviceId: provider.serviceId,
            network: provider.network,
            asset: provider.asset,
            payTo: provider.payTo,
          }),
          providerName: provider.serviceName,
          name: provider.serviceName,
          payToWallet: provider.payTo,
          payerWallets: customerProviderRows
            .filter(
              (customer) =>
                customer.payTo === provider.payTo &&
                customer.network === provider.network &&
                customer.asset === provider.asset,
            )
            .map((customer) => ({
              address: customer.payer,
              label: `Wallet ${customer.payer.slice(0, 6)}`,
              sharedSpendAtomic: customer.totalVolumeAtomic,
              sharedTransactionCount: customer.transactionCount,
              overlapProviderCount: customersByPayer.get(customer.payer)?.providers.length ?? 1,
              confidence: 0.5,
              firstSeenAt: customer.firstSeenAt,
              lastSeenAt: customer.lastSeenAt,
              observations: [
                {
                  providerId: providerIdFor({
                    serviceId: provider.serviceId,
                    network: provider.network,
                    asset: provider.asset,
                    payTo: provider.payTo,
                  }),
                  providerName: provider.serviceName,
                  serviceName: provider.serviceName,
                  sharedSpendAtomic: customer.totalVolumeAtomic,
                  sharedTransactionCount: customer.transactionCount,
                  overlapProviderCount: 1,
                  confidence: 0.5,
                  firstSeenAt: customer.firstSeenAt,
                  lastSeenAt: customer.lastSeenAt,
                  provenance: "derived_insight",
                  provenanceByField: { sharedSpendAtomic: "onchain_fact" },
                  reasons: [{ provenance: "derived_insight", label: "postgres live observation" }],
                },
              ],
              otherServiceCandidates: (customersByPayer.get(customer.payer)?.providers ?? [])
                .filter(
                  (candidate) =>
                    candidate.payTo !== provider.payTo ||
                    candidate.network !== provider.network ||
                    candidate.asset !== provider.asset,
                )
                .sort((left, right) => right.transactionCount - left.transactionCount)
                .map(candidateForProvider),
              provenance: "derived_insight",
              provenanceByField: { address: "onchain_fact" },
              reasons: [{ provenance: "derived_insight", label: "postgres live payer wallet" }],
            })),
          confidence: 0.5,
          firstSeenAt: provider.firstSeenAt,
          lastSeenAt: provider.lastSeenAt,
          provenance: "derived_insight",
          provenanceByField: { payToWallet: "onchain_fact" },
          reasons: [{ provenance: "derived_insight", label: "postgres live provider wallet" }],
        })),
      },
    },
    serviceComparison: {
      ...serviceAnalyticsComparisonResponse,
      generatedAt: now,
      generatedFrom: "postgres-live-read-model",
      services: comparisonServices,
    },
    serviceSummary: {
      ...serviceAnalyticsSummaryResponse,
      generatedAt: now,
      generatedFrom: "postgres-live-read-model",
      userCount: totalUsers,
      transactionCount: totalTransactions,
      averageTransactionsPerUser: totalUsers ? totalTransactions / totalUsers : 0,
      repeatUserRate:
        totalUsers && totalTransactions
          ? Math.max(0, (totalTransactions - totalUsers) / totalTransactions)
          : 0,
    },
    serviceQuadrants: {
      ...serviceAnalyticsQuadrantResponse,
      generatedAt: now,
      generatedFrom: "postgres-live-read-model",
      points: comparisonServices.map((service) => ({
        ...serviceAnalyticsQuadrantResponse.points[0],
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        x: service.averageTransactionsPerUser,
        y: service.endpointDiversity,
        userCount: service.userCount,
        transactionCount: service.transactionCount,
        isCoinGecko: service.serviceId === "coingecko",
      })),
    },
    profilesByAddress: Object.fromEntries(
      customers.map((customer) => [
        customer.payer,
        {
          generatedAt: now,
          generatedFrom: "postgres-live-read-model",
          scope: { network: "base", asset: "USDC" },
          profile: {
            identity: {
              address: customer.payer,
              label: `Wallet ${customer.payer.slice(0, 6)}`,
              network: "base",
              asset: "USDC",
              role: "payer_wallet",
              identityBasis: "onchain transfer sender",
              caveat: "Derived from x402 attributed transfer facts.",
              provenance: "derived_insight",
              provenanceByField: { address: "onchain_fact" },
              reasons: [{ provenance: "derived_insight", label: "postgres live wallet identity" }],
            },
            metrics: {
              spendAtomic: customer.totalVolumeAtomic,
              activityGrowth: 0,
              freeTierProgress: Math.min(1, customer.transactionCount / 20),
              entryPointRatio: 1,
              upsellOpportunity: customer.transactionCount >= 5 ? "high" : "medium",
              totalSpendAtomic: customer.totalVolumeAtomic,
              txCount: customer.transactionCount,
              uniqueProviderCount: customer.providers.length,
              averageSpendAtomic: customer.transactionCount
                ? (
                    BigInt(customer.totalVolumeAtomic) / BigInt(customer.transactionCount)
                  ).toString()
                : "0",
              firstSeenAt: customer.firstSeenAt,
              lastSeenAt: customer.lastSeenAt,
              provenance: "derived_insight",
              provenanceByField: { spendAtomic: "onchain_fact", txCount: "onchain_fact" },
              reasons: [{ provenance: "derived_insight", label: "postgres live wallet metrics" }],
            },
            providers: customer.providers.map((provider) => ({
              providerId: providerIdFor({
                serviceId: provider.serviceId,
                network: provider.network,
                asset: provider.asset,
                payTo: provider.payTo,
              }),
              name: provider.serviceName,
              providerName: provider.serviceName,
              payToWallet: provider.payTo,
              spendAtomic: provider.totalVolumeAtomic,
              transactionCount: provider.transactionCount,
              txCount: provider.transactionCount,
              firstSeenAt: provider.firstSeenAt,
              lastSeenAt: provider.lastSeenAt,
              ...(apiPathsForProvider(provider).length
                ? { apiPaths: apiPathsForProvider(provider) }
                : {}),
              confidence: 0.5,
              provenance: "derived_insight",
              provenanceByField: { payToWallet: "onchain_fact", spendAtomic: "onchain_fact" },
              reasons: [{ provenance: "derived_insight", label: "postgres live wallet provider" }],
            })),
            timeline: timelineForCustomer(customer),
            insights: [
              {
                key: "x402-activity",
                title: "Observed x402 payment activity",
                summary: `${customer.transactionCount} attributed transfer(s) across ${customer.providers.length} payTo wallet(s).`,
                confidence: 0.5,
                classification: "upsell",
                provenance: "derived_insight",
                provenanceByField: { summary: "derived_insight" },
                reasons: [{ provenance: "derived_insight", label: "postgres live x402 insight" }],
              },
            ],
            provenance: "derived_insight",
            provenanceByField: { providers: "onchain_fact", metrics: "derived_insight" },
            reasons: [{ provenance: "derived_insight", label: "postgres live customer profile" }],
          },
          provenance: "derived_insight",
          reasons: [{ provenance: "derived_insight", label: "postgres live customer profile" }],
        },
      ]),
    ),
  };
};
