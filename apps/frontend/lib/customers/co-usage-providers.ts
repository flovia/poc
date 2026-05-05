import { normalizePaymentRecipientAddress } from "contracts";
import type { CustomerProfileDto, WalletUsageGraphDto } from "@/lib/api/types";

export type OpportunityLevel = "high" | "medium" | "low";

export type CoUsageProviderEndpoint = {
  serviceName: string;
  sharedTxCount: number;
  sharedWallets: number;
};

export type CoUsageProviderPayer = {
  wallet: string;
  sharedTxCount: number;
};

export type CoUsageProviderSankeyCustomer = {
  address: string;
  providerCount: number;
  observationCount: number;
  upsellOpportunity: OpportunityLevel;
  sdkAgentType?: string | null;
  label?: string | null;
};

export type CoUsageProviderTargetCategoryUsage = {
  category: string;
  count: number;
};

export type CoUsageProviderSankeyFlow = {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  fromStep: 0 | 1;
  toStep: 1 | 2;
  occurrences: number;
};

export type CoUsageProviderMetadata = {
  title?: string;
  description?: string;
  useCase?: string;
  category?: string;
  serviceUrl?: string;
  protocol?: "x402" | "MPP";
  chain?: string;
  assetSymbol?: string;
  priceRangeUsd?: { min: number; max: number };
};

export type CoUsageProviderRow = {
  providerId: string;
  providerName: string;
  serviceName: string;
  payToWallet: string | null;
  sharedWallets: number;
  sharedTxCount: number;
  confidence: number;
  opportunity: OpportunityLevel;
  endpoints: CoUsageProviderEndpoint[];
  payerWallets: CoUsageProviderPayer[];
} & CoUsageProviderMetadata;

export type AggregateOptions = {
  ownPayTo: string | undefined;
  resolveProviderName?: (payToWallet: string) => string | null;
  resolveMetadata?: (payToWallet: string) => CoUsageProviderMetadata | null;
};

export type BuildCoUsageProviderSankeyOptions = {
  customersByWallet?: Map<string, CoUsageProviderSankeyCustomer>;
  targetCategoryUsageByWallet?: Map<string, CoUsageProviderTargetCategoryUsage[]>;
  maxProviders?: number;
  maxTargetCategories?: number;
};

const opportunityFor = (confidence: number): OpportunityLevel => {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
};

const normalize = (value: string | null | undefined) =>
  value ? normalizePaymentRecipientAddress(value) : "";

const EVM_ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i;

const looksLikeAddress = (value: string) => EVM_ADDRESS_PATTERN.test(value.trim());

const hostnameFromService = (serviceName: string): string | null => {
  try {
    return new URL(serviceName).hostname;
  } catch {
    return null;
  }
};

const summarizeServiceName = (serviceName: string): string => {
  try {
    const url = new URL(serviceName);
    const segments = url.pathname.split("/").filter(Boolean);
    const host = url.hostname.replace(/^(api|www)\./, "");
    const tail = segments.at(-1) ?? "";
    const summary = tail ? `${host}/${tail}` : host;
    return summary.length > 28 ? `${summary.slice(0, 27)}…` : summary;
  } catch {
    return serviceName.length > 36 ? `${serviceName.slice(0, 35)}…` : serviceName;
  }
};

const TARGET_CATEGORY_FALLBACK = "Observed target usage";

function toNodeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractApiPathFromDescription(description: string): string | null {
  const dotted = description.match(/·\s*(\/\S+)/);
  if (dotted?.[1]) return dotted[1];

  const method = description.match(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/i);
  if (method?.[1]) return method[1];

  const generic = description.match(/(\/[A-Za-z0-9._~!$&'()*+,;=:@/?%-]+)/);
  return generic?.[1] ?? null;
}

export function inferTargetEndpointCategory(apiPath: string): string {
  const normalized = apiPath.toLowerCase().split("?")[0] ?? apiPath.toLowerCase();

  if (/price\/history|\/history$/.test(normalized)) return "Historical price";
  if (/price\/snapshot|\/snapshot$/.test(normalized)) return "Live price snapshot";
  if (/ohlcv|candles?/.test(normalized)) return "OHLCV & candles";
  if (/orderbook|feed/.test(normalized)) return "Orderbook & feeds";
  if (/search|query|lookup|resolve/.test(normalized)) return "Search & query";
  if (/signal|analysis|risk|score/.test(normalized)) return "Signals & analysis";
  if (/message|alert|notify|webhook/.test(normalized)) return "Alerts & delivery";
  if (/swap|trade|execute|transact|checkout/.test(normalized)) return "Execution & actions";

  return TARGET_CATEGORY_FALLBACK;
}

export function buildTargetCategoryUsageByWallet(
  profiles: CustomerProfileDto[],
  ownPayTo: string | undefined,
): Map<string, CoUsageProviderTargetCategoryUsage[]> {
  const own = normalize(ownPayTo);
  const byWallet = new Map<string, CoUsageProviderTargetCategoryUsage[]>();

  for (const profile of profiles) {
    const ownProviderIds = new Set(
      profile.providers
        .filter((provider) => {
          if (!own) return true;
          return normalize(provider.payToWallet) === own;
        })
        .map((provider) => provider.providerId),
    );

    if (ownProviderIds.size === 0) continue;

    const categoryCounts = new Map<string, number>();
    for (const event of profile.timeline) {
      if (!event.providerId || !ownProviderIds.has(event.providerId)) continue;

      const apiPath = extractApiPathFromDescription(event.description);
      if (!apiPath) continue;

      const category = inferTargetEndpointCategory(apiPath);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    if (categoryCounts.size === 0) {
      const fallbackCount = profile.providers
        .filter((provider) => ownProviderIds.has(provider.providerId))
        .reduce((sum, provider) => sum + provider.transactionCount, 0);
      categoryCounts.set(TARGET_CATEGORY_FALLBACK, Math.max(1, fallbackCount));
    }

    byWallet.set(
      profile.customer.address.toLowerCase(),
      [...categoryCounts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => right.count - left.count),
    );
  }

  return byWallet;
}

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

type CoUsageUserSegment = {
  id: string;
  label: string;
  rank: number;
};

const TRADING_BOTS_SEGMENT: CoUsageUserSegment = {
  id: "trading-bots",
  label: "Trading bots",
  rank: 0,
};

const DEVELOPER_AGENTS_SEGMENT: CoUsageUserSegment = {
  id: "developer-agents",
  label: "Developer agents",
  rank: 1,
};

const WORKFLOW_BUILDERS_SEGMENT: CoUsageUserSegment = {
  id: "workflow-builders",
  label: "Workflow builders",
  rank: 2,
};

const HIGH_INTENT_SEGMENT: CoUsageUserSegment = {
  id: "high-intent-power-users",
  label: "High-intent power users",
  rank: 3,
};

const MULTI_PROVIDER_SEGMENT: CoUsageUserSegment = {
  id: "multi-provider-builders",
  label: "Multi-provider builders",
  rank: 4,
};

const SINGLE_PURPOSE_SEGMENT: CoUsageUserSegment = {
  id: "single-purpose-explorers",
  label: "Single-purpose explorers",
  rank: 5,
};

const UNCLASSIFIED_SEGMENT: CoUsageUserSegment = {
  id: "unclassified-wallets",
  label: "Unclassified wallets",
  rank: 6,
};

function classifySdkAgentType(agentType: string): CoUsageUserSegment | null {
  const normalized = agentType.toLowerCase();
  if (normalized.includes("trading bot")) return TRADING_BOTS_SEGMENT;
  if (normalized.includes("workflow") || normalized.includes("n8n")) {
    return WORKFLOW_BUILDERS_SEGMENT;
  }
  if (
    normalized.includes("claude") ||
    normalized.includes("cursor") ||
    normalized.includes("developer")
  ) {
    return DEVELOPER_AGENTS_SEGMENT;
  }
  if (normalized.includes("curl") || normalized.includes("unknown")) {
    return SINGLE_PURPOSE_SEGMENT;
  }
  return null;
}

function classifyCoUsageCustomer(
  customer: CoUsageProviderSankeyCustomer | undefined,
): CoUsageUserSegment {
  if (!customer) return UNCLASSIFIED_SEGMENT;

  if (customer.sdkAgentType) {
    const sdkSegment = classifySdkAgentType(customer.sdkAgentType);
    if (sdkSegment) return sdkSegment;
  }

  if (
    customer.upsellOpportunity === "high" ||
    customer.providerCount >= 3 ||
    customer.observationCount >= 8
  ) {
    return HIGH_INTENT_SEGMENT;
  }

  if (
    customer.upsellOpportunity === "medium" ||
    customer.providerCount >= 2 ||
    customer.observationCount >= 4
  ) {
    return MULTI_PROVIDER_SEGMENT;
  }

  return SINGLE_PURPOSE_SEGMENT;
}

export const aggregateCoUsageProviders = (
  graph: WalletUsageGraphDto,
  { ownPayTo, resolveProviderName, resolveMetadata }: AggregateOptions,
): CoUsageProviderRow[] => {
  const own = normalize(ownPayTo);
  const accByPayTo = new Map<string, ProviderAcc>();

  for (const provider of graph.providerWallets) {
    for (const payer of provider.payerWallets) {
      const payerLower = payer.wallet.toLowerCase();
      for (const candidate of payer.otherServiceCandidates) {
        const rawCandidatePayTo = candidate.payToWallet?.trim() ?? "";
        if (!rawCandidatePayTo) continue;
        const candidatePayToKey = normalizePaymentRecipientAddress(rawCandidatePayTo);
        if (own && candidatePayToKey === own) continue;

        const key = candidatePayToKey;
        let acc = accByPayTo.get(key);
        if (!acc) {
          acc = {
            providerId: candidate.providerId,
            providerName: candidate.providerName,
            serviceName: candidate.serviceName,
            payToWallet: rawCandidatePayTo,
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

  const rows: CoUsageProviderRow[] = [];
  for (const acc of accByPayTo.values()) {
    const avgConfidence = acc.confidenceCount > 0 ? acc.confidenceSum / acc.confidenceCount : 0;
    const resolvedName = resolveProviderName ? resolveProviderName(acc.payToWallet) : null;
    const endpoints: CoUsageProviderEndpoint[] = [...acc.endpointsByService.values()]
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
    const payerWallets: CoUsageProviderPayer[] = [...acc.payerTxByWallet.entries()]
      .map(([wallet, sharedTxCount]) => ({ wallet, sharedTxCount }))
      .sort((a, b) => {
        if (b.sharedTxCount !== a.sharedTxCount) return b.sharedTxCount - a.sharedTxCount;
        return a.wallet.localeCompare(b.wallet);
      });
    const metadata = resolveMetadata ? resolveMetadata(acc.payToWallet) : null;
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
      ...(metadata ?? {}),
    });
  }

  rows.sort((a, b) => {
    if (b.sharedWallets !== a.sharedWallets) return b.sharedWallets - a.sharedWallets;
    return b.sharedTxCount - a.sharedTxCount;
  });

  return rows;
};

export function buildCoUsageProviderSankeyFlows(
  rows: CoUsageProviderRow[],
  {
    customersByWallet,
    targetCategoryUsageByWallet,
    maxProviders = 6,
    maxTargetCategories = 4,
  }: BuildCoUsageProviderSankeyOptions,
): CoUsageProviderSankeyFlow[] {
  const flows: CoUsageProviderSankeyFlow[] = [];

  for (const row of rows.slice(0, maxProviders)) {
    const providerKey = row.payToWallet ?? row.providerId;
    const providerNodeId = `provider:${providerKey}`;
    const segmentTotals = new Map<string, { segment: CoUsageUserSegment; occurrences: number }>();

    for (const payer of row.payerWallets) {
      const customer = customersByWallet?.get(payer.wallet.toLowerCase());
      const segment = classifyCoUsageCustomer(customer);
      const current = segmentTotals.get(segment.id);
      if (current) {
        current.occurrences += payer.sharedTxCount;
        continue;
      }
      segmentTotals.set(segment.id, {
        segment,
        occurrences: payer.sharedTxCount,
      });
    }

    const leftFlows =
      segmentTotals.size > 0
        ? [...segmentTotals.values()]
        : [{ segment: UNCLASSIFIED_SEGMENT, occurrences: row.sharedTxCount }];

    leftFlows
      .sort((left, right) => {
        if (left.segment.rank !== right.segment.rank) return left.segment.rank - right.segment.rank;
        return right.occurrences - left.occurrences;
      })
      .forEach(({ segment, occurrences }) => {
        flows.push({
          from: `segment:${segment.id}`,
          fromLabel: segment.label,
          fromStep: 0,
          to: providerNodeId,
          toLabel: row.providerName,
          toStep: 1,
          occurrences,
        });
      });

    const categoryTotals = new Map<string, number>();

    for (const payer of row.payerWallets) {
      const categoryUsage = targetCategoryUsageByWallet?.get(payer.wallet.toLowerCase());
      if (!categoryUsage || categoryUsage.length === 0) {
        categoryTotals.set(
          TARGET_CATEGORY_FALLBACK,
          (categoryTotals.get(TARGET_CATEGORY_FALLBACK) ?? 0) + payer.sharedTxCount,
        );
        continue;
      }

      const totalCount = categoryUsage.reduce((sum, item) => sum + item.count, 0);
      if (totalCount <= 0) continue;

      for (const usage of categoryUsage) {
        const apportioned = (payer.sharedTxCount * usage.count) / totalCount;
        categoryTotals.set(usage.category, (categoryTotals.get(usage.category) ?? 0) + apportioned);
      }
    }

    const rankedCategories = [...categoryTotals.entries()]
      .map(([category, total]) => ({
        category,
        total: Number(total.toFixed(2)),
      }))
      .sort((left, right) => right.total - left.total);
    const visibleCategories = rankedCategories.slice(0, maxTargetCategories);
    const remainingCategories = rankedCategories.slice(maxTargetCategories);

    for (const category of visibleCategories) {
      flows.push({
        from: providerNodeId,
        fromLabel: row.providerName,
        fromStep: 1,
        to: `target-category:${toNodeSlug(category.category)}`,
        toLabel: category.category,
        toStep: 2,
        occurrences: category.total,
      });
    }

    const remainingTotal = Number(
      remainingCategories.reduce((sum, category) => sum + category.total, 0).toFixed(2),
    );
    if (remainingTotal > 0) {
      flows.push({
        from: providerNodeId,
        fromLabel: row.providerName,
        fromStep: 1,
        to: `target-category:${providerKey}:other`,
        toLabel: `Other target categories (${remainingCategories.length})`,
        toStep: 2,
        occurrences: remainingTotal,
      });
    }
  }

  return flows;
}
