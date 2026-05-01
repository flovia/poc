import { TopBar } from "@/components/shell/TopBar";
import { PatternsScreen } from "@/components/patterns/PatternsScreen";
import {
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
  const [graph, sdkWorkflowClusters, sdkRetentionByAgent, pageCtx] = await Promise.all([
    getWalletUsageGraph(),
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
          providerId={providerId}
          dataMode={pageCtx.dataMode}
          sdkWorkflowClusters={sdkWorkflowClusters}
          sdkRetentionByAgent={sdkRetentionByAgent}
        />
      </div>
    </>
  );
}
