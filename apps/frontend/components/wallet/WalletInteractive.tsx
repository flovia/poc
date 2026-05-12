"use client";

import { useMemo } from "react";
import { useProviders } from "@/app/providers";
import type {
  CustomerProviderUsageDto,
  CustomerTimelineEventDto,
} from "@/lib/api/types";
import type { DashboardMode } from "@/lib/data-mode";
import type { SdkExtras, SdkForceNetwork } from "@/lib/sdk-fixtures/types";
import { ActivityTimeline } from "./ActivityTimeline";
import { CoUsageRanking } from "./CoUsageRanking";
import { SdkForceNetworkChart } from "./SdkForceNetworkChart";
import { WorkflowSummaryStrip } from "./WorkflowSummaryStrip";

type Props = {
  address: string;
  timeline: CustomerTimelineEventDto[];
  providers: CustomerProviderUsageDto[];
  dataMode: DashboardMode;
  sdkExtras: SdkExtras | null;
  sdkForceNetwork: SdkForceNetwork | null;
};

// Wallet 360° の左カラム (Workflow Summary Strip + Activity Timeline) を
// client コンポーネントとして括り出すラッパ。useProviders() で localStorage
// 由来の StoredProvider を取得し、API path 解決と provider 名表示の両方で
// 子コンポーネントが共有するための payToByProviderId Map をここで構築する。
export function WalletInteractive({
  address,
  timeline,
  providers,
  dataMode,
  sdkExtras,
  sdkForceNetwork,
}: Props) {
  const { stored } = useProviders();

  const payToByProviderId = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of providers) {
      map.set(provider.providerId, provider.payToWallet);
    }
    return map;
  }, [providers]);

  const apiPathsByProviderId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const provider of providers) {
      if (provider.apiPaths?.length) map.set(provider.providerId, provider.apiPaths);
    }
    return map;
  }, [providers]);

  const isSdkProtagonist =
    dataMode === "sdkConnected" && sdkExtras !== null && sdkExtras.upsell !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <WorkflowSummaryStrip
        timeline={timeline}
        providers={providers}
        payToByProviderId={payToByProviderId}
        apiPathsByProviderId={apiPathsByProviderId}
        storedProviders={stored}
        dataMode={dataMode}
        sdkExtras={sdkExtras}
      />
      <ActivityTimeline
        timeline={timeline}
        providers={providers}
        payToByProviderId={payToByProviderId}
        apiPathsByProviderId={apiPathsByProviderId}
        storedProviders={stored}
        dataMode={dataMode}
        sdkExtras={sdkExtras}
      />
      <CoUsageRanking address={address} providers={providers} />
      {isSdkProtagonist && sdkForceNetwork && (
        <SdkForceNetworkChart network={sdkForceNetwork} />
      )}
    </div>
  );
}
