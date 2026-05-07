import { ShowcaseProviderScreen } from "@/components/showcase/ShowcaseProviderScreen";
import { TopBar } from "@/components/shell/TopBar";
import { getServerDashboardMode } from "@/lib/data-mode";

export default async function HitPayMppShowcasePage() {
  const dataMode = await getServerDashboardMode();

  return (
    <>
      <TopBar
        fallbackProviderName="Flovia"
        crumbs={[{ label: "MPP Showcase", href: "/showcase" }, { label: "HitPay MPP" }]}
        dataMode={dataMode}
      />
      <ShowcaseProviderScreen provider="hitpay" />
    </>
  );
}
