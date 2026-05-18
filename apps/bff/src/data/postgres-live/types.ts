export type ProviderRow = {
  network: string;
  asset: string;
  payTo: string;
  serviceId: string;
  serviceName: string;
  catalogSource: "base_curated" | "pay_sh_curated" | "raw_x402";
  resources: Array<{
    resource: string;
    network?: string;
    asset?: string;
    amountAtomic?: string;
    description?: string;
    method?: string;
    inputSchema?: unknown;
    lastUpdated?: string;
    x402Version?: number;
    l30DaysTotalCalls?: number;
    l30DaysUniquePayers?: number;
    transactionCount?: number;
    totalAmountAtomic?: string;
  }>;
  title?: string;
  description?: string;
  useCase?: string;
  category?: string;
  serviceUrl?: string;
  hasMetering?: boolean;
  hasFreeTier?: boolean;
  providerSha?: string;
  registryVersion?: string;
  registryGeneratedAt?: string;
  registrySourceUrl?: string;
  offers: Array<{
    protocol: "x402" | "MPP";
    chain: string;
    asset: string;
    payToAddress: string;
    probePriceUsd?: number;
  }>;
  protocol?: "x402" | "MPP";
  chain?: string;
  assetSymbol?: string;
  priceRangeUsd?: { min: number; max: number };
  payShProviderFqn?: string;
  endpointCount?: number;
  transactionCount: number;
  uniqueSenderCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type CustomerRow = {
  network: string;
  asset: string;
  payer: string;
  payTo: string;
  serviceId: string;
  serviceName: string;
  transactionCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type CustomerAggregate = {
  payer: string;
  transactionCount: number;
  totalVolumeAtomic: string;
  firstSeenAt: string;
  lastSeenAt: string;
  providers: CustomerRow[];
};
