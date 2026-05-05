import { GeoSpecScreen } from "@/components/geo-spec/GeoSpecScreen";
import { getProviders } from "@/lib/api/client";
import { findProviderByRouteId } from "@/lib/providers";
import { TopBar } from "@/components/shell/TopBar";
import { getGeoSpec } from "@/lib/geo-spec/source";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function GeoSpecPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const liveProvider = await getProviders()
    .then((providers) => findProviderByRouteId(providers, providerId) ?? null)
    .catch(() => null);
  const spec = getGeoSpec(
    providerId,
    liveProvider?.payTo
      ? {
          providerId: liveProvider.providerId,
          name: liveProvider.name,
          title: liveProvider.title,
          description: liveProvider.description,
          useCase: liveProvider.useCase,
          category: liveProvider.category,
          serviceId: liveProvider.serviceId,
          serviceName: liveProvider.serviceName,
          serviceUrl: liveProvider.serviceUrl,
          payTo: liveProvider.payTo,
          network: liveProvider.network ?? "base",
          asset: liveProvider.asset ?? "USDC",
          endpointCount: liveProvider.endpointCount,
          resources: liveProvider.resources,
        }
      : null,
  );

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "GEO spec" }]}
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
          note: "Per-endpoint USD prices are not separately published in the Pay.sh atlas — only per-offer probe prices. Path totals reflect observed amounts in the current fixture.",
        }}
      />
      <div className="scroll">
        <GeoSpecScreen providerId={providerId} spec={spec} />
      </div>
    </>
  );
}
