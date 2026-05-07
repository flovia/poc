import { ShowcaseOverviewScreen } from "@/components/showcase/ShowcaseOverviewScreen";
import { TopBar } from "@/components/shell/TopBar";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function ShowcasePage() {
  const dataMode = await getServerDashboardMode();

  return (
    <>
      <TopBar
        fallbackProviderName="Flovia"
        crumbs={[{ label: "MPP Showcase" }]}
        dataMode={dataMode}
        onboarding={{
          id: "mpp-showcase",
          title: "Show paid API analytics",
          description:
            "Compare Stripe MPP and HitPay MPP flows with one Flovia wrapper around each paid API endpoint.",
          metrics: [
            {
              label: "One wrapper",
              description: "Route-level Flovia tracking surrounds each MPP-protected endpoint.",
              icon: "spark",
            },
            {
              label: "Simulated flow",
              description: "Always-available demo events explain the join model without live keys.",
              icon: "activity",
            },
            {
              label: "Live call",
              description: "The browser calls BFF-hosted showcase paid endpoints under /showcase/*.",
              icon: "external",
            },
          ],
          note: "The BFF hosts the PoC paid API endpoints; no separate provider server is required.",
        }}
      />
      <ShowcaseOverviewScreen />
    </>
  );
}
