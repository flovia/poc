import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { CustomerProfileDto } from "@/lib/api/types";
import { ActivityTimeline } from "./ActivityTimeline";
import { IdentityBar } from "./IdentityBar";
import { InsightsList, ProviderUsageList, UpsellCard } from "./Insights";

type WalletScreenProps = {
  profile: CustomerProfileDto;
  providerId: string;
};

export function WalletScreen({ profile, providerId }: WalletScreenProps) {
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
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          <Icon.back width="13" height="13" /> All customers
        </Link>

        <IdentityBar customer={profile.customer} metrics={profile.metrics} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
            gap: 18,
            marginTop: 18,
          }}
        >
          <ActivityTimeline timeline={profile.timeline} />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <UpsellCard metrics={profile.metrics} />
            <ProviderUsageList providers={profile.providers} />
            <InsightsList insights={profile.insights} />
          </div>
        </div>
      </div>
    </div>
  );
}
