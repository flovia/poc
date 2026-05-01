import { MacroMetricsScreen } from "@/components/macro-metrics/MacroMetricsScreen";
import { TopBar } from "@/components/shell/TopBar";
import { MACRO_METRICS_DEMO_DATA } from "@/lib/macro-metrics/demo";
import { buildMacroMetrics } from "@/lib/macro-metrics/metrics";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function MacroMetricsPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const metrics = buildMacroMetrics(MACRO_METRICS_DEMO_DATA);

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "Macro Metrics" }]}
        dataMode={pageCtx.dataMode}
      />
      <div className="scroll">
        <MacroMetricsScreen metrics={metrics} providerId={providerId} />
      </div>
    </>
  );
}
