import type { WalletUsageGraphDto } from "@/lib/api/types";

export type OpportunityLevel = "high" | "medium" | "low";

export type OtherServiceCandidateEndpoint = {
  serviceName: string;
  sharedTxCount: number;
  sharedWallets: number;
};

export type OtherServiceCandidatePayer = {
  wallet: string;
  sharedTxCount: number;
};

export type OtherServiceCandidateRow = {
  providerId: string;
  providerName: string;
  serviceName: string;
  payToWallet: string | null;
  sharedWallets: number;
  sharedTxCount: number;
  confidence: number;
  opportunity: OpportunityLevel;
  endpoints: OtherServiceCandidateEndpoint[];
  payerWallets: OtherServiceCandidatePayer[];
};

export type AggregateOptions = {
  ownPayTo: string | undefined;
  resolveProviderName?: (payToWallet: string) => string | null;
};

const opportunityFor = (confidence: number): OpportunityLevel => {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
};

const normalize = (value: string | null | undefined) =>
  value ? value.toLowerCase() : "";

const EVM_ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i;

const looksLikeAddress = (value: string) => EVM_ADDRESS_PATTERN.test(value.trim());

const hostnameFromService = (serviceName: string): string | null => {
  try {
    return new URL(serviceName).hostname;
  } catch {
    return null;
  }
};

const displayProviderName = (
  rawName: string,
  serviceName: string,
  resolved: string | null,
): string => {
  if (resolved) return resolved;
  if (!looksLikeAddress(rawName)) return rawName;
  return hostnameFromService(serviceName) ?? rawName;
};

type EndpointAcc = {
  serviceName: string;
  txTotal: number;
  walletSet: Set<string>;
};

type ProviderAcc = {
  providerId: string;
  providerName: string;
  serviceName: string;
  payToWallet: string;
  walletSet: Set<string>;
  txTotal: number;
  confidenceSum: number;
  confidenceCount: number;
  endpointsByService: Map<string, EndpointAcc>;
  payerTxByWallet: Map<string, number>;
};

export const aggregateOtherServiceCandidates = (
  graph: WalletUsageGraphDto,
  { ownPayTo, resolveProviderName }: AggregateOptions,
): OtherServiceCandidateRow[] => {
  const own = normalize(ownPayTo);
  const accByPayTo = new Map<string, ProviderAcc>();

  for (const provider of graph.providerWallets) {
    for (const payer of provider.payerWallets) {
      const payerLower = payer.wallet.toLowerCase();
      for (const candidate of payer.otherServiceCandidates) {
        const candidatePayTo = normalize(candidate.payToWallet);
        if (!candidatePayTo) continue;
        if (own && candidatePayTo === own) continue;

        const key = candidatePayTo;
        let acc = accByPayTo.get(key);
        if (!acc) {
          acc = {
            providerId: candidate.providerId,
            providerName: candidate.providerName,
            serviceName: candidate.serviceName,
            payToWallet: candidatePayTo,
            walletSet: new Set(),
            txTotal: 0,
            confidenceSum: 0,
            confidenceCount: 0,
            endpointsByService: new Map(),
            payerTxByWallet: new Map(),
          };
          accByPayTo.set(key, acc);
        }
        acc.walletSet.add(payerLower);
        acc.txTotal += candidate.coUsageCount;
        acc.confidenceSum += candidate.confidence;
        acc.confidenceCount += 1;

        const endpointKey = candidate.serviceName;
        let endpoint = acc.endpointsByService.get(endpointKey);
        if (!endpoint) {
          endpoint = {
            serviceName: candidate.serviceName,
            txTotal: 0,
            walletSet: new Set(),
          };
          acc.endpointsByService.set(endpointKey, endpoint);
        }
        endpoint.txTotal += candidate.coUsageCount;
        endpoint.walletSet.add(payerLower);

        acc.payerTxByWallet.set(
          payerLower,
          (acc.payerTxByWallet.get(payerLower) ?? 0) + candidate.coUsageCount,
        );
      }
    }
  }

  const rows: OtherServiceCandidateRow[] = [];
  for (const acc of accByPayTo.values()) {
    const avgConfidence = acc.confidenceCount > 0 ? acc.confidenceSum / acc.confidenceCount : 0;
    const resolvedName = resolveProviderName ? resolveProviderName(acc.payToWallet) : null;
    const endpoints: OtherServiceCandidateEndpoint[] = [...acc.endpointsByService.values()]
      .map((e) => ({
        serviceName: e.serviceName,
        sharedTxCount: e.txTotal,
        sharedWallets: e.walletSet.size,
      }))
      .sort((a, b) => {
        if (b.sharedTxCount !== a.sharedTxCount) return b.sharedTxCount - a.sharedTxCount;
        return b.sharedWallets - a.sharedWallets;
      });

    const topEndpointName = endpoints[0]?.serviceName ?? acc.serviceName;
    const payerWallets: OtherServiceCandidatePayer[] = [...acc.payerTxByWallet.entries()]
      .map(([wallet, sharedTxCount]) => ({ wallet, sharedTxCount }))
      .sort((a, b) => {
        if (b.sharedTxCount !== a.sharedTxCount) return b.sharedTxCount - a.sharedTxCount;
        return a.wallet.localeCompare(b.wallet);
      });
    rows.push({
      providerId: acc.providerId,
      providerName: displayProviderName(acc.providerName, topEndpointName, resolvedName),
      serviceName: topEndpointName,
      payToWallet: acc.payToWallet,
      sharedWallets: acc.walletSet.size,
      sharedTxCount: acc.txTotal,
      confidence: Number(avgConfidence.toFixed(2)),
      opportunity: opportunityFor(avgConfidence),
      endpoints,
      payerWallets,
    });
  }

  rows.sort((a, b) => {
    if (b.sharedWallets !== a.sharedWallets) return b.sharedWallets - a.sharedWallets;
    return b.sharedTxCount - a.sharedTxCount;
  });

  return rows;
};
