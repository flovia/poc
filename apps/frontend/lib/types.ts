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
  protocols?: ("x402" | "MPP")[];
  asset?: string;
  transactionCount?: number;
  uniqueSenderCount?: number;
  hasCustomerFacts?: boolean;
};

export type StoredProvider =
  | (StoredProviderBase & { mode: "simple"; payTo: string; paths?: never })
  | (StoredProviderBase & { mode: "advanced"; paths: StoredProviderPath[]; payTo?: never });
