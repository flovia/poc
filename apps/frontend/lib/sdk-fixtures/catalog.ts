import type { ProviderCatalogItemDto } from "@/lib/api/types";
import type { StaticProviderCapability } from "@/lib/providers/static-capabilities";
import { mergeStaticProviders } from "@/lib/providers/static-merge";
import { getSnapshotSummaries } from "./snapshot-customers";
import { PROVIDER_NAME, PROVIDER_PAY_TO } from "./shared";

const SDK_PROVIDER_IDS = Object.keys(PROVIDER_NAME);

const toCatalogItem = (
  capability: StaticProviderCapability,
  routeId: string,
): ProviderCatalogItemDto => ({
  providerId: routeId,
  name: capability.name,
  serviceId: capability.serviceId,
  serviceName: capability.name,
  network: capability.network,
  asset: capability.asset,
  payTo: capability.payTo,
  catalogSource: capability.catalogSource,
  transactionCount: capability.transactionCount,
  uniqueSenderCount: capability.uniqueSenderCount,
  totalVolumeAtomic: (BigInt(capability.transactionCount) * 1_500_000n).toString(),
  endpointCount: 1,
  resourceCount: 1,
  endpointAttributionStatus: "unresolved_payto",
  attributionConfidence: 0.35,
  hasCustomerFacts: false,
  customerFactCount: 0,
  provenance: "demo_label",
  provenanceByField: { payTo: "demo_label", name: "demo_label" },
  reasons: [
    {
      provenance: "demo_label",
      label: "fixture_catalog",
      description: "Synthetic public catalog row. Wallet addresses are generated, not on-chain.",
    },
  ],
});

const sdkCatalogItem = (providerId: string): ProviderCatalogItemDto => {
  const name = PROVIDER_NAME[providerId] ?? providerId;
  const payTo = PROVIDER_PAY_TO[providerId] ?? providerId;
  return {
    providerId,
    name,
    serviceId: providerId,
    serviceName: name,
    network: "base",
    asset: "USDC",
    payTo,
    catalogSource: "base_curated",
    transactionCount: 48,
    uniqueSenderCount: 5,
    totalVolumeAtomic: "3840000000",
    endpointCount: 4,
    resourceCount: 4,
    endpointAttributionStatus: "bundled_payto_unknown_endpoint",
    attributionConfidence: 0.9,
    hasCustomerFacts: true,
    customerFactCount: 5,
    provenance: "demo_label",
    provenanceByField: { payTo: "demo_label", name: "demo_label" },
    reasons: [
      {
        provenance: "demo_label",
        label: "sdk_fixture_provider",
        description: "Fictional provider used by the SDK-connected wallet preview.",
      },
    ],
  };
};

export function getFixtureProviders(): ProviderCatalogItemDto[] {
  const summaries = getSnapshotSummaries();
  return mergeStaticProviders(SDK_PROVIDER_IDS.map(sdkCatalogItem), toCatalogItem).map(
    (provider) => {
      const summary = provider.serviceId ? summaries.get(provider.serviceId) : undefined;
      if (!summary) return provider;
      return {
        ...provider,
        hasCustomerFacts: true,
        customerFactCount: summary.customerCount,
        transactionCount: summary.observationCount,
        totalVolumeAtomic: summary.totalVolumeAtomic,
      };
    },
  );
}
