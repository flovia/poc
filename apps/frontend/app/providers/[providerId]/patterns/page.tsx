import { TopBar } from "@/components/shell/TopBar";
import { PatternsScreen } from "@/components/patterns/PatternsScreen";
import { getWalletUsageGraph } from "@/lib/api/client";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function PatternsPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const [graph, pageCtx] = await Promise.all([getWalletUsageGraph(), getTopBarPageContext()]);

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "Co-usage Patterns" }]}
        dataMode={pageCtx.dataMode}
        updatedAtUnixSec={pageCtx.updatedAtUnixSec}
        renderedAtUnixSec={pageCtx.renderedAtUnixSec}
      />
      <div className="scroll">
        <PatternsScreen graph={graph} providerId={providerId} />
      </div>
    </>
  );
}
