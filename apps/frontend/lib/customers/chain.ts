import type { CustomerListItemDto } from "@/lib/api/types";

// 現状の BFF /customers は wallet ごとの chain / asset を返さない (analytics.json
// fixture も Base / USDC 単一データセット)。フロント側で固定値を返すヘルパで
// 列とフィルタを成立させ、BFF が per-wallet chain を返すようになったら本関数を
// 削除して DTO を直接読む構造にする。docs/future-work.md
// "Surface per-wallet chain & asset on the Customers list" を参照。

export type CustomerChain = "base" | "solana";

export const CUSTOMER_CHAINS: ReadonlyArray<CustomerChain> = ["base", "solana"];

export type CustomerChainFilter = "all" | CustomerChain;

export type CustomerChainAttribution = {
  chain: CustomerChain;
  asset: string;
};

export function getCustomerChainAttribution(
  _customer: CustomerListItemDto,
): CustomerChainAttribution {
  return { chain: "base", asset: "USDC" };
}

const CHAIN_DISPLAY: Record<CustomerChain, { label: string; short: string; color: string }> = {
  base: { label: "Base", short: "BASE", color: "var(--mesh-blue)" },
  solana: { label: "Solana", short: "SOL", color: "var(--sdk-purple)" },
};

export function describeChain(chain: CustomerChain) {
  return CHAIN_DISPLAY[chain];
}
