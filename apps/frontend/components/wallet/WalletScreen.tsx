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
      <div style={{ position: "relative", padding: "28px 40px 80px", maxWidth: 1500, margin: "0 auto" }}>
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
          aria-label="Wallet profile overview"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 16,
            padding: "16px 18px",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "linear-gradient(135deg, var(--surface-card), var(--surface-subtle))",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Wallet profile
            </div>
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>
              Payment, agent, and provider context for this wallet
            </h1>
            <p style={{ margin: "6px 0 0", maxWidth: 820, color: "var(--text-3)", fontSize: 14 }}>
              This is not a block explorer link. It combines this payer wallet&apos;s spend
              history, SDK-reported AI agent activity, endpoint usage, and cross-provider
              network signals into one customer intelligence view.
            </p>
          </div>
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "flex-end",
              paddingTop: 4,
              color: "var(--text-3)",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <span className="chip blue">Spend</span>
            <span>+</span>
            <span className="chip teal">Agents</span>
            <span>+</span>
            <span className="chip mute">Providers</span>
          </div>
        </section>

        <IdentityBar
          customer={profile.customer}
          metrics={profile.metrics}
          dataMode={dataMode}
          sdkExtras={sdkExtras}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
            gap: 18,
            marginTop: 18,
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

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <UpsellCard
              address={profile.customer.address}
              metrics={profile.metrics}
              dataMode={dataMode}
              sdkExtras={sdkExtras}
            />
            <EntryPointInsight metrics={profile.metrics} dataMode={dataMode} sdkExtras={sdkExtras} />
            <RecentActivityInsight metrics={profile.metrics} providers={profile.providers} />
            <InsightsList insights={profile.insights} />
          </div>
        </div>
      </div>
    </div>
  );
}
