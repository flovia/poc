import type {
  BitqueryAggregate,
  CdpPaymentOption,
  CdpResource,
  MarketPaymentOption,
  MarketResourceSnapshot,
  MarketSnapshot,
} from "./market";
import {
  BitqueryAggregateSchema,
  CdpPaymentOptionSchema,
  CdpResourceSchema,
  MarketPaymentOptionSchema,
  MarketResourceSnapshotSchema,
  MarketSnapshotSchema,
} from "./market";
import type {
  MockEndpointAttributionFixture,
  PhaseBCustomerListResponse,
  RealTransactionFixture,
} from "./phase-b";
import {
  MockEndpointAttributionFixtureSchema,
  PhaseBCustomerListResponseSchema,
  RealTransactionFixtureSchema,
} from "./phase-b";
import type { ProviderCatalogResponse, ProviderRankingResponse } from "./provider-catalog";
import { ProviderCatalogResponseSchema, ProviderRankingResponseSchema } from "./provider-catalog";
import type {
  CustomerIntelligenceFixture,
  CustomerIntelligenceResponse,
  PortfolioSourceResult,
} from "./customer-intelligence";
import {
  CustomerIntelligenceFixtureSchema,
  CustomerIntelligenceResponseSchema,
  PortfolioSourceResultSchema,
} from "./customer-intelligence";
import type {
  ServiceAnalyticsComparisonResponse,
  ServiceAnalyticsQuadrantResponse,
  ServiceAnalyticsSummaryResponse,
} from "./service-analytics";
import {
  ServiceAnalyticsComparisonResponseSchema,
  ServiceAnalyticsQuadrantResponseSchema,
  ServiceAnalyticsSummaryResponseSchema,
} from "./service-analytics";
import type {
  RouteAnalyticsSankeyResponse,
  RouteAnalyticsSummaryResponse,
} from "./route-analytics";
import {
  RouteAnalyticsSankeyResponseSchema,
  RouteAnalyticsSummaryResponseSchema,
} from "./route-analytics";
import type {
  PhaseBCustomerProfileResponse,
  WalletUsageGraphResponse,
} from "./customer-intelligence";
import {
  PhaseBCustomerProfileResponseSchema,
  WalletUsageGraphResponseSchema,
} from "./customer-intelligence";

export const validateCdpPaymentOption = (value: unknown): CdpPaymentOption =>
  CdpPaymentOptionSchema.parse(value);

export const validateCdpResource = (value: unknown): CdpResource => CdpResourceSchema.parse(value);

export const validateBitqueryAggregate = (value: unknown): BitqueryAggregate =>
  BitqueryAggregateSchema.parse(value);

export const validateMarketPaymentOption = (value: unknown): MarketPaymentOption =>
  MarketPaymentOptionSchema.parse(value);

export const validateMarketResourceSnapshot = (value: unknown): MarketResourceSnapshot =>
  MarketResourceSnapshotSchema.parse(value);

export const validateMarketSnapshot = (value: unknown): MarketSnapshot =>
  MarketSnapshotSchema.parse(value);

export const validateRealTransactionFixture = (value: unknown): RealTransactionFixture =>
  RealTransactionFixtureSchema.parse(value);

export const validateMockEndpointAttributionFixture = (
  value: unknown,
): MockEndpointAttributionFixture => MockEndpointAttributionFixtureSchema.parse(value);

export const validatePhaseBCustomerListResponse = (value: unknown): PhaseBCustomerListResponse =>
  PhaseBCustomerListResponseSchema.parse(value);

export const validateProviderCatalogResponse = (value: unknown): ProviderCatalogResponse =>
  ProviderCatalogResponseSchema.parse(value);

export const validateProviderRankingResponse = (value: unknown): ProviderRankingResponse =>
  ProviderRankingResponseSchema.parse(value);

export const validatePhaseBCustomerProfileResponse = (
  value: unknown,
): PhaseBCustomerProfileResponse => PhaseBCustomerProfileResponseSchema.parse(value);

export const validatePhaseBWalletUsageGraphResponse = (value: unknown): WalletUsageGraphResponse =>
  WalletUsageGraphResponseSchema.parse(value);

export const validateCustomerIntelligenceResponse = (
  value: unknown,
): CustomerIntelligenceResponse => CustomerIntelligenceResponseSchema.parse(value);

export const validateCustomerIntelligenceFixture = (value: unknown): CustomerIntelligenceFixture =>
  CustomerIntelligenceFixtureSchema.parse(value);

export const validateServiceAnalyticsSummaryResponse = (
  value: unknown,
): ServiceAnalyticsSummaryResponse => ServiceAnalyticsSummaryResponseSchema.parse(value);

export const validateServiceAnalyticsComparisonResponse = (
  value: unknown,
): ServiceAnalyticsComparisonResponse => ServiceAnalyticsComparisonResponseSchema.parse(value);

export const validateServiceAnalyticsQuadrantResponse = (
  value: unknown,
): ServiceAnalyticsQuadrantResponse => ServiceAnalyticsQuadrantResponseSchema.parse(value);

export const validateRouteAnalyticsSummaryResponse = (
  value: unknown,
): RouteAnalyticsSummaryResponse => RouteAnalyticsSummaryResponseSchema.parse(value);

export const validateRouteAnalyticsSankeyResponse = (
  value: unknown,
): RouteAnalyticsSankeyResponse => RouteAnalyticsSankeyResponseSchema.parse(value);
