import { normalizeAsset, normalizeNetwork, normalizePayTo, paymentIdentityKey } from "contracts";
import type { MappingPattern, ScopedPaymentSink } from "./store";

export type ActivityTier = "0" | "1" | "2-5" | "6-20" | "21-100" | "101-1000" | "1000+";

export type PayToSelectionReason =
  | "mandatory"
  | "activity_tier"
  | "mapping_pattern"
  | "long_tail"
  | "service_identity"
  | "random_seed";

export type PayToSamplingBudget = {
  total: number;
  perActivityTier?: Partial<Record<ActivityTier, number>>;
  perMappingPattern?: Partial<Record<MappingPattern, number>>;
  longTail?: number;
};

export type PayToCensusRow = ScopedPaymentSink & {
  transactionCount: number;
  uniqueSenderCount?: number;
  totalVolumeAtomic?: string;
  latestBlockTimestamp?: string;
  mappingPattern?: MappingPattern;
  serviceId?: string;
  resourceCount?: number;
};

export type PayToSamplingPlanInput = {
  seed: string;
  budget: PayToSamplingBudget;
  census: PayToCensusRow[];
  mandatoryPayTos?: ScopedPaymentSink[];
};

export type PayToSample = PayToCensusRow & {
  activityTier: ActivityTier;
  selectionReasons: PayToSelectionReason[];
  supportingReasons: string[];
  samplingWeight: number;
};

export type PayToSamplingPlan = {
  generatedAt: string;
  seed: string;
  budget: PayToSamplingBudget;
  selected: PayToSample[];
  candidateCount: number;
};

export type WalletStratum =
  | "coingecko_repeat_user"
  | "coingecko_high_spender"
  | "one_shot_user"
  | "peer_service_user"
  | "cross_service_user"
  | "bundled_payto_user"
  | "recent_user"
  | "random_long_tail_user";

export type WalletSelectionReason = WalletStratum | "random_seed";

export type WalletSamplingCaps = {
  total: number;
  portfolioEnrichment?: number;
};

export type WalletSamplingBudget = Partial<Record<WalletStratum, number>> & {
  total: number;
};

export type WalletTransferRow = {
  payerWallet: string;
  payTo: string;
  serviceId?: string;
  amountAtomic: string;
  blockTimestamp: string;
  isCoingecko?: boolean;
  isBundledPayTo?: boolean;
};

export type WalletSamplingPlanInput = {
  seed: string;
  transfers: WalletTransferRow[];
  budget: WalletSamplingBudget;
  caps: WalletSamplingCaps;
  portfolioPolicy?: "disabled" | "capped";
};

export type WalletSample = {
  address: string;
  transactionCount: number;
  totalAmountAtomic: string;
  serviceCount: number;
  lastSeenAt: string;
  strata: WalletStratum[];
  selectionReasons: WalletSelectionReason[];
  portfolioEnrichment: "included" | "skipped" | "disabled";
};

export type WalletSamplingPlan = {
  generatedAt: string;
  seed: string;
  budget: WalletSamplingBudget;
  caps: WalletSamplingCaps;
  portfolioPolicy: "disabled" | "capped";
  selected: WalletSample[];
  candidateCount: number;
};

const ACTIVITY_TIERS: ActivityTier[] = ["0", "1", "2-5", "6-20", "21-100", "101-1000", "1000+"];

export const toActivityTier = (transactionCount: number): ActivityTier => {
  if (!Number.isInteger(transactionCount) || transactionCount < 0) {
    throw new Error("transactionCount must be a non-negative integer");
  }
  if (transactionCount === 0) return "0";
  if (transactionCount === 1) return "1";
  if (transactionCount <= 5) return "2-5";
  if (transactionCount <= 20) return "6-20";
  if (transactionCount <= 100) return "21-100";
  if (transactionCount <= 1000) return "101-1000";
  return "1000+";
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededScore = (seed: string, key: string) => hashString(`${seed}:${key}`) / 0xffffffff;

const normalizeSink = <T extends ScopedPaymentSink>(item: T): T => ({
  ...item,
  network: normalizeNetwork(item.network),
  asset: normalizeAsset(item.asset),
  payTo: normalizePayTo(item.payTo),
});

const rowKey = (row: ScopedPaymentSink) => paymentIdentityKey(row);

const addSelection = (
  selected: Map<string, PayToSample>,
  row: PayToCensusRow,
  reason: PayToSelectionReason,
  seed: string,
) => {
  const normalized = normalizeSink(row);
  const key = rowKey(normalized);
  const existing = selected.get(key);
  if (existing) {
    if (!existing.selectionReasons.includes(reason)) existing.selectionReasons.push(reason);
    return;
  }
  selected.set(key, {
    ...normalized,
    activityTier: toActivityTier(row.transactionCount),
    selectionReasons: [reason],
    supportingReasons: [
      `activity:${toActivityTier(row.transactionCount)}`,
      `mapping:${row.mappingPattern ?? "unresolved_payto"}`,
      `score:${seededScore(seed, key).toFixed(8)}`,
    ],
    samplingWeight: Math.max(1, row.transactionCount),
  });
};

const selectFromGroup = (
  rows: PayToCensusRow[],
  count: number | undefined,
  seed: string,
  selected: Map<string, PayToSample>,
  reason: PayToSelectionReason,
) => {
  if (!count || count <= 0) return;
  const ordered = [...rows].sort((left, right) => {
    const scoreDelta = seededScore(seed, rowKey(left)) - seededScore(seed, rowKey(right));
    if (scoreDelta !== 0) return scoreDelta;
    return rowKey(left).localeCompare(rowKey(right));
  });
  for (const row of ordered.slice(0, count)) addSelection(selected, row, reason, seed);
};

export const buildPayToSamplingPlan = (input: PayToSamplingPlanInput): PayToSamplingPlan => {
  if (!Number.isInteger(input.budget.total) || input.budget.total <= 0) {
    throw new Error("payTo sampling budget.total must be a positive integer");
  }
  const census = input.census.map(normalizeSink);
  const byKey = new Map(census.map((row) => [rowKey(row), row]));
  const selected = new Map<string, PayToSample>();

  for (const mandatory of input.mandatoryPayTos ?? []) {
    const normalized = normalizeSink(mandatory);
    const row = byKey.get(rowKey(normalized)) ?? {
      ...normalized,
      transactionCount: 0,
      mappingPattern: "unresolved_payto" as const,
    };
    addSelection(selected, row, "mandatory", input.seed);
  }

  for (const tier of ACTIVITY_TIERS) {
    selectFromGroup(
      census.filter((row) => toActivityTier(row.transactionCount) === tier),
      input.budget.perActivityTier?.[tier],
      input.seed,
      selected,
      "activity_tier",
    );
  }

  for (const [pattern, count] of Object.entries(input.budget.perMappingPattern ?? {}) as Array<
    [MappingPattern, number]
  >) {
    selectFromGroup(
      census.filter((row) => (row.mappingPattern ?? "unresolved_payto") === pattern),
      count,
      input.seed,
      selected,
      "mapping_pattern",
    );
  }

  selectFromGroup(
    census.filter((row) => row.transactionCount > 0 && row.transactionCount <= 5),
    input.budget.longTail,
    input.seed,
    selected,
    "long_tail",
  );

  if (selected.size < input.budget.total) {
    selectFromGroup(
      census,
      input.budget.total - selected.size,
      input.seed,
      selected,
      "random_seed",
    );
  }

  return {
    generatedAt: new Date(0).toISOString(),
    seed: input.seed,
    budget: input.budget,
    candidateCount: census.length,
    selected: [...selected.values()]
      .sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
      .slice(0, input.budget.total),
  };
};

const classifyWallet = (
  transfers: WalletTransferRow[],
): Omit<WalletSample, "selectionReasons" | "portfolioEnrichment"> => {
  const normalizedAddress = normalizePayTo(transfers[0]?.payerWallet ?? "");
  const serviceIds = new Set(transfers.map((transfer) => transfer.serviceId ?? transfer.payTo));
  const payTos = new Set(transfers.map((transfer) => normalizePayTo(transfer.payTo)));
  const totalAmount = transfers.reduce((sum, transfer) => sum + BigInt(transfer.amountAtomic), 0n);
  const lastSeenAt =
    transfers
      .map((transfer) => transfer.blockTimestamp)
      .sort()
      .at(-1) ?? new Date(0).toISOString();
  const strata = new Set<WalletStratum>();

  if (transfers.some((transfer) => transfer.isCoingecko) && transfers.length > 1)
    strata.add("coingecko_repeat_user");
  if (transfers.some((transfer) => transfer.isCoingecko) && totalAmount >= 1_000_000n)
    strata.add("coingecko_high_spender");
  if (transfers.length === 1) strata.add("one_shot_user");
  if (transfers.some((transfer) => !transfer.isCoingecko)) strata.add("peer_service_user");
  if (serviceIds.size > 1) strata.add("cross_service_user");
  if (transfers.some((transfer) => transfer.isBundledPayTo)) strata.add("bundled_payto_user");
  if (Date.parse(lastSeenAt) >= Date.parse("2026-01-01T00:00:00.000Z")) strata.add("recent_user");
  strata.add("random_long_tail_user");

  return {
    address: normalizedAddress,
    transactionCount: transfers.length,
    totalAmountAtomic: totalAmount.toString(),
    serviceCount: serviceIds.size,
    lastSeenAt,
    strata: [...strata].sort(),
  };
};

export const buildWalletSamplingPlan = (input: WalletSamplingPlanInput): WalletSamplingPlan => {
  if (!Number.isInteger(input.budget.total) || input.budget.total <= 0) {
    throw new Error("wallet sampling budget.total must be a positive integer");
  }
  const byWallet = new Map<string, WalletTransferRow[]>();
  for (const transfer of input.transfers) {
    const key = normalizePayTo(transfer.payerWallet);
    byWallet.set(key, [...(byWallet.get(key) ?? []), transfer]);
  }

  const candidates = [...byWallet.values()].map(classifyWallet);
  const selected = new Map<string, WalletSample>();
  const addWallet = (
    wallet: Omit<WalletSample, "selectionReasons" | "portfolioEnrichment">,
    reason: WalletSelectionReason,
  ) => {
    const existing = selected.get(wallet.address);
    if (existing) {
      if (!existing.selectionReasons.includes(reason)) existing.selectionReasons.push(reason);
      return;
    }
    selected.set(wallet.address, {
      ...wallet,
      selectionReasons: [reason],
      portfolioEnrichment: "disabled",
    });
  };
  const choose = (stratum: WalletStratum, count: number | undefined) => {
    if (!count || count <= 0) return;
    const rows = candidates
      .filter((wallet) => wallet.strata.includes(stratum))
      .sort(
        (left, right) =>
          seededScore(input.seed, left.address) - seededScore(input.seed, right.address),
      );
    for (const row of rows.slice(0, count)) addWallet(row, stratum);
  };

  for (const stratum of [
    "coingecko_repeat_user",
    "coingecko_high_spender",
    "one_shot_user",
    "peer_service_user",
    "cross_service_user",
    "bundled_payto_user",
    "recent_user",
    "random_long_tail_user",
  ] as WalletStratum[]) {
    choose(stratum, input.budget[stratum]);
  }

  if (selected.size < input.budget.total) {
    for (const row of candidates
      .sort(
        (left, right) =>
          seededScore(input.seed, left.address) - seededScore(input.seed, right.address),
      )
      .slice(0, input.budget.total - selected.size)) {
      addWallet(row, "random_seed");
    }
  }

  const portfolioPolicy = input.portfolioPolicy ?? "disabled";
  const selectedRows = [...selected.values()]
    .sort((left, right) => left.address.localeCompare(right.address))
    .slice(0, Math.min(input.budget.total, input.caps.total));
  let portfolioRemaining = portfolioPolicy === "capped" ? (input.caps.portfolioEnrichment ?? 0) : 0;
  for (const row of selectedRows) {
    if (portfolioPolicy === "disabled") row.portfolioEnrichment = "disabled";
    else if (portfolioRemaining > 0) {
      row.portfolioEnrichment = "included";
      portfolioRemaining -= 1;
    } else row.portfolioEnrichment = "skipped";
  }

  return {
    generatedAt: new Date(0).toISOString(),
    seed: input.seed,
    budget: input.budget,
    caps: input.caps,
    portfolioPolicy,
    selected: selectedRows,
    candidateCount: candidates.length,
  };
};
