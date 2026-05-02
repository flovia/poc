import type { PhaseBCustomerProfileResponse, WalletUsageGraphResponse } from "contracts";
import type { ProviderCatalogItemDto } from "@/lib/api/types";
import { getCustomerProfileRaw, getProviders, getWalletUsageGraphRaw } from "@/lib/api/client";
import type {
  EndpointMasterRow,
  SankeyFlowDailyRow,
  X402CategoryDefinition,
  X402EndpointCategory,
  X402ErrorType,
  X402PaymentStatus,
  X402RequestEvent,
  X402WorkflowStage,
} from "./types";
import type {
  X402AnalysisViewModel,
  X402IntermediarySummaryRow,
  X402SankeyChartModel,
  X402SankeyFlowRow,
} from "./transform";
import {
  countEndpointSequenceLayerLabels,
  DEFAULT_ENDPOINT_SEQUENCE_MIN_LABELS,
  selectRepresentativeEndpointSequenceRows,
} from "./endpoint-sequence";

const LIVE_CATEGORY_DEFINITIONS: X402CategoryDefinition[] = [
  {
    category: "Extract",
    display_label: "Market data",
    description:
      "Price, pool, and token lookup resources inferred from live x402 provider URLs such as CoinGecko.",
  },
  {
    category: "Search",
    display_label: "Chain & query access",
    description:
      "RPC, chain access, and cross-network query resources inferred from providers such as QuickNode.",
  },
  {
    category: "Analyze",
    display_label: "Signals & analysis",
    description:
      "Signal, scoring, and analysis resources inferred from live provider endpoints such as Cryptobuddy.",
  },
  {
    category: "Transact",
    display_label: "Agent tools & entitlements",
    description:
      "Paid generation, subscriptions, entitlements, and action-style resources inferred from x402 product URLs.",
  },
];

const CATEGORY_DISPLAY_ORDER = LIVE_CATEGORY_DEFINITIONS.map(
  (definition) => definition.display_label ?? definition.category,
);
const INTENT_DISPLAY_ORDER = [
  "Monitor token and pool prices",
  "Query chain state and liquidity",
  "Generate signals and risk views",
  "Create media and content outputs",
  "Unlock paid tools and subscriptions",
] as const;
const REPRESENTATIVE_MIDDLEMAN_LIMIT = 6;

type LiveBuilderArgs = {
  providers: ProviderCatalogItemDto[];
  walletUsageGraph: WalletUsageGraphResponse;
  profiles: PhaseBCustomerProfileResponse[];
};

type ProviderSummary = {
  providerName: string;
  rawProviderName: string;
  payToWallet: string;
  primaryEndpoint: string;
  category: X402EndpointCategory;
  categoryLabel: string;
  intentLabel: string;
  payerWalletCount: number;
  flowCount: number;
  paidCount: number;
  settledUsdc: number;
  successRate: number;
  p95LatencyMs: number;
  errorRate: number;
  network: string;
  latestAt: string;
};

type EndpointSequence = {
  providerName: string;
  left: string;
  middle: string;
  right: string;
  flowCount: number;
  paidCount: number;
  settledUsdc: number;
  successRate: number;
  p95LatencyMs: number;
  errorRate: number;
  network: string;
};

type SampledWorkflow = {
  wallet: string;
  providerName: string;
  endpoints: string[];
  flowCount: number;
  settledUsdc: number;
  category: X402EndpointCategory;
  intentLabel: string;
  latestAt: string;
};

function categoryLabel(category: X402EndpointCategory): string {
  const match = LIVE_CATEGORY_DEFINITIONS.find((definition) => definition.category === category);
  return match?.display_label ?? category;
}

function numberFromAtomic(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed / 1_000_000;
}

function asDateMillis(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeUrlParts(value: string): { host: string; path: string } {
  try {
    const url = new URL(value);
    return {
      host: url.hostname.toLowerCase(),
      path: `${url.hostname}${url.pathname}`.toLowerCase(),
    };
  } catch {
    return {
      host: value.toLowerCase(),
      path: value.toLowerCase(),
    };
  }
}

function humanizeToken(value: string): string {
  return value
    .replace(/^www[.-]/, "")
    .replace(/^api[.-]/, "")
    .replace(/^x402[.-]/, "")
    .replace(/^pro[.-]/, "")
    .replace(/^public[.-]/, "")
    .replace(/\.(com|ai|xyz|io|app|dev|gg|wtf|site|online|net|fun|sh|cc|co|cash)$/i, "")
    .split(/[.-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferProviderName(rawName: string, fallback?: string): string {
  const source = `${rawName} ${fallback ?? ""}`.toLowerCase();
  if (source.includes("coingecko")) return "CoinGecko";
  if (source.includes("quicknode") || source.includes("quiknode")) return "QuickNode";
  if (source.includes("cryptobuddy")) return "Cryptobuddy";
  if (source.includes("evplus")) return "EVPlus";
  if (source.includes("agentgram")) return "Agentgram";
  if (source.includes("game-theory-agent")) return "Game Theory Agent";
  if (source.includes("folio-seven-swart")) return "Folio";
  if (source.includes("reversesandbox")) return "Reverse Sandbox";
  if (source.includes("fetchdelta")) return "FetchDelta";
  if (source.includes("selun")) return "Selun";

  const { host } = safeUrlParts(rawName || fallback || source);
  const humanized = humanizeToken(host);
  return humanized || fallback || rawName;
}

function inferCategory(endpoint: string): X402EndpointCategory {
  const { path } = safeUrlParts(endpoint);

  if (/signal|analysis|analy[sz]e|bias|risk|score|oracle|intel|insight|recommend/.test(path)) {
    return "Analyze";
  }

  if (
    /video|image|story|purchase|entitlement|tier|subscription|book|checkout|message|alert|swap|paywall/.test(
      path,
    )
  ) {
    return "Transact";
  }

  if (/token_price|price|pool|pools|market|ohlcv|quote/.test(path)) {
    return "Extract";
  }

  if (/quicknode|quiknode|mainnet|hypercore|rpc|query|resolve|search/.test(path)) {
    return "Search";
  }

  return "Analyze";
}

function inferIntent(category: X402EndpointCategory, endpoint: string): string {
  const { path } = safeUrlParts(endpoint);

  if (category === "Extract") return "Monitor token and pool prices";
  if (category === "Search") return "Query chain state and liquidity";
  if (category === "Analyze") return "Generate signals and risk views";
  if (/video|image|story|book/.test(path)) return "Create media and content outputs";
  return "Unlock paid tools and subscriptions";
}

function inferSubcategory(endpoint: string, category: X402EndpointCategory): string {
  const { path } = safeUrlParts(endpoint);

  if (path.includes("search/pools")) return "pool_search";
  if (path.includes("token_price")) return "token_price";
  if (path.includes("mainnet")) return "chain_access";
  if (path.includes("hypercore")) return "hypercore";
  if (path.includes("signal")) return "signal";
  if (path.includes("analysis")) return "analysis";
  if (path.includes("entitlement") || path.includes("tier")) return "entitlement";
  if (path.includes("video")) return "video_generation";

  switch (category) {
    case "Extract":
      return "market_lookup";
    case "Search":
      return "chain_query";
    case "Analyze":
      return "analysis";
    case "Transact":
      return "paid_action";
  }
}

function inferPricingModel(endpoint: string, category: X402EndpointCategory): string {
  const { path } = safeUrlParts(endpoint);
  if (/entitlement|tier|subscription/.test(path)) return "subscription";
  if (/video|image|story|book/.test(path)) return "per_generation";
  if (category === "Transact") return "per_action";
  return "per_request";
}

function summarizeEndpointLabel(endpoint: string): string {
  const { path } = safeUrlParts(endpoint);

  if (path.includes("search/pools")) return "Pool search";
  if (path.includes("/networks/eth/token_price")) return "ETH token price";
  if (path.includes("/networks/solana/token_price")) return "Solana token price";
  if (path.includes("/networks/base/token_price")) return "Base token price";
  if (path.includes("/signal")) return "Trading signal";
  if (path.includes("/analysis")) return "Analysis call";
  if (path.includes("solana-mainnet")) return "Solana RPC";
  if (path.includes("base-mainnet")) return "Base RPC";
  if (path.includes("hypercore")) return "Hypercore query";
  if (path.includes("entitlement") || path.includes("tier")) return "Entitlement check";
  if (path.includes("/generate/video")) return "Video generation";
  if (path.includes("story") && path.includes("purchase")) return "Story purchase";
  if (path.includes("book")) return "Book access";
  if (path.includes("risk") || path.includes("score")) return "Risk scoring";
  if (path.includes("recommend")) return "Recommendation";

  switch (inferCategory(endpoint)) {
    case "Extract":
      return "Market lookup";
    case "Search":
      return "Chain query";
    case "Analyze":
      return "Analysis endpoint";
    case "Transact":
      return "Paid action";
  }
}

function inferLatency(category: X402EndpointCategory): number {
  switch (category) {
    case "Extract":
      return 780;
    case "Search":
      return 920;
    case "Analyze":
      return 1360;
    case "Transact":
      return 1180;
  }
}

function eventStatus(): X402PaymentStatus {
  return "paid";
}

function eventErrorType(): X402ErrorType {
  return "none";
}

function uniqueEndpoints(profile: PhaseBCustomerProfileResponse): string[] {
  return Array.from(
    new Set(
      profile.profile.providers
        .map((provider) => provider.name ?? provider.providerName)
        .filter(Boolean),
    ),
  );
}

function endpointOrderKey(endpoint: string): number {
  const { path } = safeUrlParts(endpoint);
  if (path.includes("search/pools")) return 10;
  if (path.includes("/networks/eth/token_price")) return 20;
  if (path.includes("/networks/base/token_price")) return 30;
  if (path.includes("/networks/solana/token_price")) return 40;
  if (path.includes("/signal")) return 50;
  if (path.includes("solana-mainnet")) return 60;
  if (path.includes("base-mainnet")) return 70;
  if (path.includes("hypercore")) return 80;
  if (path.includes("/analysis")) return 90;
  if (path.includes("entitlement") || path.includes("tier")) return 100;
  return 110;
}

function sortEndpoints(endpoints: string[]): string[] {
  return [...endpoints].sort((left, right) => {
    const rankDiff = endpointOrderKey(left) - endpointOrderKey(right);
    if (rankDiff !== 0) return rankDiff;
    return left.localeCompare(right);
  });
}

function buildEndpointMaster(
  providerSummaries: ProviderSummary[],
  profiles: PhaseBCustomerProfileResponse[],
): EndpointMasterRow[] {
  const rows = new Map<string, EndpointMasterRow>();

  for (const summary of providerSummaries) {
    rows.set(summary.primaryEndpoint, {
      endpoint: summary.primaryEndpoint,
      endpoint_category: summary.category,
      endpoint_subcategory: inferSubcategory(summary.primaryEndpoint, summary.category),
      provider: summary.providerName,
      pricing_model: inferPricingModel(summary.primaryEndpoint, summary.category),
    });
  }

  for (const profile of profiles) {
    for (const endpoint of sortEndpoints(uniqueEndpoints(profile))) {
      const category = inferCategory(endpoint);
      rows.set(endpoint, {
        endpoint,
        endpoint_category: category,
        endpoint_subcategory: inferSubcategory(endpoint, category),
        provider: inferProviderName(endpoint),
        pricing_model: inferPricingModel(endpoint, category),
      });
    }
  }

  return Array.from(rows.values()).sort((left, right) =>
    left.endpoint.localeCompare(right.endpoint),
  );
}

function buildProviderLookup(
  providers: ProviderCatalogItemDto[],
): Map<string, ProviderCatalogItemDto> {
  return new Map(providers.map((provider) => [provider.payTo.toLowerCase(), provider]));
}

function buildProviderSummaries(args: LiveBuilderArgs): ProviderSummary[] {
  const providerLookup = buildProviderLookup(args.providers);
  const profileLatestByWallet = new Map(
    args.profiles.map((profile) => [
      profile.profile.identity.address.toLowerCase(),
      profile.profile.metrics.lastSeenAt ?? profile.generatedAt,
    ]),
  );

  return args.walletUsageGraph.graph.providerWallets
    .filter((wallet) => wallet.payerWallets.length > 0)
    .map((wallet) => {
      const provider = providerLookup.get(wallet.payToWallet.toLowerCase());
      const primaryEndpoint = wallet.providerName || wallet.name;
      const category = inferCategory(primaryEndpoint);
      const payerWalletCount = wallet.payerWallets.length;
      const settledUsdc = numberFromAtomic(
        wallet.payerWallets.reduce(
          (total, payer) => (BigInt(total) + BigInt(payer.sharedSpendAtomic)).toString(),
          "0",
        ),
      );
      const latestAt =
        wallet.payerWallets
          .map(
            (payer) =>
              profileLatestByWallet.get(payer.address.toLowerCase()) ??
              payer.lastSeenAt ??
              payer.firstSeenAt,
          )
          .sort((left, right) => asDateMillis(right) - asDateMillis(left))[0] ??
        wallet.lastSeenAt ??
        wallet.firstSeenAt ??
        args.walletUsageGraph.generatedAt;

      return {
        providerName: inferProviderName(primaryEndpoint, provider?.name),
        rawProviderName: primaryEndpoint,
        payToWallet: wallet.payToWallet,
        primaryEndpoint,
        category,
        categoryLabel: categoryLabel(category),
        intentLabel: inferIntent(category, primaryEndpoint),
        payerWalletCount,
        flowCount: payerWalletCount,
        paidCount: payerWalletCount,
        settledUsdc,
        successRate: 1,
        p95LatencyMs: inferLatency(category),
        errorRate: 0,
        network: provider?.network ?? "base",
        latestAt,
      };
    })
    .sort((left, right) => {
      if (right.payerWalletCount !== left.payerWalletCount) {
        return right.payerWalletCount - left.payerWalletCount;
      }
      if (right.settledUsdc !== left.settledUsdc) return right.settledUsdc - left.settledUsdc;
      return right.flowCount - left.flowCount;
    });
}

function representativeProviderSummaries(
  providerSummaries: ProviderSummary[],
  workflows: SampledWorkflow[],
): ProviderSummary[] {
  const sampledProviderNames = new Set(workflows.map((workflow) => workflow.providerName));

  return [...providerSummaries]
    .filter((summary) => summary.flowCount > 0)
    .sort((left, right) => {
      const leftSampled = sampledProviderNames.has(left.providerName) ? 1 : 0;
      const rightSampled = sampledProviderNames.has(right.providerName) ? 1 : 0;
      if (rightSampled !== leftSampled) return rightSampled - leftSampled;
      if (right.payerWalletCount !== left.payerWalletCount) {
        return right.payerWalletCount - left.payerWalletCount;
      }
      if (right.settledUsdc !== left.settledUsdc) return right.settledUsdc - left.settledUsdc;
      return left.providerName.localeCompare(right.providerName);
    })
    .slice(0, REPRESENTATIVE_MIDDLEMAN_LIMIT);
}

function buildSampledWorkflows(
  providerSummaries: ProviderSummary[],
  profiles: PhaseBCustomerProfileResponse[],
): SampledWorkflow[] {
  const providerByPayTo = new Map(
    providerSummaries.map((summary) => [summary.payToWallet.toLowerCase(), summary]),
  );

  return profiles
    .map((profile) => {
      const orderedProviders = [...profile.profile.providers].sort(
        (left, right) =>
          (right.txCount ?? right.transactionCount) - (left.txCount ?? left.transactionCount),
      );
      const primary = orderedProviders[0];
      if (!primary) return null;

      const summary = providerByPayTo.get(primary.payToWallet.toLowerCase());
      const endpoints = sortEndpoints(uniqueEndpoints(profile));
      return {
        wallet: profile.profile.identity.address,
        providerName:
          summary?.providerName ??
          inferProviderName(
            primary.providerName ?? primary.name,
            primary.providerName ?? primary.name,
          ),
        endpoints,
        flowCount: primary.txCount ?? primary.transactionCount,
        settledUsdc: numberFromAtomic(primary.spendAtomic),
        category: summary?.category ?? inferCategory(primary.providerName ?? primary.name),
        intentLabel:
          summary?.intentLabel ??
          inferIntent(
            inferCategory(primary.providerName ?? primary.name),
            primary.providerName ?? primary.name,
          ),
        latestAt: profile.profile.metrics.lastSeenAt ?? profile.generatedAt,
      };
    })
    .filter((workflow): workflow is SampledWorkflow => workflow !== null);
}

function distinctWorkflowEndpoints(workflow: SampledWorkflow): string[] {
  return workflow.endpoints.filter((endpoint, index, all) => {
    if (index === 0) return true;
    return summarizeEndpointLabel(endpoint) !== summarizeEndpointLabel(all[index - 1] ?? "");
  });
}

function buildEndpointSequence(
  workflow: SampledWorkflow,
  left: string,
  middle: string,
  right: string,
): EndpointSequence {
  return {
    providerName: workflow.providerName,
    left,
    middle,
    right,
    flowCount: workflow.flowCount,
    paidCount: workflow.flowCount,
    settledUsdc: workflow.settledUsdc,
    successRate: 1,
    p95LatencyMs: inferLatency(workflow.category),
    errorRate: 0,
    network: "base",
  };
}

function buildObservedSequenceFlows(workflows: SampledWorkflow[]): EndpointSequence[] {
  const flows: EndpointSequence[] = [];

  for (const workflow of workflows) {
    const distinctEndpoints = distinctWorkflowEndpoints(workflow);

    if (distinctEndpoints.length < 3) continue;
    for (let index = 0; index <= distinctEndpoints.length - 3; index += 1) {
      flows.push(
        buildEndpointSequence(
          workflow,
          distinctEndpoints[index] ?? "",
          distinctEndpoints[index + 1] ?? "",
          distinctEndpoints[index + 2] ?? "",
        ),
      );
    }
  }

  return flows;
}

function buildRepeatTouchSequenceFallbacks(workflows: SampledWorkflow[]): EndpointSequence[] {
  const fallbacks: EndpointSequence[] = [];

  for (const workflow of workflows) {
    const distinctEndpoints = distinctWorkflowEndpoints(workflow);
    if (distinctEndpoints.length >= 2) {
      for (let index = 0; index < distinctEndpoints.length - 1; index += 1) {
        const first = distinctEndpoints[index];
        const second = distinctEndpoints[index + 1];
        if (!first || !second) continue;
        fallbacks.push(buildEndpointSequence(workflow, first, second, first));
        fallbacks.push(buildEndpointSequence(workflow, second, first, second));
      }
      continue;
    }

    if (distinctEndpoints.length === 1) {
      const [endpoint] = distinctEndpoints;
      if (!endpoint) continue;
      fallbacks.push(buildEndpointSequence(workflow, endpoint, endpoint, endpoint));
    }
  }

  return fallbacks;
}

function aggregateSankeyRows(rows: X402SankeyFlowRow[]): X402SankeyFlowRow[] {
  const grouped = new Map<string, X402SankeyFlowRow[]>();

  for (const row of rows) {
    const key = `${row.left_label}|${row.middle_label}|${row.right_label}`;
    const current = grouped.get(key);
    if (current) current.push(row);
    else grouped.set(key, [row]);
  }

  return Array.from(grouped.values()).map((group) => {
    const first = group[0];
    if (!first) {
      throw new Error("Expected grouped sankey rows to contain at least one row.");
    }

    const flowCount = group.reduce((total, row) => total + row.flow_count, 0);
    const paidCount = group.reduce((total, row) => total + row.paid_count, 0);
    const settledUsdc = group.reduce((total, row) => total + row.settled_usdc, 0);

    return {
      left_label: first.left_label,
      middle_label: first.middle_label,
      right_label: first.right_label,
      left_detail: first.left_detail,
      middle_detail: first.middle_detail,
      right_detail: first.right_detail,
      flow_count: flowCount,
      paid_count: paidCount,
      settled_usdc: Number(settledUsdc.toFixed(6)),
      success_rate: Number(
        (
          group.reduce((total, row) => total + row.success_rate * row.flow_count, 0) /
          Math.max(flowCount, 1)
        ).toFixed(3),
      ),
      p95_latency_ms: Math.round(
        group.reduce((total, row) => total + row.p95_latency_ms * row.flow_count, 0) /
          Math.max(flowCount, 1),
      ),
      error_rate: Number(
        (
          group.reduce((total, row) => total + row.error_rate * row.flow_count, 0) /
          Math.max(flowCount, 1)
        ).toFixed(3),
      ),
      network: first.network,
    };
  });
}

function buildIntentPattern(
  providerSummaries: ProviderSummary[],
  workflows: SampledWorkflow[],
): X402SankeyChartModel {
  const representatives = representativeProviderSummaries(providerSummaries, workflows);
  const flows = aggregateSankeyRows(
    representatives.map((summary) => ({
      left_label: summary.intentLabel,
      middle_label: summary.providerName,
      right_label: summary.categoryLabel,
      middle_detail: summary.rawProviderName,
      right_detail: `${summary.providerName} · ${summary.primaryEndpoint}`,
      flow_count: summary.flowCount,
      paid_count: summary.paidCount,
      settled_usdc: summary.settledUsdc,
      success_rate: summary.successRate,
      p95_latency_ms: summary.p95LatencyMs,
      error_rate: summary.errorRate,
      network: summary.network,
    })),
  ).sort((left, right) => right.settled_usdc - left.settled_usdc);

  return {
    id: "intent_intermediary_target_category",
    eyebrow: "Pattern 1",
    title: "User intent → middleman → target API category",
    description:
      "Built from live wallet-usage-graph activity, showing representative middlemen only. Intent and target category are inferred from sampled provider URLs.",
    layer_labels: {
      left: "Intent",
      mid: "Middleman",
      right: "Target category",
    },
    layer_order: {
      left: [...INTENT_DISPLAY_ORDER],
      mid: representatives.map((summary) => summary.providerName),
      right: CATEGORY_DISPLAY_ORDER,
    },
    flows,
  };
}

function buildEndpointPatternRows(sequences: EndpointSequence[]): X402SankeyFlowRow[] {
  return aggregateSankeyRows(
    sequences.map((sequence) => ({
      left_label: summarizeEndpointLabel(sequence.left),
      middle_label: summarizeEndpointLabel(sequence.middle),
      right_label: summarizeEndpointLabel(sequence.right),
      left_detail: `${sequence.providerName} · ${sequence.left}`,
      middle_detail: `${sequence.providerName} · ${sequence.middle}`,
      right_detail: `${sequence.providerName} · ${sequence.right}`,
      flow_count: sequence.flowCount,
      paid_count: sequence.paidCount,
      settled_usdc: sequence.settledUsdc,
      success_rate: sequence.successRate,
      p95_latency_ms: sequence.p95LatencyMs,
      error_rate: sequence.errorRate,
      network: sequence.network,
    })),
  ).sort((left, right) => right.settled_usdc - left.settled_usdc);
}

function hasMinimumEndpointSequenceCoverage(rows: X402SankeyFlowRow[]): boolean {
  const counts = countEndpointSequenceLayerLabels(rows);
  return (
    counts.left >= DEFAULT_ENDPOINT_SEQUENCE_MIN_LABELS.left &&
    counts.mid >= DEFAULT_ENDPOINT_SEQUENCE_MIN_LABELS.mid &&
    counts.right >= DEFAULT_ENDPOINT_SEQUENCE_MIN_LABELS.right
  );
}

function buildEndpointPattern(workflows: SampledWorkflow[]): X402SankeyChartModel {
  const observedSequences = buildObservedSequenceFlows(workflows);
  const observedFlows = selectRepresentativeEndpointSequenceRows(
    buildEndpointPatternRows(observedSequences),
  );
  const repeatTouchFallbacks = buildRepeatTouchSequenceFallbacks(workflows);
  const usesRepeatTouchFallbacks =
    !hasMinimumEndpointSequenceCoverage(observedFlows) && repeatTouchFallbacks.length > 0;
  const flows = usesRepeatTouchFallbacks
    ? selectRepresentativeEndpointSequenceRows(buildEndpointPatternRows(repeatTouchFallbacks), {
        seedRows: observedFlows,
      })
    : observedFlows;

  return {
    id: "endpoint_sequence",
    eyebrow: "Pattern 2",
    title: "Previous endpoint → target endpoint → next endpoint",
    description: usesRepeatTouchFallbacks
      ? "Built from sampled customer profiles; short workflows are expanded into adjacent repeat-touch sequences so the before-target layer stays representative."
      : "Built from sampled customer profiles; endpoint ordering is inferred heuristically from provider resource lists rather than explicit trace spans.",
    layer_labels: {
      left: "Before target",
      mid: "Target endpoint",
      right: "After target",
    },
    flows,
  };
}

function buildRequestEvents(workflows: SampledWorkflow[]): X402RequestEvent[] {
  const events: X402RequestEvent[] = [];

  for (const workflow of workflows) {
    const total = workflow.endpoints.length;
    const targetIndex = total >= 3 ? 1 : Math.min(1, total - 1);

    for (const [index, endpoint] of workflow.endpoints.entries()) {
      const category = inferCategory(endpoint);
      const timestamp = workflow.latestAt;
      const stage: X402WorkflowStage =
        index < targetIndex ? "before_target" : index === targetIndex ? "target" : "after_target";

      events.push({
        event_id: `${workflow.wallet}:${index}:${endpoint}`,
        workflow_id: `wallet-${workflow.wallet.slice(0, 10)}`,
        step_order: index + 1,
        workflow_stage: total === 1 ? "target" : stage,
        timestamp,
        user_intent: workflow.intentLabel,
        buyer_type: "payer_wallet",
        buyer_wallet_hash: workflow.wallet,
        seller_wallet_hash: workflow.providerName,
        api_intermediary: workflow.providerName,
        provider: workflow.providerName,
        endpoint,
        endpoint_category: category,
        amount_usdc: Number((workflow.settledUsdc / Math.max(total, 1)).toFixed(6)),
        network: "base",
        token: "USDC",
        payment_status: eventStatus(),
        http_status: 200,
        latency_ms: inferLatency(category),
        error_type: eventErrorType(),
      });
    }
  }

  return events.sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 16);
}

function buildDailyRows(providerSummaries: ProviderSummary[]): SankeyFlowDailyRow[] {
  return providerSummaries
    .map((summary) => ({
      date: summary.latestAt.slice(0, 10),
      from_category: summary.category,
      api_intermediary: summary.providerName,
      to_category: summary.category,
      flow_count: summary.flowCount,
      paid_count: summary.paidCount,
      settled_usdc: Number(summary.settledUsdc.toFixed(6)),
      success_rate: summary.successRate,
      p95_latency_ms: summary.p95LatencyMs,
      error_rate: summary.errorRate,
      network: summary.network,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildIntermediarySummary(rows: SankeyFlowDailyRow[]): X402IntermediarySummaryRow[] {
  const grouped = new Map<string, SankeyFlowDailyRow[]>();

  for (const row of rows) {
    const current = grouped.get(row.api_intermediary);
    if (current) current.push(row);
    else grouped.set(row.api_intermediary, [row]);
  }

  return Array.from(grouped.entries())
    .map(([api_intermediary, group]) => {
      const flowCount = group.reduce((total, row) => total + row.flow_count, 0);
      const paidCount = group.reduce((total, row) => total + row.paid_count, 0);
      const settledUsdc = group.reduce((total, row) => total + row.settled_usdc, 0);
      return {
        api_intermediary,
        flow_count: flowCount,
        paid_count: paidCount,
        settled_usdc: Number(settledUsdc.toFixed(6)),
        success_rate: Number(
          (
            group.reduce((total, row) => total + row.success_rate * row.flow_count, 0) /
            Math.max(flowCount, 1)
          ).toFixed(3),
        ),
        p95_latency_ms: Math.round(
          group.reduce((total, row) => total + row.p95_latency_ms * row.flow_count, 0) /
            Math.max(flowCount, 1),
        ),
        error_rate: Number(
          (
            group.reduce((total, row) => total + row.error_rate * row.flow_count, 0) /
            Math.max(flowCount, 1)
          ).toFixed(3),
        ),
        network: group[0]?.network ?? "base",
      };
    })
    .sort((left, right) => {
      if (right.settled_usdc !== left.settled_usdc) return right.settled_usdc - left.settled_usdc;
      return right.flow_count - left.flow_count;
    });
}

function buildPeriodLabel(rows: SankeyFlowDailyRow[]): string {
  if (rows.length === 0) return "No data";
  const dates = rows.map((row) => row.date).sort((left, right) => left.localeCompare(right));
  return `${dates[0]} to ${dates[dates.length - 1]}`;
}

function buildTotals(rows: SankeyFlowDailyRow[]) {
  const flowCount = rows.reduce((total, row) => total + row.flow_count, 0);
  const paidCount = rows.reduce((total, row) => total + row.paid_count, 0);
  const settledUsdc = rows.reduce((total, row) => total + row.settled_usdc, 0);
  const successRate =
    rows.reduce((total, row) => total + row.success_rate * row.flow_count, 0) /
    Math.max(flowCount, 1);
  const errorRate =
    rows.reduce((total, row) => total + row.error_rate * row.flow_count, 0) /
    Math.max(flowCount, 1);
  const p95LatencyMs =
    rows.reduce((total, row) => total + row.p95_latency_ms * row.flow_count, 0) /
    Math.max(flowCount, 1);

  return {
    flow_count: flowCount,
    paid_count: paidCount,
    settled_usdc: Number(settledUsdc.toFixed(6)),
    success_rate: Number(successRate.toFixed(3)),
    p95_latency_ms: Math.round(p95LatencyMs),
    error_rate: Number(errorRate.toFixed(3)),
  };
}

export function buildX402LiveAnalysisViewModelFromData(
  args: LiveBuilderArgs,
): X402AnalysisViewModel {
  const providerSummaries = buildProviderSummaries(args);
  const workflows = buildSampledWorkflows(providerSummaries, args.profiles);
  const endpointMaster = buildEndpointMaster(providerSummaries, args.profiles);
  const requestEvents = buildRequestEvents(workflows);
  const dailyRows = buildDailyRows(providerSummaries);

  return {
    category_definitions: LIVE_CATEGORY_DEFINITIONS,
    endpoint_master: endpointMaster,
    request_events_sample: requestEvents,
    sankey_flows_daily: dailyRows,
    sankey_flows: dailyRows,
    sankey_patterns: [
      buildIntentPattern(providerSummaries, workflows),
      buildEndpointPattern(workflows),
    ],
    intermediary_summary: buildIntermediarySummary(dailyRows),
    period_label: buildPeriodLabel(dailyRows),
    totals: buildTotals(dailyRows),
  };
}

export async function buildX402LiveAnalysisViewModel(): Promise<X402AnalysisViewModel> {
  const [providers, walletUsageGraph] = await Promise.all([
    getProviders(),
    getWalletUsageGraphRaw(),
  ]);
  const candidateWallets = walletUsageGraph.graph.providerWallets
    .sort((left, right) => right.payerWallets.length - left.payerWallets.length)
    .flatMap((providerWallet) =>
      [...providerWallet.payerWallets]
        .sort((left, right) => right.sharedTransactionCount - left.sharedTransactionCount)
        .map((payerWallet) => payerWallet.address),
    );
  const seenWallets = new Set<string>();
  const sampledProfiles: PhaseBCustomerProfileResponse[] = [];

  for (const address of candidateWallets) {
    const normalized = address.toLowerCase();
    if (seenWallets.has(normalized)) continue;
    seenWallets.add(normalized);

    const profile = await getCustomerProfileRaw(address);
    if (profile) sampledProfiles.push(profile);
    if (sampledProfiles.length >= 4) break;
  }

  return buildX402LiveAnalysisViewModelFromData({
    providers,
    walletUsageGraph,
    profiles: sampledProfiles,
  });
}

export const X402_LIVE_CATEGORY_DEFINITIONS = LIVE_CATEGORY_DEFINITIONS;
