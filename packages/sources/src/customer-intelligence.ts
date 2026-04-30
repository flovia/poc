import type { CdpResource, SourceCoverage } from "contracts";
import { normalizeAsset, normalizeNetwork, normalizePayTo, paymentIdentityKey } from "contracts";

export type CustomerPortfolioUnavailableResult = {
  sourceCoverage: SourceCoverage;
};

export const findCdpResourcesByPaymentOption = (
  resources: CdpResource[],
  identity: { network: string; asset: string; payTo: string },
): CdpResource[] => {
  const key = paymentIdentityKey({
    network: normalizeNetwork(identity.network),
    asset: normalizeAsset(identity.asset),
    payTo: normalizePayTo(identity.payTo),
  });
  return resources.filter((resource) =>
    resource.paymentOptions.some((option) => paymentIdentityKey(option) === key),
  );
};

export const unavailablePortfolioSource = (
  reason = "portfolio source not configured",
): CustomerPortfolioUnavailableResult => ({
  sourceCoverage: {
    source: "portfolio",
    status: "unavailable",
    unavailableReason: reason,
  },
});
