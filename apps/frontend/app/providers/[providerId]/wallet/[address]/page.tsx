import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { WalletScreen } from "@/components/wallet/WalletScreen";
import {
  getCustomerProfile,
  getSdkExtras,
  getSdkForceNetwork,
  SDK_PROTAGONIST_ADDRESS,
} from "@/lib/data-source";
import { getTopBarPageContext } from "@/lib/server/page-context";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ providerId: string; address: string }>;
}) {
  const { providerId, address } = await params;
  const decoded = decodeURIComponent(address);
  const [profile, sdkExtras, sdkForceNetwork, pageCtx] = await Promise.all([
    getCustomerProfile(decoded),
    getSdkExtras(decoded),
    getSdkForceNetwork(decoded),
    getTopBarPageContext(),
  ]);

  if (!profile) {
    if (pageCtx.dataMode === "sdkConnected") {
      // SDK connected モード時は fixture 未収録のアドレスでも主役 wallet に寄せる。
      redirect(`/providers/${providerId}/wallet/${encodeURIComponent(SDK_PROTAGONIST_ADDRESS)}`);
    }
    return (
      <>
        <TopBar
          providerId={providerId}
          crumbs={[
            { label: "Customers", href: `/providers/${providerId}/customers` },
            { label: decoded },
          ]}
          dataMode={pageCtx.dataMode}
          updatedAtUnixSec={pageCtx.updatedAtUnixSec}
          renderedAtUnixSec={pageCtx.renderedAtUnixSec}
        />
        <div className="scroll">
          <div style={{ padding: "40px", color: "var(--text-2)" }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Wallet not found</h1>
            <p style={{ marginBottom: 16, color: "var(--text-3)", fontSize: 14 }}>
              The BFF returned 404 for this address. It may not appear in the current customer
              projection.
            </p>
            <p>
              <Link href={`/providers/${providerId}/customers`} style={{ color: "var(--mesh-blue)" }}>
                Back to customers
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[
          { label: "Customers", href: `/providers/${providerId}/customers` },
          { label: decoded },
        ]}
        dataMode={pageCtx.dataMode}
        updatedAtUnixSec={pageCtx.updatedAtUnixSec}
        renderedAtUnixSec={pageCtx.renderedAtUnixSec}
      />
      <div className="scroll">
        <WalletScreen
          profile={profile}
          providerId={providerId}
          dataMode={pageCtx.dataMode}
          sdkExtras={sdkExtras}
          sdkForceNetwork={sdkForceNetwork}
        />
      </div>
    </>
  );
}
