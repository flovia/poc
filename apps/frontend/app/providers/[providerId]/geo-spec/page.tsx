import { GeoSpecScreen } from "@/components/geo-spec/GeoSpecScreen";
import { getProviders } from "@/lib/api/client";
import { findProviderByRouteId } from "@/lib/providers";
import { TopBar } from "@/components/shell/TopBar";
import { getGeoSpec } from "@/lib/geo-spec/source";
import { extractBrandKey } from "@/lib/pay-sh/brand";
import { getTopBarPageContext } from "@/lib/server/page-context";
import type { ProviderCatalogItemDto } from "@/lib/api/types";

// Find rows that share the active provider's brand key. The picker collapses
// MPP + Pay.sh rows for the same brand into a single card; when the user
// clicks through to GEO we want to combine those rows so the page shows BOTH
// catalog sources (Pay.sh description + MPP endpoints, etc.).
const collectBrandSiblings = (
  providers: ProviderCatalogItemDto[],
  active: ProviderCatalogItemDto,
): ProviderCatalogItemDto[] => {
  const activeKey = extractBrandKey(active.serviceId);
  if (!activeKey) return [active];
  return providers.filter((p) => extractBrandKey(p.serviceId) === activeKey);
};

const pickFirstNonEmpty = <T,>(values: ReadonlyArray<T | undefined | null>): T | undefined => {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.length === 0) continue;
    return v;
  }
  return undefined;
};

export default async function GeoSpecPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const allProviders = await getProviders().catch(() => [] as ProviderCatalogItemDto[]);
  const liveProvider = findProviderByRouteId(allProviders, providerId) ?? null;
  const siblings = liveProvider ? collectBrandSiblings(allProviders, liveProvider) : [];
  // Prefer MPP-side fields from the sibling MPP row when the user landed on a
  // Pay.sh row, so MPP description / endpoints surface even on the Pay.sh URL.
  const mppSibling = siblings.find((s) => s.catalogSource === "mpp_registry") ?? null;
  // Combined resources: prefer Pay.sh resources when the active row has them,
  // otherwise carry the MPP sibling's. (Concatenating would double-count when
  // both sides describe the same endpoints.)
  const combinedResources =
    (liveProvider?.resources && liveProvider.resources.length > 0
      ? liveProvider.resources
      : mppSibling?.resources) ?? undefined;

  const spec = getGeoSpec(
    providerId,
    liveProvider?.payTo
      ? {
          providerId: liveProvider.providerId,
          name: liveProvider.name,
          title: liveProvider.title,
          description: liveProvider.description,
          mppDescription: pickFirstNonEmpty([liveProvider.mppDescription, mppSibling?.mppDescription]),
          useCase: liveProvider.useCase,
          category: liveProvider.category,
          serviceId: liveProvider.serviceId,
          serviceName: liveProvider.serviceName,
          serviceUrl: pickFirstNonEmpty([liveProvider.serviceUrl, mppSibling?.serviceUrl]),
          hasMetering: liveProvider.hasMetering,
          hasFreeTier: liveProvider.hasFreeTier,
          providerSha: liveProvider.providerSha,
          registryVersion: liveProvider.registryVersion,
          registryGeneratedAt: liveProvider.registryGeneratedAt,
          registrySourceUrl: liveProvider.registrySourceUrl,
          priceRangeUsd: liveProvider.priceRangeUsd,
          offers: liveProvider.offers,
          payTo: liveProvider.payTo,
          network: liveProvider.network ?? "base",
          asset: liveProvider.asset ?? "USDC",
          endpointCount: liveProvider.endpointCount,
          resources: combinedResources,
        }
      : null,
  );

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "GEO" }]}
        dataMode={pageCtx.dataMode}
        onboarding={{
          id: "geo-spec",
          title: "Generative Engine Optimization spec",
          description:
            "Show AI agents and humans what this Pay.sh provider does, what it costs, and which paths it serves.",
          metrics: [
            {
              label: "Description",
              description: "Pay.sh-published summary of the provider's capability.",
              icon: "spark",
            },
            {
              label: "Use case",
              description: "When an agent should call this provider.",
              icon: "activity",
            },
            {
              label: "Chains & assets",
              description: "Each (chain × asset × payTo) offer with its probe price.",
              icon: "growth",
            },
            {
              label: "API paths",
              description: "Endpoints observed against this provider in current data.",
              icon: "repeat",
            },
          ],
          note: "Per-endpoint USD prices are not separately published in the Pay.sh catalog — only per-offer probe prices. Path totals reflect observed paid amounts in the current fixture.",
        }}
      />
      <div className="scroll">
        <GeoSpecScreen providerId={providerId} spec={spec} />
      </div>
    </>
  );
}
