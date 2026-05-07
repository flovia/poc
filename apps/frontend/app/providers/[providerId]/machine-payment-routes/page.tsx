import { MachinePaymentRoutesScreen } from "@/components/machine-payment-routes/MachinePaymentRoutesScreen";
import { TopBar } from "@/components/shell/TopBar";
import { getRouteAnalyticsSummary } from "@/lib/api/client";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function MachinePaymentRoutesPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const pageCtx = await getTopBarPageContext();
  const summary = await getRouteAnalyticsSummary();

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[{ label: "Machine Payment Routes" }]}
        dataMode={pageCtx.dataMode}
        onboarding={{
          id: "machine-payment-routes",
          title: "Compare machine-payment routes",
          description:
            "See how x402, Stripe MPP, and HitPay MPP map payment receipts to retained API workflow demand.",
          metrics: [
            {
              label: "Payment rails",
              description: "Compare x402 public settlement with provider-attested MPP routes.",
              icon: "activity",
            },
            {
              label: "Route Sankey",
              description: "Read the source route → payment rail → API workflow structure.",
              icon: "spark",
            },
            {
              label: "Visibility",
              description: "Separate public onchain, provider-attested, and demo provenance.",
              icon: "external",
            },
          ],
          note: "P0 keeps existing x402 drilldowns intact while adding a generic route analytics layer for multi-rail demos.",
        }}
      />
      <div className="scroll">
        <MachinePaymentRoutesScreen providerId={providerId} summary={summary} />
      </div>
    </>
  );
}
