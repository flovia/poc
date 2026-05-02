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
        onboarding={{
          id: "api-growth",
          title: "Track API growth intelligence",
          description:
            "Understand where adoption comes from, what users repeat, and where packaging can unlock more growth.",
          metrics: [
            { label: "Source quality", description: "Which channels bring meaningful API activity.", icon: "spark" },
            { label: "Endpoint frequency", description: "What users call often enough to become habits.", icon: "activity" },
            { label: "Repeat usage", description: "Why wallets return after the first interaction.", icon: "repeat" },
            { label: "Growth opportunities", description: "Where to improve activation, packaging, or positioning.", icon: "growth" },
          ],
          note: 'The "API Growth" menu is designed to come alive by connecting your internal data with the Flovia SDK. Until your data is connected, we are showing tentative demo data for reference.',
        }}
      />
      <div className="scroll">
        <ApiGrowthIntelligenceScreen intelligence={intelligence} />
      </div>
    </>
  );
}
