import enrichmentSnapshots from "@/data/provider-enrichment-snapshots.json";

type ProviderEnrichmentLike = {
  providerId?: string;
  name?: string;
  payTo?: string;
};

export type ProviderBalanceContext = {
  label: "Balance";
  value: string;
};

type ProviderEnrichmentSnapshot = {
  target: {
    payToAddress: string;
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
  const snapshot = snapshots.find((item) => item.target.payToAddress === provider?.payTo);
  const balance = snapshot?.balances.find(
    (item) => item.assetSymbol === snapshot.target.asset && item.decimals !== undefined,
  );
  if (!snapshot || !balance || balance.decimals === undefined) return undefined;
  return {
    label: "Balance",
    value: `${formatTokenAmount(balance.amountBaseUnits, balance.decimals)} ${snapshot.target.asset}`,
  };
}

function formatTokenAmount(amountBaseUnits: string, decimals: number): string {
  const value = Math.trunc((Number(amountBaseUnits) / 10 ** decimals) * 100) / 100;
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}
