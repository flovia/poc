import type { CustomerListItemDto } from "@/lib/api/types";

export type ParetoPoint = {
  walletShare: number;
  spendShare: number;
};

export type ParetoCurve = {
  points: ParetoPoint[];
  totalWallets: number;
  totalSpendAtomic: string;
  walletShareForHalfSpend: number | null;
};

export function computeParetoCurve(customers: readonly CustomerListItemDto[]): ParetoCurve {
  if (customers.length === 0) {
    return { points: [], totalWallets: 0, totalSpendAtomic: "0", walletShareForHalfSpend: null };
  }

  const sorted = [...customers].sort((a, b) => {
    const ba = BigInt(a.spendAtomic);
    const bb = BigInt(b.spendAtomic);
    if (ba === bb) return 0;
    return ba > bb ? -1 : 1;
  });

  const totalSpendBig = sorted.reduce<bigint>((acc, c) => acc + BigInt(c.spendAtomic), 0n);
  const totalSpendAtomic = totalSpendBig.toString();
  const totalWallets = sorted.length;

  const points: ParetoPoint[] = [];
  let cumulativeSpend = 0n;
  let walletShareForHalfSpend: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    cumulativeSpend += BigInt(sorted[i].spendAtomic);
    const walletShare = (i + 1) / totalWallets;
    const spendShare = totalSpendBig === 0n ? 0 : safeRatio(cumulativeSpend, totalSpendBig);
    points.push({ walletShare, spendShare });
    if (
      walletShareForHalfSpend === null &&
      totalSpendBig > 0n &&
      cumulativeSpend * 2n >= totalSpendBig
    ) {
      walletShareForHalfSpend = walletShare;
    }
  }

  return { points, totalWallets, totalSpendAtomic, walletShareForHalfSpend };
}

function safeRatio(numerator: bigint, denominator: bigint): number {
  if (denominator === 0n) return 0;
  const SCALE = 10_000_000n;
  const scaled = (numerator * SCALE) / denominator;
  return Number(scaled) / Number(SCALE);
}

export type RecencyMatrixCells = {
  recentHigh: number;
  recentLow: number;
  staleHigh: number;
  staleLow: number;
};

export type RecencyMatrix = {
  cells: RecencyMatrixCells;
  totalWallets: number;
  spendMedianAtomic: string;
  lastSeenMedian: number;
};

export function computeRecencyMatrix(customers: readonly CustomerListItemDto[]): RecencyMatrix {
  if (customers.length === 0) {
    return {
      cells: { recentHigh: 0, recentLow: 0, staleHigh: 0, staleLow: 0 },
      totalWallets: 0,
      spendMedianAtomic: "0",
      lastSeenMedian: 0,
    };
  }

  const spendValues = customers.map((c) => BigInt(c.spendAtomic));
  const spendThreshold = medianBigIntDoubled(spendValues);
  const lastSeenMedian = medianNumber(customers.map((c) => c.lastSeenAt));

  const cells: RecencyMatrixCells = {
    recentHigh: 0,
    recentLow: 0,
    staleHigh: 0,
    staleLow: 0,
  };

  for (const customer of customers) {
    const isRecent = customer.lastSeenAt >= lastSeenMedian;
    const isHigh = BigInt(customer.spendAtomic) * 2n >= spendThreshold;
    if (isRecent && isHigh) cells.recentHigh += 1;
    else if (isRecent) cells.recentLow += 1;
    else if (isHigh) cells.staleHigh += 1;
    else cells.staleLow += 1;
  }

  return {
    cells,
    totalWallets: customers.length,
    spendMedianAtomic: (spendThreshold / 2n).toString(),
    lastSeenMedian,
  };
}

function medianNumber(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// 偶数件で 2 値平均が小数になる場合に bigint で扱えるよう、中央 2 値の和をそのまま返す。
// 比較側で `value * 2 >= sum` と評価すれば丸めずに median 比較できる。
// 奇数件は中央値そのものを 2 倍して返す。
function medianBigIntDoubled(values: readonly bigint[]): bigint {
  if (values.length === 0) return 0n;
  const sorted = [...values].sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return sorted[mid - 1] + sorted[mid];
  }
  return sorted[mid] * 2n;
}

export type ProviderSpreadBucket = {
  label: string;
  count: number;
  share: number;
};

export type ProviderSpread = {
  buckets: ProviderSpreadBucket[];
  totalWallets: number;
};

export function computeProviderSpread(customers: readonly CustomerListItemDto[]): ProviderSpread {
  let zero = 0;
  let one = 0;
  let two = 0;
  let threePlus = 0;
  for (const customer of customers) {
    if (customer.providerCount <= 0) zero += 1;
    else if (customer.providerCount === 1) one += 1;
    else if (customer.providerCount === 2) two += 1;
    else threePlus += 1;
  }
  const totalWallets = customers.length;
  const share = (n: number) => (totalWallets === 0 ? 0 : n / totalWallets);
  const buckets: ProviderSpreadBucket[] = [
    { label: "1 provider", count: one, share: share(one) },
    { label: "2 providers", count: two, share: share(two) },
    { label: "3+ providers", count: threePlus, share: share(threePlus) },
  ];
  if (zero > 0) {
    buckets.unshift({ label: "No providers", count: zero, share: share(zero) });
  }
  return { buckets, totalWallets };
}
