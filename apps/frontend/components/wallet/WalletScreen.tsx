import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { CustomerProfileDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras, SdkForceNetwork } from "@/lib/sdk-fixtures/types";
import { IdentityBar } from "./IdentityBar";
import { WalletInteractive } from "./WalletInteractive";

type WalletScreenProps = {
  profile: CustomerProfileDto;
  providerId: string;
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
  sdkForceNetwork: SdkForceNetwork | null;
};

export function WalletScreen({
  profile,
  providerId,
  dataMode,
  sdkExtras,
  sdkForceNetwork,
}: WalletScreenProps) {
  const activity = {
    paymentCount: profile.providers.reduce((total, provider) => total + provider.transactionCount, 0),
    providerCount: profile.providers.length,
  };

  return (
    <div style={{ position: "relative", background: "var(--bg-shell)", minHeight: "100%" }}>
      <div className="wallet-screen-pad">
        <Link
          href={`/providers/${providerId}/customers`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-3)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <Icon.back width="13" height="13" /> All customers
        </Link>

        <IdentityBar
          customer={profile.customer}
          metrics={profile.metrics}
          activity={activity}
          dataMode={dataMode}
          sdkExtras={sdkExtras}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 18,
            marginTop: 18,
            minWidth: 0,
          }}
        >
          <WalletInteractive
            address={profile.customer.address}
            timeline={profile.timeline}
            providers={profile.providers}
            dataMode={dataMode}
            sdkExtras={sdkExtras}
            sdkForceNetwork={sdkForceNetwork}
          />
        </div>
      </div>
    </div>
  );
}
