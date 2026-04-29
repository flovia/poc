import {
  type BitqueryAggregate,
  type CdpPaymentOption,
  type CdpResource,
  type MarketDiscrepancy,
  type MarketPaymentOption,
  type MarketResourceSnapshot,
  type MarketScope,
  type MarketSnapshot,
  normalizeAsset,
  normalizeNetwork,
  paymentIdentityKey,
  validateMarketSnapshot,
  zeroBitqueryAggregate,
} from "contracts";

type SnapshotInput = {
  resources: CdpResource[];
  aggregates: BitqueryAggregate[];
  scope?: MarketScope;
  generatedBy?: string;
  cdp?: {
    sourceName?: string;
    fetchLimit: number | null;
    fetchedCount: number;
  };
  bitquery?: {
    sourceName?: string;
    queriedPairs: number;
  };
};

type ResourcePaymentRow = {
  resource: CdpResource;
  option: CdpPaymentOption;
  inScope: boolean;
};

const toIdentityKey = (network: string, asset: string, payTo: string) =>
  paymentIdentityKey({ network, asset, payTo });

const asNumber = (value: string | number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid metric value: ${value}`);
  }
  return parsed;
};

const asString = (value: string | number): string => String(value);

const matchesScope = (option: Pick<CdpPaymentOption, "network" | "asset">, scope?: MarketScope) => {
  if (scope?.network && normalizeNetwork(option.network) !== normalizeNetwork(scope.network))
    return false;
  if (scope?.asset && normalizeAsset(option.asset) !== normalizeAsset(scope.asset)) return false;
  return true;
};

const buildDiscrepancy = (
  metric: MarketDiscrepancy["metric"],
  cdpValue: string | number | null | undefined,
  aggregateValue: string | number,
): MarketDiscrepancy | null => {
  if (cdpValue == null) return null;

  const left = asString(cdpValue);
  const right = asString(aggregateValue);
  if (left === right) return null;

  const leftValue = asNumber(cdpValue);
  const rightValue = asNumber(aggregateValue);
  const deltaRate = Math.abs(leftValue - rightValue) / Math.max(1, leftValue || 1);

  const severity: MarketDiscrepancy["severity"] =
    deltaRate >= 0.75 ? "high" : deltaRate >= 0.2 ? "medium" : "low";

  return {
    metric,
    cdpValue: left,
    bitqueryValue: right,
    severity,
    note: `CDP ${metric}=${left} differs from Bitquery value=${right}`,
  };
};

const buildOption = (
  option: CdpPaymentOption,
  inScope: boolean,
  aggregate: BitqueryAggregate,
): MarketPaymentOption => {
  const discrepancies: MarketDiscrepancy[] = [];
  if (inScope && option.quality) {
    const candidates: Array<[MarketDiscrepancy["metric"], string | number | null | undefined]> = [
      ["transactionCount", option.quality.expectedTransactionCount],
      ["uniqueSenderCount", option.quality.expectedUniqueSenderCount],
      ["totalVolumeAtomic", option.quality.expectedVolumeAtomic],
    ];

    for (const [metric, expected] of candidates) {
      if (expected == null) continue;
      const next = buildDiscrepancy(
        metric,
        expected,
        metric === "totalVolumeAtomic" ? aggregate.totalVolumeAtomic : aggregate[metric],
      );

      if (next !== null) {
        discrepancies.push(next);
      }
    }
  }

  return {
    cdpPaymentOption: option,
    bitqueryAggregate: aggregate,
    inScope,
    isActive: inScope && aggregate.transactionCount > 0,
    discrepancies: discrepancies.filter(Boolean) as MarketDiscrepancy[],
  };
};

export const filterPaymentOptionsByScope = (
  resources: CdpResource[],
  scope?: MarketScope,
): ResourcePaymentRow[] => {
  const rows: ResourcePaymentRow[] = [];
  for (const resource of resources) {
    for (const option of resource.paymentOptions) {
      rows.push({
        resource,
        option,
        inScope: matchesScope(option, scope),
      });
    }
  }
  return rows;
};

export const buildMarketSnapshot = (input: SnapshotInput): MarketSnapshot => {
  const scope = {
    ...(input.scope?.network ? { network: normalizeNetwork(input.scope.network) } : {}),
    ...(input.scope?.asset ? { asset: normalizeAsset(input.scope.asset) } : {}),
  };
  const aggregateIndex = new Map<string, BitqueryAggregate>();

  for (const aggregate of input.aggregates) {
    aggregateIndex.set(
      toIdentityKey(aggregate.network, aggregate.asset, aggregate.payTo),
      aggregate,
    );
  }

  const optionRows: MarketPaymentOption[] = [];
  const resourceRows: MarketResourceSnapshot[] = [];
  const resourceRankValues = new Map<string, number>();

  for (const resource of input.resources) {
    const paymentOptions: MarketPaymentOption[] = [];
    let totalTransactionCount = 0;

    for (const option of resource.paymentOptions) {
      const inScope = matchesScope(option, scope);
      const aggregateKey = toIdentityKey(option.network, option.asset, option.payTo);
      const aggregate =
        aggregateIndex.get(aggregateKey) ??
        zeroBitqueryAggregate({
          network: option.network,
          asset: option.asset,
          payTo: option.payTo,
          provenance: {
            sourceKind: "bitquery",
            sourceName: "bitquery-graphql",
          },
        });

      const optionRow = buildOption(option, inScope, aggregate);
      paymentOptions.push(optionRow);
      optionRows.push(optionRow);

      if (inScope) {
        totalTransactionCount += aggregate.transactionCount;
      }
    }

    resourceRankValues.set(resource.resourceId, totalTransactionCount);

    const totalVolumeAtomic = paymentOptions
      .filter((item) => item.inScope)
      .reduce((sum, item) => sum + BigInt(item.bitqueryAggregate.totalVolumeAtomic), 0n);

    const discrepancyCount = paymentOptions
      .filter((item) => item.inScope)
      .reduce((count, item) => count + item.discrepancies.length, 0);

    const isActive = paymentOptions.some((item) => item.inScope && item.isActive);

    resourceRows.push({
      resourceId: resource.resourceId,
      resource: resource.resource,
      provider: resource.provider,
      service: resource.service,
      paymentOptions,
      isActive,
      totalTransactionCount,
      totalVolumeAtomic: totalVolumeAtomic.toString(),
      discrepancyCount,
    });
  }

  const scopedRows = filterPaymentOptionsByScope(input.resources, scope).filter(
    (row) => row.inScope,
  );
  const scopedResourceIds = new Set(scopedRows.map((row) => row.resource.resourceId));

  const scopedPaymentOptionsCount = scopedRows.length;
  const activePaymentOptions = optionRows.filter((row) => row.inScope && row.isActive).length;
  const activeResourceCount = resourceRows.filter((resource) => resource.isActive).length;

  const totalTransactions = optionRows
    .filter((row) => row.inScope)
    .reduce((total, item) => total + item.bitqueryAggregate.transactionCount, 0);

  const totalUniqueSenders = optionRows
    .filter((row) => row.inScope)
    .reduce((total, item) => total + item.bitqueryAggregate.uniqueSenderCount, 0);

  const discrepancyCount = optionRows
    .filter((row) => row.inScope)
    .reduce((count, row) => count + row.discrepancies.length, 0);

  const topScopedResources = [...resourceRankValues.entries()]
    .map(([resourceId, totalTransactionCount]) => ({
      resourceId,
      totalTransactionCount,
    }))
    .filter((row) => row.totalTransactionCount > 0 || scopedResourceIds.has(row.resourceId))
    .sort((left, right) => right.totalTransactionCount - left.totalTransactionCount)
    .slice(0, 10)
    .map((row, index) => ({
      resourceId: row.resourceId,
      totalTransactionCount: row.totalTransactionCount,
      activityRank: index + 1,
    }));

  for (const [index, ranking] of topScopedResources.entries()) {
    const row = resourceRows.find((resource) => resource.resourceId === ranking.resourceId);
    if (row) {
      row.activityRank = index + 1;
    }
  }

  const scopedOptionRows = optionRows
    .filter((row) => row.inScope)
    .sort(
      (left, right) =>
        right.bitqueryAggregate.transactionCount - left.bitqueryAggregate.transactionCount,
    );

  for (const [index, option] of scopedOptionRows.entries()) {
    option.activityRank = index + 1;
  }

  const snapshot = validateMarketSnapshot({
    generatedAt: new Date().toISOString(),
    scope,
    source: {
      generatedBy: input.generatedBy ?? "x402-market-snapshot",
      cdp: {
        sourceKind: "cdp_discovery",
        sourceName: input.cdp?.sourceName ?? "cdp-discovery",
        fetchLimit: input.cdp?.fetchLimit ?? null,
        fetchCount: input.cdp?.fetchedCount ?? input.resources.length,
      },
      bitquery: {
        sourceKind: "bitquery",
        sourceName: input.bitquery?.sourceName ?? "bitquery-graphql",
        queriedPairs: input.bitquery?.queriedPairs ?? 0,
      },
    },
    summary: {
      totalResources: input.resources.length,
      scopedResources: scopedResourceIds.size,
      totalPaymentOptions: input.resources.reduce(
        (total, resource) => total + resource.paymentOptions.length,
        0,
      ),
      scopedPaymentOptions: scopedPaymentOptionsCount,
      activeResources: activeResourceCount,
      activePaymentOptions,
      discrepancyCount,
      topResources: topScopedResources,
      totalTransactions,
      totalUniqueSenders,
    },
    resources: resourceRows,
  });

  return snapshot;
};
