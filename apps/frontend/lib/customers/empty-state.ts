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
  const isPaySh = provider.catalogSource === "pay_sh_curated";
  const isMpp = provider.catalogSource === "mpp_registry";
  let body =
    "The current on-chain read model has not observed payer wallets for this payment target yet.";
  if (isPaySh) {
    body =
      "This provider is available in the Pay.sh catalog, but the current on-chain read model has not observed payer wallets for this specific chain / asset / payTo target.";
  } else if (isMpp) {
    body =
      "This provider was discovered via the MPP services registry. We have not yet correlated on-chain payments to this specific chain / asset / payTo target.";
  }
  return {
    title: "No live customer facts for this payment target yet",
    body,
    details: [
      `Service: ${provider.serviceId ?? "unknown"}`,
      `Target: ${provider.network} / ${provider.asset}`,
      `payTo: ${provider.payTo}`,
    ],
  };
}
