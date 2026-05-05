import type {
  BffAnalyticsDataSource,
  GeneratedReadModelFile,
  PostgresAnalyticsClient,
} from "./analytics-source";
import { loadGeneratedAnalyticsDataSourceFromPayload } from "./analytics-source";
import {
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./phase-b-demo";

type ProviderRow = {
  payTo: string;
  serviceId: string;
  serviceName: string;
  transactionCount: number;
  uniqueSenderCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

type CustomerRow = {
  payer: string;
  payTo: string;
  serviceId: string;
  serviceName: string;
  transactionCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

const generatedAt = () => new Date().toISOString();
const lower = (value: unknown) => String(value ?? "").toLowerCase();
const text = (value: unknown, fallback: string) => String(value ?? fallback);
const count = (value: unknown) => Number(value ?? 0);
const amount = (value: unknown) => String(value ?? "0");
const iso = (value: unknown, fallback: string) => {
  if (value instanceof Date) return value.toISOString();
  const raw = String(value ?? "");
  if (!raw) return fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
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
  `${slug(input.serviceId)}--${slug(input.network)}--${slug(input.asset)}--${input.payTo.toLowerCase()}`;
const serviceIdForComparison = (serviceId: string) =>
  serviceId.toLowerCase().includes("coingecko") ? "coingecko" : serviceId.toLowerCase();

const candidateForProvider = (provider: CustomerRow) => ({
  providerId: providerIdFor({
    serviceId: provider.serviceId,
    network: "base",
    asset: "USDC",
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

const mapProviderRow = (row: Record<string, unknown>): ProviderRow => {
  const payTo = lower(row.pay_to ?? row.payTo ?? row.pay_to_wallet);
  const serviceId = text(row.service_id ?? row.provider_id, payTo || "unknown-service");
  const serviceName = text(row.service_name ?? row.provider_name ?? row.name, serviceId);
  return {
    payTo,
    serviceId,
    serviceName,
    transactionCount: count(row.transaction_count ?? row.tx_count),
    uniqueSenderCount: count(row.unique_sender_count ?? row.customer_count ?? row.payer_count),
    totalVolumeAtomic: amount(
      row.total_volume_atomic ?? row.total_amount_atomic ?? row.amount_atomic,
    ),
    firstSeenAt: iso(row.first_seen_at ?? row.first_transfer_at, new Date(0).toISOString()),
    lastSeenAt: iso(row.last_seen_at ?? row.latest_transfer_at, new Date(0).toISOString()),
  };
};

const mapCustomerRow = (row: Record<string, unknown>): CustomerRow => {
  const payTo = lower(row.pay_to ?? row.payTo);
  const payer = lower(row.payer ?? row.payer_address ?? row.from_address ?? row.customer_address);
  const serviceId = text(row.service_id ?? row.provider_id, payTo || "unknown-service");
  const serviceName = text(row.service_name ?? row.provider_name ?? row.name, serviceId);
  return {
    payer,
    payTo,
    serviceId,
    serviceName,
    transactionCount: count(row.transaction_count ?? row.tx_count),
    totalVolumeAtomic: amount(
      row.total_volume_atomic ?? row.total_amount_atomic ?? row.amount_atomic,
    ),
    firstSeenAt: iso(row.first_seen_at ?? row.first_transfer_at, new Date(0).toISOString()),
    lastSeenAt: iso(row.last_seen_at ?? row.latest_transfer_at, new Date(0).toISOString()),
  };
};

type CustomerAggregate = {
  payer: string;
  transactionCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
  providers: CustomerRow[];
};

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

const buildPayload = (
  providerRows: ProviderRow[],
  customerRows: CustomerRow[],
): GeneratedReadModelFile => {
  const now = generatedAt();
  const providers = providerRows.filter((row) => row.payTo);
  const customerProviderRows = customerRows.filter((row) => row.payer && row.payTo);
  const customers = aggregateCustomers(customerProviderRows);
  const customersByPayer = new Map(customers.map((customer) => [customer.payer, customer]));
  const totalTransactions = providers.reduce((sum, row) => sum + row.transactionCount, 0);
  const totalUsers = customers.length;
  const serviceRows = providers.length
    ? providers
    : [
        {
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
      providers: providers.map((provider) => ({
        providerId: providerIdFor({
          serviceId: provider.serviceId,
          network: "base",
          asset: "USDC",
          payTo: provider.payTo,
        }),
        name: provider.serviceName,
        serviceId: provider.serviceId,
        serviceName: provider.serviceName,
        network: "base",
        asset: "USDC",
        payTo: provider.payTo,
        transactionCount: provider.transactionCount,
        uniqueSenderCount: provider.uniqueSenderCount,
        totalVolumeAtomic: provider.totalVolumeAtomic,
        endpointCount: 1,
        resourceCount: 1,
        mappingPattern: "one_payto_many_endpoints",
        endpointAttributionStatus: "bundled_payto_unknown_endpoint",
        attributionConfidence: 0.5,
        hasCustomerFacts: provider.uniqueSenderCount > 0,
        customerFactCount: provider.uniqueSenderCount,
        provenance: "derived_insight",
        provenanceByField: { payTo: "onchain_fact", transactionCount: "onchain_fact" },
        reasons: [{ provenance: "derived_insight", label: "postgres live provider aggregate" }],
      })),
      providerCount: providers.length,
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
        providerWallets: providers.map((provider) => ({
          providerId: providerIdFor({
            serviceId: provider.serviceId,
            network: "base",
            asset: "USDC",
            payTo: provider.payTo,
          }),
          providerName: provider.serviceName,
          name: provider.serviceName,
          payToWallet: provider.payTo,
          payerWallets: customerProviderRows
            .filter((customer) => customer.payTo === provider.payTo)
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
                    network: "base",
                    asset: "USDC",
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
                .filter((candidate) => candidate.payTo !== provider.payTo)
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
                network: "base",
                asset: "USDC",
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
              confidence: 0.5,
              provenance: "derived_insight",
              provenanceByField: { payToWallet: "onchain_fact", spendAtomic: "onchain_fact" },
              reasons: [{ provenance: "derived_insight", label: "postgres live wallet provider" }],
            })),
            timeline: customer.providers.slice(0, 5).map((provider) => ({
              at: provider.lastSeenAt,
              eventType: "payment",
              description: `Paid ${provider.serviceName}`,
              amountAtomic: provider.totalVolumeAtomic,
              relatedProviderId: providerIdFor({
                serviceId: provider.serviceId,
                network: "base",
                asset: "USDC",
                payTo: provider.payTo,
              }),
              provenance: "derived_insight",
              provenanceByField: { amountAtomic: "onchain_fact" },
              reasons: [{ provenance: "derived_insight", label: "postgres live payment timeline" }],
            })),
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

export const loadPostgresLiveAnalyticsDataSource = async (
  client: PostgresAnalyticsClient,
): Promise<BffAnalyticsDataSource> => {
  const [providerRows, customerRows] = await Promise.all([
    client.query(`
      SELECT
        lower(g.to_owner_address) AS pay_to,
        CASE
          WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
            THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
          ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
        END AS service_id,
        CASE
          WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
            THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
          ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
        END AS service_name,
        COUNT(*)::int AS transaction_count,
        COUNT(DISTINCT lower(g.from_owner_address))::int AS unique_sender_count,
        COALESCE(SUM(g.amount), 0)::text AS total_volume_atomic,
        to_timestamp(MIN(g.block_timestamp)) AS first_seen_at,
        to_timestamp(MAX(g.block_timestamp)) AS last_seen_at
      FROM goldsky_webhook_transfers_x402_paytos g
      LEFT JOIN x402_provider_activity a
        ON lower(a.pay_to_address) = lower(g.to_owner_address)
      WHERE g.from_owner_address IS NOT NULL
        AND g.to_owner_address IS NOT NULL
      GROUP BY lower(g.to_owner_address), service_id, service_name
      ORDER BY COUNT(*) DESC, lower(g.to_owner_address) ASC
    `),
    client.query(`
      WITH attributed_grouped AS (
        SELECT
          lower(g.from_owner_address) AS payer,
          lower(g.to_owner_address) AS pay_to,
          CASE
            WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
              THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
            ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
          END AS service_id,
          CASE
            WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
              THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
            ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
          END AS service_name,
          COUNT(*)::int AS transaction_count,
          COALESCE(SUM(g.amount), 0)::text AS total_volume_atomic,
          to_timestamp(MIN(g.block_timestamp)) AS first_seen_at,
          to_timestamp(MAX(g.block_timestamp)) AS last_seen_at
        FROM goldsky_webhook_transfers_x402_paytos g
        LEFT JOIN x402_provider_activity a
          ON lower(a.pay_to_address) = lower(g.to_owner_address)
        WHERE g.from_owner_address IS NOT NULL
          AND g.to_owner_address IS NOT NULL
        GROUP BY lower(g.from_owner_address), lower(g.to_owner_address), service_id, service_name
      )
      SELECT
        payer,
        pay_to,
        service_id,
        service_name,
        transaction_count,
        total_volume_atomic,
        first_seen_at,
        last_seen_at
      FROM attributed_grouped
      ORDER BY total_volume_atomic::numeric DESC, transaction_count DESC
    `),
  ]);
  return loadGeneratedAnalyticsDataSourceFromPayload(
    buildPayload(providerRows.map(mapProviderRow), customerRows.map(mapCustomerRow)),
  );
};
