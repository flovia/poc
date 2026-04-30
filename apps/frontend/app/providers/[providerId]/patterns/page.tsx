import { TopBar } from "@/components/shell/TopBar";
import { PatternsScreen } from "@/components/patterns/PatternsScreen";
import {
  getObservations,
  getSdkRetentionByAgent,
  getSdkWorkflowClusters,
  getWalletUsageGraph,
} from "@/lib/data-source";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function PatternsPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const [graph, observations, sdkWorkflowClusters, sdkRetentionByAgent, pageCtx] =
    await Promise.all([
      getWalletUsageGraph(),
      getObservations(),
      getSdkWorkflowClusters(),
      getSdkRetentionByAgent(),
      getTopBarPageContext(),
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
        />
      </div>
    </>
  );
}
