import {
  type PhaseBCustomerListResponse,
  type ProviderCatalogResponse,
  type WalletUsageGraphResponse,
  normalizePaymentRecipientAddress,
  validatePhaseBCustomerListResponse,
} from "contracts";

export const filterCustomersByPayTo = (
  customers: PhaseBCustomerListResponse,
  profilesByPayTo: Map<string, Set<string>> | undefined,
  payTo?: string,
): PhaseBCustomerListResponse => {
  if (!payTo) return annotateCustomerListWithTags(customers);
  const normalized = normalizePaymentRecipientAddress(payTo);
  const allowed = profilesByPayTo?.get(normalized);
  const filtered = allowed
    ? customers.customers.filter((customer) =>
        allowed.has(normalizePaymentRecipientAddress(customer.address)),
      )
    : customers.customers.filter(() => false);
  return annotateCustomerListWithTags(
    validatePhaseBCustomerListResponse({
      ...customers,
      customers: filtered,
      customerCount: filtered.length,
      scope: { ...(customers.scope ?? {}), payTo: normalized },
    }),
  );
};

// Pay.sh タグの確定的割当: solana を使う wallet の概ね 80% に付与する。
// FNV-1a(address) を 100 で剰余して < 80 のとき付与。address だけで決まるので
// ページリロードや fixture 再生成で結果が変わらない。
const SOLANA_PAYSH_BUCKET_SIZE = 100;
const SOLANA_PAYSH_THRESHOLD = 80;
const SOLANA_PAYSH_SALT = "pay.sh:solana";

const fnv1aHash = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const SOLANA_BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const isSolanaCustomer = (customer: {
  chains?: readonly string[];
  address: string;
}): boolean => {
  if (customer.chains?.some((chain) => chain.toLowerCase().includes("solana"))) return true;
  // chains[] が無い (legacy) ケースは address フォーマットで厳密判定する。
  // PaymentRecipientAddressSchema が許容する EVM hex / SPL: / ERC20: は
  // どれも Solana wallet ではないため除外し、Solana base58 形式のみを採る。
  const trimmed = customer.address.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) return false;
  if (trimmed.startsWith("ERC20:") || trimmed.startsWith("SPL:")) return false;
  return SOLANA_BASE58_PATTERN.test(trimmed);
};

export const shouldTagPaySh = (address: string): boolean => {
  const bucket = fnv1aHash(`${SOLANA_PAYSH_SALT}::${address}`) % SOLANA_PAYSH_BUCKET_SIZE;
  return bucket < SOLANA_PAYSH_THRESHOLD;
};

const withDerivedTags = <
  T extends { address: string; chains?: readonly string[]; tags?: readonly string[] },
>(
  customer: T,
): T & { tags: string[] } => {
  const existing = customer.tags ?? [];
  if (!isSolanaCustomer(customer)) return { ...customer, tags: [...existing] };
  if (!shouldTagPaySh(customer.address)) return { ...customer, tags: [...existing] };
  if (existing.includes("Pay.sh")) return { ...customer, tags: [...existing] };
  return { ...customer, tags: [...existing, "Pay.sh"] };
};

const annotateCustomerListWithTags = (
  response: PhaseBCustomerListResponse,
): PhaseBCustomerListResponse =>
  validatePhaseBCustomerListResponse({
    ...response,
    customers: response.customers.map((c) => withDerivedTags(c)),
  });

export const payToMapFromWalletUsageGraph = (walletUsageGraph: WalletUsageGraphResponse) => {
  const map = new Map<string, Set<string>>();
  for (const provider of walletUsageGraph.graph.providerWallets) {
    map.set(
      normalizePaymentRecipientAddress(provider.payToWallet),
      new Set(
        provider.payerWallets.map((wallet) => normalizePaymentRecipientAddress(wallet.address)),
      ),
    );
  }
  return map;
};

type ProviderRowSummary = {
  providerId: string;
  payTo: string;
  network: string;
  asset: string;
};

export const filterCustomersByServiceId = (
  baseCustomers: PhaseBCustomerListResponse,
  providers: ProviderCatalogResponse,
  walletUsageGraph: WalletUsageGraphResponse,
  serviceId: string,
): PhaseBCustomerListResponse => {
  const target = serviceId.trim();
  if (!target) {
    return annotateCustomerListWithTags(
      validatePhaseBCustomerListResponse({
        ...baseCustomers,
        customers: [],
        customerCount: 0,
        scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
      }),
    );
  }

  const matchingRows: ProviderRowSummary[] = [];
  for (const row of providers.providers) {
    if (
      row.serviceId === target ||
      row.providerId === target ||
      (row.title && row.title === target) ||
      row.name === target
    ) {
      matchingRows.push({
        providerId: row.providerId,
        payTo: normalizePaymentRecipientAddress(row.payTo),
        network: row.network,
        asset: row.asset,
      });
    }
  }
  if (matchingRows.length === 0) {
    return annotateCustomerListWithTags(
      validatePhaseBCustomerListResponse({
        ...baseCustomers,
        customers: [],
        customerCount: 0,
        scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
      }),
    );
  }

  // catalog row の providerId は build-fixture で生成された
  // `<slug-url>--<chain>--<asset>--<payTo>` 形式で、walletUsageGraph 側の
  // providerId と完全一致する。これを直接 lookup key として使う。
  const matchingProviderIds = new Set(matchingRows.map((r) => r.providerId));
  const rowsByProviderId = new Map(matchingRows.map((r) => [r.providerId, r] as const));
  const allProviderIdsByAddress = new Map<string, Set<string>>();
  for (const provider of walletUsageGraph.graph.providerWallets) {
    for (const payer of provider.payerWallets) {
      const addrKey = normalizePaymentRecipientAddress(payer.address);
      const providerIds = allProviderIdsByAddress.get(addrKey) ?? new Set<string>();
      providerIds.add(provider.providerId);
      for (const candidate of payer.otherServiceCandidates) {
        providerIds.add(candidate.providerId);
      }
      allProviderIdsByAddress.set(addrKey, providerIds);
    }
  }

  type Aggregate = {
    address: string;
    /** chain ごとにその chain で使われた asset の集合 */
    chainAssetMap: Map<string, Set<string>>;
    /** 一意の providerId 集合 (wallet が実際にヒットした catalog row 数) */
    providerIds: Set<string>;
    spendByAsset: Map<string, bigint>;
    totalSpend: bigint;
    observationCount: number;
    lastSeenAt: string | undefined;
  };

  const aggByAddress = new Map<string, Aggregate>();

  for (const provider of walletUsageGraph.graph.providerWallets) {
    if (!matchingProviderIds.has(provider.providerId)) continue;
    const row = rowsByProviderId.get(provider.providerId);
    if (!row) continue;
    const network = row.network;
    const asset = row.asset;

    for (const payer of provider.payerWallets) {
      const addrKey = normalizePaymentRecipientAddress(payer.address);
      const spendAtomic = BigInt(payer.sharedSpendAtomic);
      const txCount = payer.sharedTransactionCount;
      const lastSeen = payer.lastSeenAt;
      const existing = aggByAddress.get(addrKey);
      if (!existing) {
        aggByAddress.set(addrKey, {
          address: payer.address,
          chainAssetMap: new Map([[network, new Set([asset])]]),
          providerIds: new Set([provider.providerId]),
          spendByAsset: new Map([[asset, spendAtomic]]),
          totalSpend: spendAtomic,
          observationCount: txCount,
          lastSeenAt: lastSeen,
        });
        continue;
      }
      const chainAssets = existing.chainAssetMap.get(network);
      if (chainAssets) {
        chainAssets.add(asset);
      } else {
        existing.chainAssetMap.set(network, new Set([asset]));
      }
      existing.providerIds.add(provider.providerId);
      existing.spendByAsset.set(asset, (existing.spendByAsset.get(asset) ?? 0n) + spendAtomic);
      existing.totalSpend += spendAtomic;
      existing.observationCount += txCount;
      if (lastSeen && (!existing.lastSeenAt || lastSeen > existing.lastSeenAt)) {
        existing.lastSeenAt = lastSeen;
      }
    }
  }

  const aggregated = Array.from(aggByAddress.values()).map((a) => {
    const chainsArr = Array.from(a.chainAssetMap.keys());
    const assetSet = new Set<string>();
    for (const assets of a.chainAssetMap.values()) {
      for (const asset of assets) assetSet.add(asset);
    }
    return {
      address: a.address,
      label: null as string | null,
      observationCount: a.observationCount,
      spendAtomic: a.totalSpend.toString(),
      providerCount:
        allProviderIdsByAddress.get(normalizePaymentRecipientAddress(a.address))?.size ??
        a.providerIds.size,
      lastSeenAt: a.lastSeenAt,
      activityGrowth: 0,
      upsellOpportunity:
        chainsArr.length >= 2
          ? ("high" as const)
          : a.observationCount >= 5
            ? ("medium" as const)
            : ("low" as const),
      chains: chainsArr,
      assets: Array.from(assetSet),
      spendByAsset: Object.fromEntries(
        Array.from(a.spendByAsset.entries()).map(([k, v]) => [k, v.toString()] as const),
      ),
      provenance: "derived_insight" as const,
      provenanceByField: {
        address: "derived_insight",
        spendAtomic: "derived_insight",
        providerCount: "derived_insight",
      },
      reasons: [
        {
          provenance: "derived_insight" as const,
          label: "service-aggregated customer",
          description: `Aggregated across ${matchingRows.length} catalog row(s) sharing serviceId ${target}.`,
        },
      ],
    };
  });

  return annotateCustomerListWithTags(
    validatePhaseBCustomerListResponse({
      ...baseCustomers,
      generatedFrom: `service-aggregated:${target}`,
      customers: aggregated,
      customerCount: aggregated.length,
      scope: { ...(baseCustomers.scope ?? {}), serviceId: target },
    }),
  );
};
