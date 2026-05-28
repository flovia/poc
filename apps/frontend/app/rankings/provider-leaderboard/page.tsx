import { ProviderLeaderboardScreen } from "@/components/rankings/ProviderLeaderboardScreen";
import { AppShell } from "@/components/shell/AppShell";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { TopBar } from "@/components/shell/TopBar";
import { getServerDashboardMode } from "@/lib/data-mode";
import { getProviderRanking } from "@/lib/data-source";

export default async function ProviderLeaderboardPage() {
  const [dataMode, transactions, settledAmount] = await Promise.all([
    getServerDashboardMode(),
    getProviderRanking("transactions", 25),
    getProviderRanking("settledAmount", 25),
  ]);

  return (
    <>
      <SdkPreviewNoticeBar />
      <AppShell activeProviderId={undefined} activeRoute="rankings" dataMode={dataMode}>
        <TopBar
          fallbackProviderName="Flovia"
          crumbs={[{ label: "Rankings" }, { label: "Provider Leaderboard" }]}
          dataMode={dataMode}
          onboarding={{
            id: "provider-leaderboard",
            title: "Rank observed API providers",
            description:
              "Compare observed paid API providers by payment transactions and settled amount from the loaded snapshot.",
            metrics: [
              {
                label: "Observed scope",
                description: "The leaderboard ranks providers currently present in the snapshot, not the entire market.",
                icon: "external",
              },
              {
                label: "Payment txns",
                description: "Transaction count means observed payment transactions, not API request events.",
                icon: "activity",
              },
              {
                label: "Settled amount",
                description: "Volume uses settled atomic payment amounts reported by the provider read model.",
                icon: "spark",
              },
            ],
          }}
        />
        <ProviderLeaderboardScreen transactions={transactions} settledAmount={settledAmount} />
      </AppShell>
    </>
  );
}
