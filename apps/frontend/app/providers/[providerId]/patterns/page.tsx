import { TopBar } from "@/components/shell/TopBar";
import { PatternsScreen } from "@/components/patterns/PatternsScreen";
import { getWalletUsageGraph } from "@/lib/api/client";

export default async function PatternsPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const graph = await getWalletUsageGraph();

  return (
    <>
      <TopBar providerId={providerId} crumbs={[{ label: "Co-usage Patterns" }]} />
      <div className="scroll">
        <PatternsScreen graph={graph} providerId={providerId} />
      </div>
    </>
  );
}
