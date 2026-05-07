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
import { WorkflowIntentPanel } from "./WorkflowIntentPanel";
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

  const isSdkProtagonist =
    dataMode === "sdkConnected" && sdkExtras !== null && sdkExtras.upsell !== null;
  const showWorkflowSummary =
    dataMode === "sdkConnected" && timeline.some((event) => event.type === "payment");
  const showCoUsage = providers.length > 0;
  const timelineClass = "wallet-screen-span-12 wallet-grid-item wallet-evidence-timeline";

  return (
    <>
      <section
        data-testid="wallet-evidence-workflow-intent"
        className="wallet-screen-span-6 wallet-grid-item wallet-evidence-workflow-intent"
      >
        <WorkflowIntentPanel address={address} />
      </section>
      {showWorkflowSummary && (
        <section className="wallet-screen-span-12 wallet-grid-item">
          <WorkflowSummaryStrip
            timeline={timeline}
            providers={providers}
            payToByProviderId={payToByProviderId}
            storedProviders={stored}
            dataMode={dataMode}
            sdkExtras={sdkExtras}
          />
        </section>
      )}
      {showCoUsage && (
        <section
          aria-label="Co-usage evidence"
          data-testid="wallet-evidence-co-usage"
          className="wallet-screen-span-12 wallet-grid-item wallet-evidence-co-usage"
        >
          <CoUsageRanking address={address} providers={providers} />
        </section>
      )}
      <section
        aria-label="Activity timeline evidence"
        data-testid="wallet-evidence-timeline"
        className={timelineClass}
      >
        <ActivityTimeline
          timeline={timeline}
          providers={providers}
          payToByProviderId={payToByProviderId}
          storedProviders={stored}
          dataMode={dataMode}
          sdkExtras={sdkExtras}
        />
      </section>
      {isSdkProtagonist && sdkForceNetwork && (
        <section className="wallet-screen-span-12 wallet-grid-item">
          <SdkForceNetworkChart network={sdkForceNetwork} />
        </section>
      )}
    </>
  );
}
