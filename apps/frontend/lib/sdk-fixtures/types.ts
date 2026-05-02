// Phase 7-8: SDK preview 専用型. 既存 BFF DTO (lib/api/types.ts) は拡張せず別チャネル.
// design.md §3.2 (L1) / §4.

export type SdkAgentType = string;

export type SdkTimelineExtra = {
  // 照合キー: txHash で CustomerTimelineEventDto.txHash と join (timestamp 衝突回避).
  txHash: string;
  apiPath: string;
  amountUsd: number;
  cycleId: number;
  isSelfProvider: boolean;
};

export type SdkUpsellExtra = {
  planName: string;
  projectedMrrUsd: number;
  whyNow: [string, string, string];
};

export type Sdk7dVolumePoint = {
  day: string;
  observationCount: number;
  amountUsd: number;
};

// 副役 wallet も同じ型を使う. 主役だけが持つフィールドは nullable / 空配列許容.
export type SdkExtras = {
  address: string;
  agentType: SdkAgentType;
  totalSpendUsd: number;
  growth7d: number;
  freeTierProgress: number;
  monthlyReqGrowth: number;
  entryPointPctText: string | null;
  timelineExtras: SdkTimelineExtra[];
  upsell: SdkUpsellExtra | null;
  sparkline7d: Sdk7dVolumePoint[];
  usedEndpointsTopK: string[];
};

// Force-directed network のノード位置は静的 (design.md §H1).
export type SdkForceNetworkNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  role: "center" | "satellite";
};

export type SdkForceNetworkEdge = {
  from: string;
  to: string;
  weight: number;
};

export type SdkForceNetwork = {
  nodes: SdkForceNetworkNode[];
  edges: SdkForceNetworkEdge[];
};
