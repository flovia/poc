import type { ProviderCatalogSource } from "contracts";

// UI 上の "プロバイダ識別子" は localStorage に保存される表示用エンティティ。
// PoC の BFF は payer wallet 単位の customer projection のみを返し、
// provider 単位のスコープ分割は行わないため、`providerId` はサイドバー上の
// 表示識別子としてのみ機能する。

export type ProviderId = string;

export type StoredProviderMode = "simple" | "advanced";

export type StoredProviderPath = {
  apiPath: string;
  payTo: string;
};

type StoredProviderBase = {
  providerId: ProviderId;
  name: string;
  createdAt: number;
  source?: "user" | "demo" | "generated";
  serviceId?: string;
  serviceName?: string;
  network?: string;
  networks?: string[];
  catalogSource?: ProviderCatalogSource;
  /**
   * 集約 (brand-key dedup) で1枚のカードにまとまった元 row の catalogSource 集合。
   * 例: AgentMail の場合 ["pay_sh_curated", "mpp_registry"] の両方を持つので
   * カード上で Pay.sh と MPP の両方のバッジを出せる。
   */
  catalogSources?: ProviderCatalogSource[];
  protocols?: ("x402" | "MPP")[];
  asset?: string;
  /** BFF-side `ProviderCatalogRow.serviceUrl` (the provider's API base URL).
   * Used by the avatar to resolve a brand favicon when no curated map entry exists. */
  serviceUrl?: string;
  transactionCount?: number;
  uniqueSenderCount?: number;
  hasCustomerFacts?: boolean;
};

export type StoredProvider =
  | (StoredProviderBase & { mode: "simple"; payTo: string; paths?: never })
  | (StoredProviderBase & { mode: "advanced"; paths: StoredProviderPath[]; payTo?: never });
