import type { CustomerListItemDto, UpsellOpportunity } from "@/lib/api/types";
import { getCustomerChainAttribution, type CustomerChainFilter } from "./chain";

export type CustomerSortKey = "spend" | "observations" | "lastSeen";

export type CustomerUpsellFilter = "all" | UpsellOpportunity;

export type CustomerFilterState = {
  query: string;
  sort: CustomerSortKey;
  upsell: CustomerUpsellFilter;
  chain: CustomerChainFilter;
};

export const DEFAULT_CUSTOMER_FILTER: CustomerFilterState = {
  query: "",
  sort: "spend",
  upsell: "all",
  chain: "all",
};

const compareBigIntDesc = (a: string, b: string): number => {
  const ba = BigInt(a);
  const bb = BigInt(b);
  if (ba === bb) return 0;
  return ba > bb ? -1 : 1;
};

const sortComparators: Record<
  CustomerSortKey,
  (a: CustomerListItemDto, b: CustomerListItemDto) => number
> = {
  spend: (a, b) => compareBigIntDesc(a.spendAtomic, b.spendAtomic),
  observations: (a, b) => b.observationCount - a.observationCount,
  lastSeen: (a, b) => b.lastSeenAt - a.lastSeenAt,
};

const compareSolanaFirst = (a: CustomerListItemDto, b: CustomerListItemDto): number => {
  const aHasSolana = getCustomerChainAttribution(a).chains.includes("solana");
  const bHasSolana = getCustomerChainAttribution(b).chains.includes("solana");
  if (aHasSolana === bHasSolana) return 0;
  return aHasSolana ? -1 : 1;
};

export function filterAndSortCustomers(
  customers: readonly CustomerListItemDto[],
  state: CustomerFilterState,
): CustomerListItemDto[] {
  const trimmedQuery = state.query.trim().toLowerCase();
  const filtered = customers.filter((c) => {
    if (state.upsell !== "all" && c.upsellOpportunity !== state.upsell) return false;
    if (trimmedQuery.length > 0 && !c.address.toLowerCase().includes(trimmedQuery)) return false;
    if (state.chain !== "all" && !getCustomerChainAttribution(c).chains.includes(state.chain)) {
      return false;
    }
    return true;
  });
  return [...filtered].sort(
    (a, b) => compareSolanaFirst(a, b) || sortComparators[state.sort](a, b),
  );
}
