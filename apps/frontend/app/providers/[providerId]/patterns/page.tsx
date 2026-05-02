import { TopBar } from "@/components/shell/TopBar";
import { PatternsScreen } from "@/components/patterns/PatternsScreen";
import {
  getObservations,
  getSdkRetentionByAgent,
  getSdkWorkflowClusters,
  getWalletUsageGraph,
} from "@/lib/data-source";
import { getTopBarPageContext } from "@/lib/server/page-context";
import { getX402AnalysisViewModelForMode } from "@/lib/x402-analysis/page-data";

export default async function PatternsPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const [graph, observations, sdkWorkflowClusters, sdkRetentionByAgent, x402ViewModel] =
    await Promise.all([
      getWalletUsageGraph(),
      getObservations(),
      getSdkWorkflowClusters(),
      getSdkRetentionByAgent(),
      getX402AnalysisViewModelForMode(pageCtx.dataMode),
    ]);

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "Co-usage Patterns" }]}
        dataMode={pageCtx.dataMode}
      />
      <div className="scroll">
        <PatternsScreen
          graph={graph}
          observations={observations}
          providerId={providerId}
          dataMode={pageCtx.dataMode}
          sdkWorkflowClusters={sdkWorkflowClusters}
          sdkRetentionByAgent={sdkRetentionByAgent}
          x402ViewModel={x402ViewModel}
        />
      </div>
    </>
  );
}
