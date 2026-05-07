import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { CustomerProfileDto } from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras, SdkForceNetwork } from "@/lib/sdk-fixtures/types";
import { IdentityBar } from "./IdentityBar";
import {
  EntryPointInsight,
  InsightsList,
  RecentActivityInsight,
  UpsellCard,
} from "./Insights";
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
  return (
    <div style={{ position: "relative", background: "var(--bg-shell)", minHeight: "100%" }}>
      <div className="wallet-screen-frame">
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

        <section
          className="wallet-screen-grid"
          data-testid="wallet-screen-grid"
          style={{ marginTop: 18 }}
        >
          <div className="wallet-screen-span-12 wallet-grid-item">
            <IdentityBar
              customer={profile.customer}
              metrics={profile.metrics}
              dataMode={dataMode}
              sdkExtras={sdkExtras}
            />
          </div>

          <section
            aria-label="Wallet supporting summaries"
            className="wallet-screen-span-12 wallet-support-grid"
          >
            <div className="wallet-grid-item">
              <EntryPointInsight
                metrics={profile.metrics}
                dataMode={dataMode}
                sdkExtras={sdkExtras}
              />
            </div>
            <div className="wallet-grid-item">
              <RecentActivityInsight
                metrics={profile.metrics}
                providers={profile.providers}
              />
            </div>
            <div className="wallet-grid-item">
              <InsightsList insights={profile.insights} />
            </div>
          </section>

          <section
            aria-label="Wallet evidence area"
            className="wallet-screen-span-12 wallet-evidence-grid"
          >
            <section
              aria-label="Wallet upsell opportunity"
              className="wallet-screen-span-12 wallet-grid-item wallet-evidence-upsell"
            >
              <UpsellCard
                address={profile.customer.address}
                metrics={profile.metrics}
                dataMode={dataMode}
                sdkExtras={sdkExtras}
              />
            </section>

            <WalletInteractive
              address={profile.customer.address}
              timeline={profile.timeline}
              providers={profile.providers}
              dataMode={dataMode}
              sdkExtras={sdkExtras}
              sdkForceNetwork={sdkForceNetwork}
            />
          </section>
        </section>
      </div>
    </div>
  );
}
