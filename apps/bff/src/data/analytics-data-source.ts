import path from "node:path";
import type {
  CustomerIntelligenceResponse,
  PhaseBCustomerListResponse,
  PhaseBCustomerProfileResponse,
  PhaseBCustomerUpsellMetricsResponse,
  ProviderCatalogResponse,
  RouteAnalyticsSankeyResponse,
  RouteAnalyticsSummaryResponse,
  ServiceAnalyticsComparisonResponse,
  ServiceAnalyticsQuadrantResponse,
  ServiceAnalyticsSummaryResponse,
  WalletUsageGraphResponse,
} from "contracts";

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

export type AnalyticsSourceKind = "json" | "postgres" | "fixture";

export type AnalyticsSourceEnv = Partial<
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

export type ResolveAnalyticsDataSourceOptions = {
  env?: AnalyticsSourceEnv;
  postgresClient?: PostgresAnalyticsClient;
};

export const DEFAULT_GENERATED_ANALYTICS_PATH = path.join(
  import.meta.dir,
  "..",
  "..",
  "fixtures",
  "generated",
  "analytics.json",
);

export const DEFAULT_MPP_CATALOG_PATH = path.join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "..",
  "tmp",
  "mpp-provider-catalog.json",
);

export const DEFAULT_MACHINE_PAYMENT_ROUTES_FIXTURE_PATH = path.join(
  import.meta.dir,
  "..",
  "..",
  "fixtures",
  "machine-payment-routes.json",
);

export const ROUTE_ANALYTICS_GENERATED_FROM = "machine-payment-route-analytics-p0";
