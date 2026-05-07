import fs from "node:fs";
import path from "node:path";
import { SQL } from "bun";
import { mergeProviderCatalogs } from "sources";
import { loadPostgresLiveAnalyticsDataSource } from "./postgres-live-read-model";
import {
  type PhaseBCustomerUpsellMetricsResponse,
  type PhaseBCustomerListResponse,
  type PhaseBCustomerProfileResponse,
  type ServiceAnalyticsComparisonResponse,
  type ServiceAnalyticsQuadrantResponse,
  type MachinePaymentRail,
  type ServiceAnalyticsSummaryResponse,
  type ProviderCatalogResponse,
  type RouteAnalyticsEvent,
  type RouteAnalyticsSankeyResponse,
  type RouteAnalyticsSummaryResponse,
  type RouteAnalyticsVisibility,
  type WalletUsageGraphResponse,
  type CustomerIntelligenceResponse,
  normalizePaymentRecipientAddress,
  validatePhaseBCustomerUpsellMetricsResponse,
  validatePhaseBCustomerListResponse,
  validatePhaseBCustomerProfileResponse,
  validatePhaseBWalletUsageGraphResponse,
  validateServiceAnalyticsComparisonResponse,
  validateServiceAnalyticsQuadrantResponse,
  validateServiceAnalyticsSummaryResponse,
  validateCustomerIntelligenceResponse,
  validateProviderCatalogResponse,
  validateRouteAnalyticsSankeyResponse,
  validateRouteAnalyticsSummaryResponse,
} from "contracts";
import {
  getPhaseBCustomerIntelligenceByAddress,
  getPhaseBCustomerProfileByAddress,
  getPhaseBCustomerUpsellMetricsByAddress,
  phaseBCustomerListResponse,
  phaseBWalletUsageGraphResponse,
  serviceAnalyticsComparisonResponse,
  serviceAnalyticsQuadrantResponse,
  serviceAnalyticsSummaryResponse,
} from "./phase-b-demo";
import { buildUpsellMetricsByAddress } from "./llm";

export type BffAnalyticsDataSource = {
  customers: PhaseBCustomerListResponse;
  walletUsageGraph: WalletUsageGraphResponse;
  providers: ProviderCatalogResponse;
  serviceSummary: ServiceAnalyticsSummaryResponse;
  serviceComparison: ServiceAnalyticsComparisonResponse;
  serviceQuadrants: ServiceAnalyticsQuadrantResponse;
  routeSummary: RouteAnalyticsSummaryResponse;
  routeSankey: RouteAnalyticsSankeyResponse;
  getCustomers(payTo?: string): PhaseBCustomerListResponse;
  getCustomersByServiceId(serviceId: string): PhaseBCustomerListResponse;
  getCustomerProfile(address: string): PhaseBCustomerProfileResponse | undefined;
  getCustomerIntelligence(address: string): CustomerIntelligenceResponse | undefined;
  getCustomerUpsellMetrics(address: string): PhaseBCustomerUpsellMetricsResponse | undefined;
};

export type GeneratedReadModelFile = Partial<{
  customers: unknown;
  walletUsageGraph: unknown;
  serviceSummary: unknown;
  serviceComparison: unknown;
  serviceQuadrants: unknown;
  routeSummary: unknown;
  routeSankey: unknown;
  providers: unknown;
  profilesByAddress: Record<string, unknown>;
  intelligenceByAddress: Record<string, unknown>;
  upsellMetricsByAddress: Record<string, unknown>;
}>;

type AnalyticsSourceKind = "json" | "postgres" | "fixture";

type AnalyticsSourceEnv = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "BFF_ANALYTICS_SOURCE"
    | "BFF_ANALYTICS_READ_MODEL_PATH"
    | "BFF_ANALYTICS_DATABASE_URL"
    | "DATABASE_URL"
    | "BFF_ANALYTICS_SNAPSHOT_ID"
    | "BFF_ANALYTICS_POSTGRES_MODE"
    | "BFF_MPP_CATALOG_PATH"
    | "NODE_ENV"
  >
>;

export type PostgresAnalyticsClient = {
  query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
};

type ResolveAnalyticsDataSourceOptions = {
  env?: AnalyticsSourceEnv;
  postgresClient?: PostgresAnalyticsClient;
};

const DEFAULT_GENERATED_ANALYTICS_PATH = path.join(
  import.meta.dir,
  "..",
  "..",
  "fixtures",
  "generated",
  "analytics.json",
);

const DEFAULT_MPP_CATALOG_PATH = path.join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "..",
  "tmp",
  "mpp-provider-catalog.json",
);

const fixtureProviderCatalog = validateProviderCatalogResponse({
  generatedAt: phaseBCustomerListResponse.generatedAt,
  generatedFrom: "phase-b-demo-fixture-provider-catalog",
  providers: phaseBWalletUsageGraphResponse.graph.providerWallets.map((provider) => ({
    providerId: `${provider.providerId}--${provider.payToWallet}`,
    name: provider.providerName ?? provider.name,
    serviceId: provider.providerId,
    serviceName: provider.providerName ?? provider.name,
    network: "base",
    asset: "USDC",
    payTo: provider.payToWallet,
    transactionCount: provider.payerWallets.reduce(
      (sum, wallet) =>
        sum +
        wallet.observations.reduce(
          (inner, observation) => inner + observation.sharedTransactionCount,
          0,
        ),
      0,
    ),
    uniqueSenderCount: provider.payerWallets.length,
    totalVolumeAtomic: provider.payerWallets
      .reduce(
        (sum, wallet) =>
          sum +
          wallet.observations.reduce(
            (inner, observation) => inner + BigInt(observation.sharedSpendAtomic),
            0n,
          ),
        0n,
      )
      .toString(),
    endpointCount: 1,
    resourceCount: 1,
    mappingPattern: "one_payto_many_endpoints",
    endpointAttributionStatus: "bundled_payto_unknown_endpoint",
    attributionConfidence: 0.35,
    hasCustomerFacts: provider.payerWallets.length > 0,
    customerFactCount: provider.payerWallets.length,
    provenance: "derived_insight",
    provenanceByField: { payTo: "onchain_fact", name: "derived_insight" },
    reasons: [{ provenance: "derived_insight", label: "fixture provider catalog" }],
  })),
  providerCount: phaseBWalletUsageGraphResponse.graph.providerWallets.length,
  provenance: "derived_insight",
  provenanceByField: { providers: "derived_insight" },
  reasons: [{ provenance: "derived_insight", label: "fixture provider catalog" }],
});

const ROUTE_ANALYTICS_GENERATED_FROM = "machine-payment-route-analytics-p0";

const visibilityForRail = (rail: MachinePaymentRail): RouteAnalyticsVisibility =>
  rail === "x402"
    ? "public_onchain"
    : rail === "stripe_mpp" || rail === "hitpay_mpp"
      ? "provider_attested"
      : "first_party";

const railLabel = (rail: MachinePaymentRail): string => {
  switch (rail) {
    case "stripe_mpp":
      return "Stripe MPP";
    case "hitpay_mpp":
      return "HitPay MPP";
    case "api_key":
      return "API key";
    case "subscription":
      return "Subscription";
    case "x402":
      return "x402";
    default:
      return "Other";
  }
};

const routeIdPart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

const amountUsdFromProvider = (
  provider: ProviderCatalogResponse["providers"][number],
): number | undefined => {
  const asset = provider.asset.toUpperCase();
  if (asset !== "USDC" && asset !== "USDT" && asset !== "USD") return undefined;
  return Number(BigInt(provider.totalVolumeAtomic)) / 1_000_000;
};

const routeRailForProvider = (
  provider: ProviderCatalogResponse["providers"][number],
): MachinePaymentRail => {
  if (
    provider.protocol === "MPP" ||
    provider.catalogSource === "mpp_registry" ||
    provider.network.toLowerCase().includes("mpp")
  ) {
    return "other";
  }
  return "x402";
};

const buildRouteAnalytics = (
  providers: ProviderCatalogResponse,
): { routeSummary: RouteAnalyticsSummaryResponse; routeSankey: RouteAnalyticsSankeyResponse } => {
  const generatedAt = providers.generatedAt;
  const providerEvents: RouteAnalyticsEvent[] = providers.providers
    .filter((provider) => provider.transactionCount > 0)
    .map((provider, index) => {
      const rail = routeRailForProvider(provider);
      const visibility = visibilityForRail(rail);
      const protocol = rail === "x402" ? "x402" : provider.protocol === "MPP" ? "mpp" : "other";
      const endpointGroup = provider.serviceName ?? provider.category ?? provider.name;
      const routePart = routeIdPart(endpointGroup);
      return {
        routeId: `route:${rail}:${routePart}:${index + 1}`,
        workflowId: `workflow:${routePart}`,
        rail,
        protocol,
        sourceRoute: index % 2 === 0 ? "Direct API client" : "MCP directory",
        sourcePlatform: index % 2 === 0 ? "direct" : "mcp-directory",
        router: rail === "x402" ? "x402 facilitator" : "MPP provider router",
        providerId: provider.serviceId ?? provider.providerId,
        endpointGroup,
        useCase: provider.useCase ?? provider.category ?? "Paid API route",
        payeeIdentity: provider.payTo,
        amountUsd: amountUsdFromProvider(provider),
        currency: provider.asset,
        status: "settled",
        visibility,
        provenance: "derived_insight",
        provenanceByField: {
          rail: rail === "x402" ? "onchain_fact" : "registry_fact",
          payeeIdentity: "onchain_fact",
        },
        timestamp: generatedAt,
        reasons: [
          {
            provenance: "derived_insight",
            label: "provider aggregate adapted to route analytics",
            description:
              "Aggregated provider/payment activity is projected as a route row; settlementRef is omitted when no transaction-level reference is available.",
          },
        ],
      } satisfies RouteAnalyticsEvent;
    });

  const demoEvents: RouteAnalyticsEvent[] = [
    {
      routeId: "route:stripe-mpp:marketplace-enrichment",
      workflowId: "workflow:enrichment-api",
      sessionId: "session:stripe-mpp:demo-001",
      rail: "stripe_mpp",
      protocol: "mpp",
      sourceRoute: "Marketplace",
      sourcePlatform: "stripe-demo",
      router: "Stripe MPP session",
      providerId: "stripe-mpp-demo-provider",
      endpointGroup: "Enrichment API",
      useCase: "Provider-attested enrichment workflow",
      payerIdentity: "stripe:customer:demo",
      payeeIdentity: "stripe:acct:provider-demo",
      amountUsd: 18.5,
      currency: "USD",
      status: "settled",
      settlementRef: { type: "stripe_payment_intent", value: "pi_demo_machine_payment_route" },
      visibility: "provider_attested",
      provenance: "demo_label",
      provenanceByField: { rail: "demo_label", settlementRef: "demo_label" },
      timestamp: generatedAt,
      latencyMs: 410,
      reasons: [{ provenance: "demo_label", label: "Stripe MPP demo route" }],
    },
    {
      routeId: "route:hitpay-mpp:mcp-research",
      workflowId: "workflow:research-workflow",
      sessionId: "session:hitpay-mpp:demo-001",
      rail: "hitpay_mpp",
      protocol: "mpp",
      sourceRoute: "MCP directory",
      sourcePlatform: "hitpay-demo",
      router: "HitPay MPP receipt",
      providerId: "hitpay-mpp-demo-provider",
      endpointGroup: "Research workflow",
      useCase: "Provider-attested research workflow",
      payerIdentity: "hitpay:payer:demo",
      payeeIdentity: "hitpay:merchant:provider-demo",
      amountUsd: 24,
      currency: "USD",
      status: "paid",
      settlementRef: { type: "hitpay_charge", value: "hitpay_charge_demo_machine_route" },
      visibility: "provider_attested",
      provenance: "demo_label",
      provenanceByField: { rail: "demo_label", settlementRef: "demo_label" },
      timestamp: generatedAt,
      latencyMs: 540,
      reasons: [{ provenance: "demo_label", label: "HitPay MPP demo route" }],
    },
  ];

  const sampleRoutes = providerEvents.length > 0 ? [...providerEvents, ...demoEvents] : demoEvents;
  const routeCount = sampleRoutes.length;
  const workflowCount = new Set(sampleRoutes.map((route) => route.workflowId)).size;
  const paidWorkflowCount = new Set(
    sampleRoutes
      .filter((route) => route.status === "paid" || route.status === "settled")
      .map((route) => route.workflowId),
  ).size;
  const settledUsd = sampleRoutes.reduce((sum, route) => sum + (route.amountUsd ?? 0), 0);
  const successCount = sampleRoutes.filter(
    (route) => route.status === "paid" || route.status === "settled",
  ).length;

  const rails = Array.from(new Set(sampleRoutes.map((route) => route.rail))).map((rail) => {
    const routes = sampleRoutes.filter((route) => route.rail === rail);
    const paidRoutes = routes.filter(
      (route) => route.status === "paid" || route.status === "settled",
    );
    return {
      rail,
      routeCount: routes.length,
      workflowCount: new Set(routes.map((route) => route.workflowId)).size,
      paidWorkflowCount: new Set(paidRoutes.map((route) => route.workflowId)).size,
      settledUsd: routes.reduce((sum, route) => sum + (route.amountUsd ?? 0), 0),
      successRate: routes.length === 0 ? 0 : paidRoutes.length / routes.length,
      repeatUsage: Math.max(
        0,
        routes.length - new Set(routes.map((route) => route.workflowId)).size,
      ),
      visibility: visibilityForRail(rail),
    };
  });

  const routeSummary = validateRouteAnalyticsSummaryResponse({
    generatedAt,
    generatedFrom: ROUTE_ANALYTICS_GENERATED_FROM,
    routeCount,
    workflowCount,
    paidWorkflowCount,
    settledUsd,
    successRate: routeCount === 0 ? 0 : successCount / routeCount,
    repeatUsage: Math.max(0, routeCount - workflowCount),
    paymentToAccessConversion: routeCount === 0 ? 0 : successCount / routeCount,
    rails,
    sampleRoutes,
    provenance: "derived_insight",
    provenanceByField: { sampleRoutes: "derived_insight", rails: "derived_insight" },
    reasons: [
      { provenance: "derived_insight", label: "machine payment route analytics projection" },
    ],
  });

  const nodes = new Map<
    string,
    {
      id: string;
      label: string;
      layer: "source_route" | "payment_rail" | "api_workflow";
      rail?: MachinePaymentRail;
      visibility?: RouteAnalyticsVisibility;
    }
  >();
  const links = new Map<
    string,
    {
      source: string;
      target: string;
      routeCount: number;
      workflowCount: number;
      settledUsd: number;
      rail: MachinePaymentRail;
      visibility: RouteAnalyticsVisibility;
    }
  >();
  const addNode = (node: {
    id: string;
    label: string;
    layer: "source_route" | "payment_rail" | "api_workflow";
    rail?: MachinePaymentRail;
    visibility?: RouteAnalyticsVisibility;
  }) => nodes.set(node.id, node);
  const addLink = (source: string, target: string, route: RouteAnalyticsEvent) => {
    const key = `${source}->${target}:${route.rail}`;
    const existing = links.get(key);
    if (existing) {
      existing.routeCount += 1;
      existing.workflowCount += 1;
      existing.settledUsd += route.amountUsd ?? 0;
      return;
    }
    links.set(key, {
      source,
      target,
      routeCount: 1,
      workflowCount: 1,
      settledUsd: route.amountUsd ?? 0,
      rail: route.rail,
      visibility: route.visibility,
    });
  };

  for (const route of sampleRoutes) {
    const sourceId = `source:${routeIdPart(route.sourceRoute ?? "Direct API client")}`;
    const railId = `rail:${route.rail}`;
    const workflowId = `workflow:${routeIdPart(route.endpointGroup ?? route.workflowId)}`;
    addNode({
      id: sourceId,
      label: route.sourceRoute ?? "Direct API client",
      layer: "source_route",
    });
    addNode({
      id: railId,
      label: railLabel(route.rail),
      layer: "payment_rail",
      rail: route.rail,
      visibility: route.visibility,
    });
    addNode({
      id: workflowId,
      label: route.endpointGroup ?? route.workflowId,
      layer: "api_workflow",
    });
    addLink(sourceId, railId, route);
    addLink(railId, workflowId, route);
  }

  const routeSankey = validateRouteAnalyticsSankeyResponse({
    generatedAt,
    generatedFrom: ROUTE_ANALYTICS_GENERATED_FROM,
    layers: ["source_route", "payment_rail", "api_workflow"],
    nodes: Array.from(nodes.values()),
    links: Array.from(links.values()),
    provenance: "derived_insight",
    provenanceByField: { nodes: "derived_insight", links: "derived_insight" },
    reasons: [
      {
        provenance: "derived_insight",
        label: "source route to payment rail to API workflow projection",
      },
    ],
  });

  return { routeSummary, routeSankey };
};

const fixtureRouteAnalytics = buildRouteAnalytics(fixtureProviderCatalog);

export const fixtureAnalyticsDataSource: BffAnalyticsDataSource = {
  customers: phaseBCustomerListResponse,
  walletUsageGraph: phaseBWalletUsageGraphResponse,
  providers: fixtureProviderCatalog,
  serviceSummary: serviceAnalyticsSummaryResponse,
  serviceComparison: serviceAnalyticsComparisonResponse,
  serviceQuadrants: serviceAnalyticsQuadrantResponse,
  routeSummary: fixtureRouteAnalytics.routeSummary,
  routeSankey: fixtureRouteAnalytics.routeSankey,
  getCustomers: (payTo?: string) =>
    filterCustomersByPayTo(
      phaseBCustomerListResponse,
      payToMapFromWalletUsageGraph(phaseBWalletUsageGraphResponse),
      payTo,
    ),
  getCustomersByServiceId: (serviceId: string) =>
    filterCustomersByServiceId(
      phaseBCustomerListResponse,
      fixtureProviderCatalog,
      phaseBWalletUsageGraphResponse,
      serviceId,
    ),
  getCustomerProfile: getPhaseBCustomerProfileByAddress,
  getCustomerIntelligence: getPhaseBCustomerIntelligenceByAddress,
  getCustomerUpsellMetrics: getPhaseBCustomerUpsellMetricsByAddress,
};

export const loadGeneratedAnalyticsDataSourceFromPayload = (
  payload: GeneratedReadModelFile,
): BffAnalyticsDataSource => {
  const customers = validatePhaseBCustomerListResponse(
    payload.customers ?? phaseBCustomerListResponse,
  );
  const profilesByAddress = Object.fromEntries(
    Object.entries(payload.profilesByAddress ?? {}).map(([address, profile]) => [
      normalizePaymentRecipientAddress(address),
      validatePhaseBCustomerProfileResponse(profile),
    ]),
  );
  const intelligenceByAddress = Object.fromEntries(
    Object.entries(payload.intelligenceByAddress ?? {}).map(([address, intelligence]) => [
      normalizePaymentRecipientAddress(address),
      validateCustomerIntelligenceResponse(intelligence),
    ]),
  );
  const profilesByPayTo = new Map<string, Set<string>>();
  for (const [address, profile] of Object.entries(profilesByAddress)) {
    for (const provider of profile.profile.providers) {
      const key = normalizePaymentRecipientAddress(provider.payToWallet);
      const addresses = profilesByPayTo.get(key) ?? new Set<string>();
      addresses.add(normalizePaymentRecipientAddress(address));
      profilesByPayTo.set(key, addresses);
    }
  }
  const generatedUpsellMetricsByAddress = Object.keys(payload.upsellMetricsByAddress ?? {}).length
    ? Object.fromEntries(
        Object.entries(payload.upsellMetricsByAddress ?? {}).map(([address, value]) => [
          normalizePaymentRecipientAddress(address),
          validatePhaseBCustomerUpsellMetricsResponse(value),
        ]),
      )
    : buildUpsellMetricsByAddress({
        customers,
        profilesByAddress,
        intelligenceByAddress,
      });

  const walletUsageGraph = validatePhaseBWalletUsageGraphResponse(
    payload.walletUsageGraph ?? phaseBWalletUsageGraphResponse,
  );
  const providers = validateProviderCatalogResponse(
    payload.providers ?? fixtureAnalyticsDataSource.providers,
  );
  const fallbackRouteAnalytics = buildRouteAnalytics(providers);

  return {
    customers,
    walletUsageGraph,
    providers,
    serviceSummary: validateServiceAnalyticsSummaryResponse(
      payload.serviceSummary ?? serviceAnalyticsSummaryResponse,
    ),
    serviceComparison: validateServiceAnalyticsComparisonResponse(
      payload.serviceComparison ?? serviceAnalyticsComparisonResponse,
    ),
    serviceQuadrants: validateServiceAnalyticsQuadrantResponse(
      payload.serviceQuadrants ?? serviceAnalyticsQuadrantResponse,
    ),
    routeSummary: validateRouteAnalyticsSummaryResponse(
      payload.routeSummary ?? fallbackRouteAnalytics.routeSummary,
    ),
    routeSankey: validateRouteAnalyticsSankeyResponse(
      payload.routeSankey ?? fallbackRouteAnalytics.routeSankey,
    ),
    getCustomers: (payTo?: string) => filterCustomersByPayTo(customers, profilesByPayTo, payTo),
    getCustomersByServiceId: (serviceId: string) =>
      filterCustomersByServiceId(customers, providers, walletUsageGraph, serviceId),
    getCustomerProfile: (address: string) =>
      profilesByAddress[normalizePaymentRecipientAddress(address)],
    getCustomerIntelligence: (address: string) =>
      intelligenceByAddress[normalizePaymentRecipientAddress(address)],
    getCustomerUpsellMetrics: (address: string) =>
      generatedUpsellMetricsByAddress[normalizePaymentRecipientAddress(address)],
  };
};

export const loadGeneratedAnalyticsDataSource = (filePath: string): BffAnalyticsDataSource => {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedReadModelFile;
  return loadGeneratedAnalyticsDataSourceFromPayload(payload);
};

// Merge an MPP-derived ProviderCatalogResponse on top of an existing data source's
// providers. The data source identity is preserved (only the providers field is replaced),
// so customers/profiles/wallet graph etc. continue to work unchanged.
//
// Behavior:
// - overlayPath is undefined/empty -> no-op (overlay disabled)
// - overlayPath is set but file missing/unreadable -> throw (fail-fast on misconfig)
export const applyMppCatalogOverlay = (
  dataSource: BffAnalyticsDataSource,
  overlayPath: string | undefined,
): BffAnalyticsDataSource => {
  const trimmed = overlayPath?.trim();
  if (!trimmed) return dataSource;
  if (!fs.existsSync(trimmed)) {
    throw new Error(
      `BFF_MPP_CATALOG_PATH is set but file does not exist: ${trimmed}. ` +
        "Either unset BFF_MPP_CATALOG_PATH or point it to a readable mpp-provider-catalog.json.",
    );
  }
  const raw = JSON.parse(fs.readFileSync(trimmed, "utf8"));
  const mppCatalog = validateProviderCatalogResponse(raw);
  const merged = mergeProviderCatalogs(dataSource.providers, mppCatalog);
  if (merged === dataSource.providers) return dataSource;
  const routeAnalytics = buildRouteAnalytics(merged);
  return { ...dataSource, providers: merged, ...routeAnalytics };
};

const createBunPostgresClient = (url: string): PostgresAnalyticsClient => {
  const sql = new SQL(url);
  return {
    query: (query, params = []) => sql.unsafe(query, params) as Promise<Record<string, unknown>[]>,
  };
};

export const loadPostgresAnalyticsDataSource = async (
  client: PostgresAnalyticsClient,
  snapshotId = "latest",
): Promise<BffAnalyticsDataSource> => {
  const rows = await client.query("SELECT payload FROM bff_analytics_snapshots WHERE id = $1", [
    snapshotId,
  ]);
  const rawPayload = rows[0]?.payload;
  const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  if (!payload || typeof payload !== "object") {
    throw new Error(`BFF analytics snapshot not found: ${snapshotId}`);
  }
  return loadGeneratedAnalyticsDataSourceFromPayload(payload as GeneratedReadModelFile);
};

const filterCustomersByPayTo = (
  customers: PhaseBCustomerListResponse,
  profilesByPayTo: Map<string, Set<string>> | undefined,
  payTo?: string,
): PhaseBCustomerListResponse => {
  if (!payTo) return annotateCustomerListWithTags(customers);
  const normalized = normalizePaymentRecipientAddress(payTo);
  const allowed = profilesByPayTo?.get(normalized);
  const filtered = allowed
    ? customers.customers.filter((customer) =>
        allowed.has(normalizePaymentRecipientAddress(customer.address)),
      )
    : customers.customers.filter(() => false);
  return annotateCustomerListWithTags(
    validatePhaseBCustomerListResponse({
      ...customers,
      customers: filtered,
      customerCount: filtered.length,
      scope: { ...(customers.scope ?? {}), payTo: normalized },
    }),
  );
};

// Pay.sh タグの確定的割当: solana を使う wallet の概ね 80% に付与する。
// FNV-1a(address) を 100 で剰余して < 80 のとき付与。address だけで決まるので
// ページリロードや fixture 再生成で結果が変わらない。
const SOLANA_PAYSH_BUCKET_SIZE = 100;
const SOLANA_PAYSH_THRESHOLD = 80;
const SOLANA_PAYSH_SALT = "pay.sh:solana";

const fnv1aHash = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const SOLANA_BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const isSolanaCustomer = (customer: {
  chains?: readonly string[];
  address: string;
}): boolean => {
  if (customer.chains?.some((chain) => chain.toLowerCase().includes("solana"))) return true;
  // chains[] が無い (legacy) ケースは address フォーマットで厳密判定する。
  // PaymentRecipientAddressSchema が許容する EVM hex / SPL: / ERC20: は
  // どれも Solana wallet ではないため除外し、Solana base58 形式のみを採る。
  const trimmed = customer.address.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) return false;
  if (trimmed.startsWith("ERC20:") || trimmed.startsWith("SPL:")) return false;
  return SOLANA_BASE58_PATTERN.test(trimmed);
};

export const shouldTagPaySh = (address: string): boolean => {
  const bucket = fnv1aHash(`${SOLANA_PAYSH_SALT}::${address}`) % SOLANA_PAYSH_BUCKET_SIZE;
  return bucket < SOLANA_PAYSH_THRESHOLD;
};

const withDerivedTags = <
  T extends { address: string; chains?: readonly string[]; tags?: readonly string[] },
>(
  customer: T,
): T & { tags: string[] } => {
  const existing = customer.tags ?? [];
  if (!isSolanaCustomer(customer)) return { ...customer, tags: [...existing] };
  if (!shouldTagPaySh(customer.address)) return { ...customer, tags: [...existing] };
  if (existing.includes("Pay.sh")) return { ...customer, tags: [...existing] };
  return { ...customer, tags: [...existing, "Pay.sh"] };
};

const annotateCustomerListWithTags = (
  response: PhaseBCustomerListResponse,
): PhaseBCustomerListResponse =>
  validatePhaseBCustomerListResponse({
    ...response,
    customers: response.customers.map((c) => withDerivedTags(c)),
  });

const payToMapFromWalletUsageGraph = (walletUsageGraph: WalletUsageGraphResponse) => {
  const map = new Map<string, Set<string>>();
  for (const provider of walletUsageGraph.graph.providerWallets) {
    map.set(
      normalizePaymentRecipientAddress(provider.payToWallet),
      new Set(
        provider.payerWallets.map((wallet) => normalizePaymentRecipientAddress(wallet.address)),
      ),
    );
  }
  return map;
};

type ProviderRowSummary = {
  providerId: string;
  payTo: string;
  network: string;
  asset: string;
};

const filterCustomersByServiceId = (
  baseCustomers: PhaseBCustomerListResponse,
  providers: ProviderCatalogResponse,
  walletUsageGraph: WalletUsageGraphResponse,
  serviceId: string,
): PhaseBCustomerListResponse => {
  const target = serviceId.trim();
  if (!target) {
    return annotateCustomerListWithTags(
      validatePhaseBCustomerListResponse({
        ...baseCustomers,
        customers: [],
        customerCount: 0,
        scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
      }),
    );
  }

  const matchingRows: ProviderRowSummary[] = [];
  for (const row of providers.providers) {
    if (
      row.serviceId === target ||
      row.providerId === target ||
      (row.title && row.title === target) ||
      row.name === target
    ) {
      matchingRows.push({
        providerId: row.providerId,
        payTo: normalizePaymentRecipientAddress(row.payTo),
        network: row.network,
        asset: row.asset,
      });
    }
  }
  if (matchingRows.length === 0) {
    return annotateCustomerListWithTags(
      validatePhaseBCustomerListResponse({
        ...baseCustomers,
        customers: [],
        customerCount: 0,
        scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
      }),
    );
  }

  // catalog row の providerId は build-fixture で生成された
  // `<slug-url>--<chain>--<asset>--<payTo>` 形式で、walletUsageGraph 側の
  // providerId と完全一致する。これを直接 lookup key として使う。
  const matchingProviderIds = new Set(matchingRows.map((r) => r.providerId));
  const rowsByProviderId = new Map(matchingRows.map((r) => [r.providerId, r] as const));
  const allProviderIdsByAddress = new Map<string, Set<string>>();
  for (const provider of walletUsageGraph.graph.providerWallets) {
    for (const payer of provider.payerWallets) {
      const addrKey = normalizePaymentRecipientAddress(payer.address);
      const providerIds = allProviderIdsByAddress.get(addrKey) ?? new Set<string>();
      providerIds.add(provider.providerId);
      for (const candidate of payer.otherServiceCandidates) {
        providerIds.add(candidate.providerId);
      }
      allProviderIdsByAddress.set(addrKey, providerIds);
    }
  }

  type Aggregate = {
    address: string;
    /** chain ごとにその chain で使われた asset の集合 */
    chainAssetMap: Map<string, Set<string>>;
    /** 一意の providerId 集合 (wallet が実際にヒットした catalog row 数) */
    providerIds: Set<string>;
    spendByAsset: Map<string, bigint>;
    totalSpend: bigint;
    observationCount: number;
    lastSeenAt: string | undefined;
  };

  const aggByAddress = new Map<string, Aggregate>();

  for (const provider of walletUsageGraph.graph.providerWallets) {
    if (!matchingProviderIds.has(provider.providerId)) continue;
    const row = rowsByProviderId.get(provider.providerId);
    if (!row) continue;
    const network = row.network;
    const asset = row.asset;

    for (const payer of provider.payerWallets) {
      const addrKey = normalizePaymentRecipientAddress(payer.address);
      const spendAtomic = BigInt(payer.sharedSpendAtomic);
      const txCount = payer.sharedTransactionCount;
      const lastSeen = payer.lastSeenAt;
      const existing = aggByAddress.get(addrKey);
      if (!existing) {
        aggByAddress.set(addrKey, {
          address: payer.address,
          chainAssetMap: new Map([[network, new Set([asset])]]),
          providerIds: new Set([provider.providerId]),
          spendByAsset: new Map([[asset, spendAtomic]]),
          totalSpend: spendAtomic,
          observationCount: txCount,
          lastSeenAt: lastSeen,
        });
        continue;
      }
      const chainAssets = existing.chainAssetMap.get(network);
      if (chainAssets) {
        chainAssets.add(asset);
      } else {
        existing.chainAssetMap.set(network, new Set([asset]));
      }
      existing.providerIds.add(provider.providerId);
      existing.spendByAsset.set(asset, (existing.spendByAsset.get(asset) ?? 0n) + spendAtomic);
      existing.totalSpend += spendAtomic;
      existing.observationCount += txCount;
      if (lastSeen && (!existing.lastSeenAt || lastSeen > existing.lastSeenAt)) {
        existing.lastSeenAt = lastSeen;
      }
    }
  }

  const aggregated = Array.from(aggByAddress.values()).map((a) => {
    const chainsArr = Array.from(a.chainAssetMap.keys());
    const assetSet = new Set<string>();
    for (const assets of a.chainAssetMap.values()) {
      for (const asset of assets) assetSet.add(asset);
    }
    return {
      address: a.address,
      label: null as string | null,
      observationCount: a.observationCount,
      spendAtomic: a.totalSpend.toString(),
      providerCount:
        allProviderIdsByAddress.get(normalizePaymentRecipientAddress(a.address))?.size ??
        a.providerIds.size,
      lastSeenAt: a.lastSeenAt,
      activityGrowth: 0,
      upsellOpportunity:
        chainsArr.length >= 2
          ? ("high" as const)
          : a.observationCount >= 5
            ? ("medium" as const)
            : ("low" as const),
      chains: chainsArr,
      assets: Array.from(assetSet),
      spendByAsset: Object.fromEntries(
        Array.from(a.spendByAsset.entries()).map(([k, v]) => [k, v.toString()] as const),
      ),
      provenance: "derived_insight" as const,
      provenanceByField: {
        address: "derived_insight",
        spendAtomic: "derived_insight",
        providerCount: "derived_insight",
      },
      reasons: [
        {
          provenance: "derived_insight" as const,
          label: "service-aggregated customer",
          description: `Aggregated across ${matchingRows.length} catalog row(s) sharing serviceId ${target}.`,
        },
      ],
    };
  });

  return annotateCustomerListWithTags(
    validatePhaseBCustomerListResponse({
      ...baseCustomers,
      generatedFrom: `service-aggregated:${target}`,
      customers: aggregated,
      customerCount: aggregated.length,
      scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
    }),
  );
};

export const resolveAnalyticsDataSource = (
  filePath = process.env.BFF_ANALYTICS_READ_MODEL_PATH ?? DEFAULT_GENERATED_ANALYTICS_PATH,
  options: ResolveAnalyticsDataSourceOptions = {},
): BffAnalyticsDataSource | Promise<BffAnalyticsDataSource> => {
  const env = options.env ?? process.env;
  const source = (env.BFF_ANALYTICS_SOURCE?.trim() || undefined) as AnalyticsSourceKind | undefined;
  const readModelPath = env.BFF_ANALYTICS_READ_MODEL_PATH ?? filePath;
  // Overlay resolution:
  // - BFF_MPP_CATALOG_PATH explicitly set (any value, including ""):
  //     non-empty path -> use it (fail-fast if file missing)
  //     empty string   -> overlay disabled
  // - BFF_MPP_CATALOG_PATH undefined:
  //     non-production: auto-load tmp/mpp-provider-catalog.json if it exists (dev convenience)
  //     production:     no auto-load (must be opt-in via BFF_MPP_CATALOG_PATH)
  const isProduction = (env.NODE_ENV ?? "").toLowerCase() === "production";
  const mppOverlayPath =
    env.BFF_MPP_CATALOG_PATH !== undefined
      ? env.BFF_MPP_CATALOG_PATH
      : !isProduction && fs.existsSync(DEFAULT_MPP_CATALOG_PATH)
        ? DEFAULT_MPP_CATALOG_PATH
        : undefined;

  const overlay = (resolved: BffAnalyticsDataSource): BffAnalyticsDataSource =>
    applyMppCatalogOverlay(resolved, mppOverlayPath);

  if (source === "fixture") return overlay(fixtureAnalyticsDataSource);

  if (source === "json") {
    if (!readModelPath || !fs.existsSync(readModelPath)) {
      throw new Error(`BFF analytics JSON read model not found: ${readModelPath}`);
    }
    return overlay(loadGeneratedAnalyticsDataSource(readModelPath));
  }

  if (source === "postgres") {
    const databaseUrl = env.BFF_ANALYTICS_DATABASE_URL ?? env.DATABASE_URL;
    if (!databaseUrl && !options.postgresClient) {
      throw new Error(
        "BFF analytics postgres source requires BFF_ANALYTICS_DATABASE_URL or DATABASE_URL.",
      );
    }
    const client = options.postgresClient ?? createBunPostgresClient(databaseUrl as string);
    if ((env.BFF_ANALYTICS_POSTGRES_MODE ?? "live") === "snapshot") {
      return loadPostgresAnalyticsDataSource(
        client,
        env.BFF_ANALYTICS_SNAPSHOT_ID ?? "latest",
      ).then(overlay);
    }
    return loadPostgresLiveAnalyticsDataSource(client).then(overlay);
  }

  if (source !== undefined) {
    throw new Error(`Unsupported BFF_ANALYTICS_SOURCE: ${source}`);
  }

  if (readModelPath && fs.existsSync(readModelPath))
    return overlay(loadGeneratedAnalyticsDataSource(readModelPath));
  return overlay(fixtureAnalyticsDataSource);
};
