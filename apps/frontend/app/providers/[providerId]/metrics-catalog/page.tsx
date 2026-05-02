import { MetricsCatalogScreen } from "@/components/macro-metrics/MetricsCatalogScreen";
import { TopBar } from "@/components/shell/TopBar";
import { buildMetricsCatalog } from "@/lib/macro-metrics/catalog";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function MetricsCatalogPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const catalog = buildMetricsCatalog();

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "Macro Metrics", href: `/providers/${providerId}/macro-metrics` }, { label: "Metrics Catalog" }]}
        dataMode={pageCtx.dataMode}
      />
      <div className="scroll">
        <MetricsCatalogScreen catalog={catalog} />
      </div>
    </>
  );
}
