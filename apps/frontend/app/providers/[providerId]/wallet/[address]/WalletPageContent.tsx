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

type WalletPageContentProps = {
  providerId: string;
  address: string;
  walletHrefPrefix: string;
};

export async function WalletPageContent({
  providerId,
  address,
  walletHrefPrefix,
}: WalletPageContentProps) {
  const decoded = decodeURIComponent(address);
  const customersHref = `/providers/${providerId}/customers`;
  const [profile, sdkExtras, sdkForceNetwork, pageCtx] = await Promise.all([
    getCustomerProfile(decoded),
    getSdkExtras(decoded),
    getSdkForceNetwork(decoded),
    getTopBarPageContext(),
  ]);

  if (!profile) {
    if (pageCtx.dataMode === "sdkConnected") {
      // SDK connected モード時は fixture 未収録のアドレスでも主役 wallet に寄せる。
      redirect(`${walletHrefPrefix}/${encodeURIComponent(SDK_PROTAGONIST_ADDRESS)}`);
    }
    return (
      <>
        <TopBar
          providerId={providerId}
          crumbs={[{ label: "Customers", href: customersHref }, { label: decoded }]}
          dataMode={pageCtx.dataMode}
        />
        <div className="scroll">
          <div style={{ padding: "40px", color: "var(--text-2)" }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Wallet not found</h1>
            <p style={{ marginBottom: 16, color: "var(--text-3)", fontSize: 14 }}>
              This address may not appear in the current customer data.
            </p>
            <p>
              <Link href={customersHref} style={{ color: "var(--mesh-blue)" }}>
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
        crumbs={[{ label: "Customers", href: customersHref }, { label: decoded }]}
        dataMode={pageCtx.dataMode}
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
