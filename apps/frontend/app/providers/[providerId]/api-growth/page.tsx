import { ApiGrowthIntelligenceScreen } from "@/components/api-growth/ApiGrowthIntelligenceScreen";
import { TopBar } from "@/components/shell/TopBar";
import { buildApiGrowthIntelligence } from "@/lib/api-growth/metrics";
import { MACRO_METRICS_DEMO_DATA } from "@/lib/macro-metrics/demo";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function ApiGrowthPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const intelligence = buildApiGrowthIntelligence(MACRO_METRICS_DEMO_DATA);

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "API Growth" }]}
        dataMode={pageCtx.dataMode}
      />
      <div className="scroll">
        <ApiGrowthIntelligenceScreen intelligence={intelligence} />
      </div>
    </>
  );
}
