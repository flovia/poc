import type { ProviderCatalogItemDto } from "@/lib/api/types";

export type CustomerFactsNotice = {
  title: string;
  body: string;
  details: string[];
};

export function buildNoCustomerFactsNotice(
  provider: Pick<
    ProviderCatalogItemDto,
    "asset" | "catalogSource" | "hasCustomerFacts" | "network" | "payTo" | "serviceId"
  >,
  customerCount: number,
): CustomerFactsNotice | null {
  if (customerCount > 0 || provider.hasCustomerFacts) return null;
  const isCatalogOnly = provider.catalogSource === "pay_sh_curated";
  return {
    title: "No live customer facts for this payment target yet",
    body: isCatalogOnly
      ? "This provider is available in the Pay.sh catalog, but the current on-chain read model has not observed payer wallets for this specific chain / asset / payTo target."
      : "The current on-chain read model has not observed payer wallets for this payment target yet.",
    details: [
      `Service: ${provider.serviceId ?? "unknown"}`,
      `Target: ${provider.network} / ${provider.asset}`,
      `payTo: ${provider.payTo}`,
    ],
  };
}
