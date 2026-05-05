import type {
  BffAnalyticsDataSource,
  GeneratedReadModelFile,
  PostgresAnalyticsClient,
} from "./analytics-source";
import { PaymentRecipientAddressSchema } from "contracts";
import { loadGeneratedAnalyticsDataSourceFromPayload } from "./analytics-source";
import {
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./phase-b-demo";

type ProviderRow = {
  network: string;
  asset: string;
  payTo: string;
  serviceId: string;
  serviceName: string;
  catalogSource: "base_curated" | "pay_sh_curated" | "raw_x402";
  resources: Array<{
    resource: string;
    network?: string;
    asset?: string;
    amountAtomic?: string;
    description?: string;
    method?: string;
    inputSchema?: unknown;
    lastUpdated?: string;
    x402Version?: number;
    l30DaysTotalCalls?: number;
    l30DaysUniquePayers?: number;
    transactionCount?: number;
    totalAmountAtomic?: string;
  }>;
  title?: string;
  description?: string;
  useCase?: string;
  category?: string;
  serviceUrl?: string;
  hasMetering?: boolean;
  hasFreeTier?: boolean;
  providerSha?: string;
  registryVersion?: string;
  registryGeneratedAt?: string;
  registrySourceUrl?: string;
  offers: Array<{
    protocol: "x402" | "MPP";
    chain: string;
    asset: string;
    payToAddress: string;
    probePriceUsd?: number;
  }>;
  protocol?: "x402" | "MPP";
  chain?: string;
  assetSymbol?: string;
  priceRangeUsd?: { min: number; max: number };
  payShProviderFqn?: string;
  endpointCount?: number;
  transactionCount: number;
  uniqueSenderCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

type CustomerRow = {
  network: string;
  asset: string;
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
const isBaseCuratedProvider = (serviceId: string) =>
  ["pro-api.coingecko.com", "coingecko", "api.nansen.ai", "nansen"].includes(
    serviceId.toLowerCase(),
  );
const catalogSourceFor = (
  serviceId: string,
  payShProviderFqn: string | undefined,
): ProviderRow["catalogSource"] => {
  if (isBaseCuratedProvider(serviceId)) return "base_curated";
  if (payShProviderFqn) return "pay_sh_curated";
  return "raw_x402";
};
const text = (value: unknown, fallback: string) => String(value ?? fallback);
const optionalText = (value: unknown): string | undefined => {
  const raw = String(value ?? "").trim();
  return raw ? raw : undefined;
};
const count = (value: unknown) => Number(value ?? 0);
const amount = (value: unknown) => String(value ?? "0");
const normalizePaymentAddressForNetwork = (value: unknown, network: string) => {
  const raw = String(value ?? "");
  return network.toLowerCase() === "base" ? raw.toLowerCase() : raw;
};
const optionalProtocol = (value: unknown): "x402" | "MPP" | undefined => {
  if (value === "x402" || value === "MPP") return value;
  return undefined;
};
const optionalPriceRange = (
  min: unknown,
  max: unknown,
): { min: number; max: number } | undefined => {
  const parsedMin = Number(min);
  const parsedMax = Number(max);
  if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) return undefined;
  return { min: parsedMin, max: parsedMax };
};
const optionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean"
    ? value
    : value === "true"
      ? true
      : value === "false"
        ? false
        : undefined;
const parseResources = (value: unknown): ProviderRow["resources"] => {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const resource = optionalText(row.resource ?? row.url);
    if (!resource) return [];
    return [
      {
        resource,
        ...(optionalText(row.network) ? { network: optionalText(row.network) } : {}),
        ...(optionalText(row.asset) ? { asset: optionalText(row.asset) } : {}),
        ...(optionalText(row.amountAtomic) ? { amountAtomic: optionalText(row.amountAtomic) } : {}),
        ...(optionalText(row.description) ? { description: optionalText(row.description) } : {}),
        ...(optionalText(row.method) ? { method: optionalText(row.method) } : {}),
        ...(row.inputSchema !== null && row.inputSchema !== undefined
          ? { inputSchema: row.inputSchema }
          : {}),
        ...(optionalText(row.lastUpdated) ? { lastUpdated: iso(row.lastUpdated, "") } : {}),
        ...(optionalNumber(row.x402Version) !== undefined
          ? { x402Version: optionalNumber(row.x402Version) }
          : {}),
        ...(optionalNumber(row.l30DaysTotalCalls) !== undefined
          ? { l30DaysTotalCalls: optionalNumber(row.l30DaysTotalCalls) }
          : {}),
        ...(optionalNumber(row.l30DaysUniquePayers) !== undefined
          ? { l30DaysUniquePayers: optionalNumber(row.l30DaysUniquePayers) }
          : {}),
        ...(optionalNumber(row.transactionCount) !== undefined
          ? { transactionCount: optionalNumber(row.transactionCount) }
          : {}),
        ...(optionalText(row.totalAmountAtomic)
          ? { totalAmountAtomic: optionalText(row.totalAmountAtomic) }
          : {}),
      },
    ];
  });
};
const parseOffers = (value: unknown): ProviderRow["offers"] => {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const protocol = optionalProtocol(row.protocol);
    const chain = optionalText(row.chain);
    const asset = optionalText(row.asset);
    const payToAddress = optionalText(row.payToAddress);
    if (!protocol || !chain || !asset || !payToAddress) return [];
    return [
      {
        protocol,
        chain,
        asset,
        payToAddress,
        ...(optionalNumber(row.probePriceUsd) !== undefined
          ? { probePriceUsd: optionalNumber(row.probePriceUsd) }
          : {}),
      },
    ];
  });
};
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
  `${slug(input.serviceId)}--${slug(input.network)}--${slug(input.asset)}--${normalizePaymentAddressForNetwork(input.payTo, input.network)}`;
const serviceIdForComparison = (serviceId: string) =>
  serviceId.toLowerCase().includes("coingecko") ? "coingecko" : serviceId.toLowerCase();
const isValidPaymentRecipientAddress = (value: string) =>
  PaymentRecipientAddressSchema.safeParse(value).success;

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

const mapProviderRow = (row: Record<string, unknown>): ProviderRow => {
  const network = text(row.network ?? row.chain, "base").toLowerCase();
  const asset = text(row.asset ?? row.asset_symbol, "USDC");
  const payTo = normalizePaymentAddressForNetwork(row.pay_to ?? row.payTo ?? row.pay_to_wallet, network);
  const serviceId = text(row.service_id ?? row.provider_id, payTo || "unknown-service");
  const serviceName = text(row.service_name ?? row.provider_name ?? row.name, serviceId);
  const payShProviderFqn = optionalText(row.pay_sh_provider_fqn ?? row.payShProviderFqn);
  return {
    network,
    asset,
    payTo,
    serviceId,
    serviceName,
    catalogSource: catalogSourceFor(serviceId, payShProviderFqn),
    resources: parseResources(row.resources),
    title: optionalText(row.title),
    description: optionalText(row.description),
    useCase: optionalText(row.use_case ?? row.useCase),
    category: optionalText(row.category),
    serviceUrl: optionalText(row.service_url ?? row.serviceUrl),
    hasMetering: optionalBoolean(row.has_metering ?? row.hasMetering),
    hasFreeTier: optionalBoolean(row.has_free_tier ?? row.hasFreeTier),
    providerSha: optionalText(row.provider_sha ?? row.providerSha),
    registryVersion: optionalText(row.registry_version ?? row.registryVersion),
    registryGeneratedAt: optionalText(row.registry_generated_at ?? row.registryGeneratedAt)
      ? iso(row.registry_generated_at ?? row.registryGeneratedAt, "")
      : undefined,
    registrySourceUrl: optionalText(row.registry_source_url ?? row.registrySourceUrl),
    offers: parseOffers(row.offers),
    protocol: optionalProtocol(row.protocol),
    chain: optionalText(row.offer_chain ?? row.chain),
    assetSymbol: optionalText(row.asset_symbol ?? row.assetSymbol),
    priceRangeUsd: optionalPriceRange(row.price_range_min_usd, row.price_range_max_usd),
    payShProviderFqn,
    endpointCount: optionalNumber(row.endpoint_count),
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
  const network = text(row.network ?? row.chain, "base").toLowerCase();
  const asset = text(row.asset ?? row.asset_symbol, "USDC");
  const payTo = normalizePaymentAddressForNetwork(row.pay_to ?? row.payTo, network);
  const payer = normalizePaymentAddressForNetwork(
    row.payer ?? row.payer_address ?? row.from_address ?? row.customer_address,
    network,
  );
  const serviceId = text(row.service_id ?? row.provider_id, payTo || "unknown-service");
  const serviceName = text(row.service_name ?? row.provider_name ?? row.name, serviceId);
  return {
    network,
    asset,
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
  const catalogProviders = providers.filter((provider) => provider.catalogSource !== "raw_x402");
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
                network: provider.network,
                asset: provider.asset,
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
      WITH base_provider_grouped AS (
        SELECT
          'base' AS network,
          'USDC' AS asset,
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
      ),
      solana_provider_grouped AS (
        SELECT
          CASE
            WHEN lower(s.chain) = 'solana'
              AND EXISTS (SELECT 1 FROM unnest(s.protocols) protocol WHERE lower(protocol) = 'mpp')
              THEN 'solana mainnet (mpp)'
            WHEN lower(s.chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(s.chain)
          END AS network,
          CASE
            WHEN lower(s.asset) = 'usdc' THEN 'USDC'
            WHEN lower(s.asset) = 'usdt' THEN 'USDT'
            ELSE s.asset
          END AS asset,
          s.pay_to_address AS pay_to,
          provider.provider_fqn AS service_id,
          provider.provider_fqn AS service_name,
          COUNT(*)::int AS transaction_count,
          COUNT(DISTINCT s.from_token_account)::int AS unique_sender_count,
          COALESCE(SUM(s.amount), 0)::text AS total_volume_atomic,
          MIN(s.block_timestamp) AS first_seen_at,
          MAX(s.block_timestamp) AS last_seen_at
        FROM payment_attributed_transfers_solana s
        CROSS JOIN LATERAL unnest(s.provider_fqns) AS provider(provider_fqn)
        WHERE s.provider_fqns IS NOT NULL
          AND array_length(s.provider_fqns, 1) >= 1
          AND s.from_token_account IS NOT NULL
          AND s.pay_to_address IS NOT NULL
        GROUP BY network, asset, s.pay_to_address, provider.provider_fqn
      ),
      provider_grouped AS (
        SELECT * FROM base_provider_grouped
        UNION ALL
        SELECT * FROM solana_provider_grouped
      ),
      pay_sh_provider_catalog AS (
        SELECT
          p.provider_fqn,
          min(lower(o.pay_to_address)) FILTER (WHERE o.pay_to_address IS NOT NULL) AS pay_to,
          p.provider_fqn AS service_id,
          COALESCE(NULLIF(p.title, ''), p.provider_fqn) AS service_name,
          p.title,
          p.description,
          p.use_case,
          p.category,
          p.service_url,
          max(to_jsonb(p) ->> 'has_metering') AS has_metering,
          max(to_jsonb(p) ->> 'has_free_tier') AS has_free_tier,
          max(to_jsonb(p) ->> 'provider_sha') AS provider_sha,
          max(to_jsonb(p) ->> 'registry_version') AS registry_version,
          max(to_jsonb(p) ->> 'registry_generated_at') AS registry_generated_at,
          max(to_jsonb(p) ->> 'registry_source_url') AS registry_source_url,
          p.endpoint_count,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'protocol', o.protocol,
                'chain', o.chain,
                'asset', o.asset,
                'payToAddress', o.pay_to_address,
                'probePriceUsd', o.probe_price_usd
              ) ORDER BY o.chain, o.asset, o.pay_to_address
            ) FILTER (WHERE o.provider_fqn IS NOT NULL),
            '[]'::jsonb
          ) AS offers,
          min(o.protocol) AS protocol,
          min(o.chain) AS offer_chain,
          min(o.asset) AS asset_symbol,
          p.price_range_min_usd,
          p.price_range_max_usd
        FROM pay_sh_providers p
        LEFT JOIN pay_sh_payment_offers o ON o.provider_fqn = p.provider_fqn
        GROUP BY
          p.provider_fqn,
          p.title,
          p.description,
          p.use_case,
          p.category,
          p.service_url,
          p.endpoint_count,
          p.price_range_min_usd,
          p.price_range_max_usd
      ),
      provider_pay_tos AS (
        SELECT DISTINCT
          provider_fqn,
          CASE
            WHEN lower(chain) = 'solana' AND lower(protocol) = 'mpp' THEN 'solana mainnet (mpp)'
            WHEN lower(chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(chain)
          END AS network,
          CASE
            WHEN lower(asset) = 'usdc' THEN 'USDC'
            WHEN lower(asset) = 'usdt' THEN 'USDT'
            ELSE asset
          END AS asset,
          chain AS display_chain,
          CASE
            WHEN lower(chain) = 'base' THEN lower(pay_to_address)
            ELSE pay_to_address
          END AS pay_to,
          protocol
        FROM pay_sh_payment_offers
        WHERE pay_to_address IS NOT NULL
      ),
      provider_metrics AS (
        SELECT
          pc.provider_fqn,
          ppt.network,
          ppt.asset,
          min(ppt.display_chain) AS display_chain,
          ppt.pay_to,
          min(ppt.protocol) AS protocol,
          COALESCE(SUM(pg.transaction_count), 0)::int AS transaction_count,
          COALESCE(SUM(pg.unique_sender_count), 0)::int AS unique_sender_count,
          COALESCE(SUM(pg.total_volume_atomic::numeric), 0)::text AS total_volume_atomic,
          MIN(pg.first_seen_at) AS first_seen_at,
          MAX(pg.last_seen_at) AS last_seen_at
        FROM pay_sh_provider_catalog pc
        JOIN provider_pay_tos ppt ON ppt.provider_fqn = pc.provider_fqn
        LEFT JOIN provider_grouped pg
          ON pg.pay_to = ppt.pay_to
         AND pg.network = ppt.network
         AND pg.asset = ppt.asset
         AND (pg.network = 'base' OR pg.service_id = ppt.provider_fqn)
        GROUP BY pc.provider_fqn, ppt.network, ppt.asset, ppt.pay_to
      )
      SELECT
        pg.network,
        pg.asset,
        pg.pay_to,
        pg.service_id,
        pg.service_name,
        NULL AS title,
        NULL AS description,
        NULL AS use_case,
        NULL AS category,
        NULL AS service_url,
        NULL AS has_metering,
        NULL AS has_free_tier,
        NULL AS provider_sha,
        NULL AS registry_version,
        NULL AS registry_generated_at,
        NULL AS registry_source_url,
        NULL AS endpoint_count,
        '[]'::jsonb AS offers,
        NULL AS protocol,
        NULL AS offer_chain,
        NULL AS asset_symbol,
        NULL AS price_range_min_usd,
        NULL AS price_range_max_usd,
        NULL AS pay_sh_provider_fqn,
        COALESCE(resources.resources, '[]'::jsonb) AS resources,
        pg.transaction_count,
        pg.unique_sender_count,
        pg.total_volume_atomic,
        pg.first_seen_at,
        pg.last_seen_at
      FROM provider_grouped pg
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'resource', r.resource_url,
            'network', po.chain,
            'asset', CASE
              WHEN lower(po.token_address) = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' THEN 'USDC'
              ELSE po.token_address
            END,
            'amountAtomic', po.amount_atomic::text,
            'description', r.raw ->> 'description',
            'method', r.raw #>> '{extensions,bazaar,info,input,method}',
            'inputSchema', r.raw #> '{extensions,bazaar,schema}',
            'lastUpdated', r.raw ->> 'lastUpdated',
            'x402Version', r.raw -> 'x402Version',
            'l30DaysTotalCalls', r.raw #> '{quality,l30DaysTotalCalls}',
            'l30DaysUniquePayers', r.raw #> '{quality,l30DaysUniquePayers}'
          ) ORDER BY r.resource_url
        ) AS resources
        FROM x402_payment_options po
        JOIN x402_resources r ON r.resource_id = po.resource_id
        WHERE lower(po.pay_to_address) = pg.pay_to
          AND po.active
          AND r.active
      ) resources ON true
      WHERE lower(pg.service_id) IN ('pro-api.coingecko.com', 'coingecko', 'api.nansen.ai', 'nansen')
      UNION ALL
      SELECT
        pm.network,
        pm.asset,
        pm.pay_to,
        pc.service_id,
        pc.service_name,
        pc.title,
        pc.description,
        pc.use_case,
        pc.category,
        pc.service_url,
        pc.has_metering,
        pc.has_free_tier,
        pc.provider_sha,
        pc.registry_version,
        pc.registry_generated_at,
        pc.registry_source_url,
        pc.endpoint_count,
        pc.offers,
        pm.protocol,
        pm.display_chain AS offer_chain,
        pm.asset AS asset_symbol,
        pc.price_range_min_usd,
        pc.price_range_max_usd,
        pc.provider_fqn AS pay_sh_provider_fqn,
        COALESCE(resources.resources, '[]'::jsonb) AS resources,
        pm.transaction_count,
        pm.unique_sender_count,
        pm.total_volume_atomic,
        COALESCE(pm.first_seen_at, to_timestamp(0)) AS first_seen_at,
        COALESCE(pm.last_seen_at, to_timestamp(0)) AS last_seen_at
      FROM pay_sh_provider_catalog pc
      JOIN provider_metrics pm ON pm.provider_fqn = pc.provider_fqn
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'resource', r.resource_url,
            'network', po.chain,
            'asset', CASE
              WHEN lower(po.token_address) = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' THEN 'USDC'
              ELSE po.token_address
            END,
            'amountAtomic', po.amount_atomic::text,
            'description', r.raw ->> 'description',
            'method', r.raw #>> '{extensions,bazaar,info,input,method}',
            'inputSchema', r.raw #> '{extensions,bazaar,schema}',
            'lastUpdated', r.raw ->> 'lastUpdated',
            'x402Version', r.raw -> 'x402Version',
            'l30DaysTotalCalls', r.raw #> '{quality,l30DaysTotalCalls}',
            'l30DaysUniquePayers', r.raw #> '{quality,l30DaysUniquePayers}'
          ) ORDER BY r.resource_url
        ) AS resources
        FROM x402_payment_options po
        JOIN x402_resources r ON r.resource_id = po.resource_id
        WHERE CASE
            WHEN lower(po.chain) = 'base' THEN lower(po.pay_to_address)
            ELSE po.pay_to_address
          END = pm.pay_to
          AND po.active
          AND r.active
      ) resources ON true
      WHERE pm.pay_to IS NOT NULL
      ORDER BY transaction_count DESC, pay_to ASC
    `),
    client.query(`
      WITH base_attributed_grouped AS (
        SELECT
          'base' AS network,
          'USDC' AS asset,
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
      ),
      solana_attributed_grouped AS (
        SELECT
          CASE
            WHEN lower(s.chain) = 'solana'
              AND EXISTS (SELECT 1 FROM unnest(s.protocols) protocol WHERE lower(protocol) = 'mpp')
              THEN 'solana mainnet (mpp)'
            WHEN lower(s.chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(s.chain)
          END AS network,
          CASE
            WHEN lower(s.asset) = 'usdc' THEN 'USDC'
            WHEN lower(s.asset) = 'usdt' THEN 'USDT'
            ELSE s.asset
          END AS asset,
          s.from_token_account AS payer,
          s.pay_to_address AS pay_to,
          provider.provider_fqn AS service_id,
          provider.provider_fqn AS service_name,
          COUNT(*)::int AS transaction_count,
          COALESCE(SUM(s.amount), 0)::text AS total_volume_atomic,
          MIN(s.block_timestamp) AS first_seen_at,
          MAX(s.block_timestamp) AS last_seen_at
        FROM payment_attributed_transfers_solana s
        CROSS JOIN LATERAL unnest(s.provider_fqns) AS provider(provider_fqn)
        WHERE s.provider_fqns IS NOT NULL
          AND array_length(s.provider_fqns, 1) >= 1
          AND s.from_token_account IS NOT NULL
          AND s.pay_to_address IS NOT NULL
        GROUP BY network, asset, s.from_token_account, s.pay_to_address, provider.provider_fqn
      ),
      attributed_grouped AS (
        SELECT * FROM base_attributed_grouped
        UNION ALL
        SELECT * FROM solana_attributed_grouped
      )
      SELECT
        network,
        asset,
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
