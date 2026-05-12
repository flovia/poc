import enrichmentSnapshots from "@/data/provider-enrichment-snapshots.json";

type ProviderEnrichmentLike = {
  providerId?: string;
  name?: string;
  payTo?: string;
  network?: string;
  asset?: string;
};

export type ProviderBalanceContext = {
  label: "Balance";
  value: string;
};

type ProviderEnrichmentSnapshot = {
  target: {
    payToAddress: string;
    chain?: string;
    asset: string;
  };
  balances: Array<{
    assetSymbol?: string;
    amountBaseUnits: string;
    decimals?: number;
  }>;
};

const snapshots = enrichmentSnapshots as ProviderEnrichmentSnapshot[];

export function getProviderBalanceContext(
  provider: ProviderEnrichmentLike | undefined,
): ProviderBalanceContext | undefined {
  const snapshot = findBestSnapshot(provider);
  const balance = snapshot?.balances.find(
    (item) => item.assetSymbol === snapshot.target.asset && item.decimals !== undefined,
  );
  if (!snapshot || !balance || balance.decimals === undefined) return undefined;
  return {
    label: "Balance",
    value: `${formatTokenAmount(balance.amountBaseUnits, balance.decimals)} ${snapshot.target.asset}`,
  };
}

function findBestSnapshot(
  provider: ProviderEnrichmentLike | undefined,
): ProviderEnrichmentSnapshot | undefined {
  const payTo = provider?.payTo?.toLowerCase();
  if (!payTo) return undefined;
  const candidates = snapshots.filter((item) => item.target.payToAddress.toLowerCase() === payTo);
  if (candidates.length <= 1) return candidates[0];
  const providerChain = normalizeChain(provider?.network);
  const providerAsset = normalizeAsset(provider?.asset);
  return (
    candidates.find(
      (item) =>
        normalizeChain(item.target.chain) === providerChain &&
        normalizeAsset(item.target.asset) === providerAsset,
    ) ?? candidates[0]
  );
}

function normalizeChain(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("solana")) return "solana";
  if (normalized === "base") return "base";
  return normalized;
}

function normalizeAsset(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") return "USDC";
  return value.toUpperCase();
}

function formatTokenAmount(amountBaseUnits: string, decimals: number): string {
  const value = Math.trunc((Number(amountBaseUnits) / 10 ** decimals) * 100) / 100;
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}
