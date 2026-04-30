import type { MarketSnapshot } from "contracts";

export const renderMarketSnapshotMarkdown = (snapshot: MarketSnapshot): string => {
  const topResources = snapshot.summary.topResources
    .map(
      (resource) =>
        `- ${resource.resourceId}: tx=${resource.totalTransactionCount} rank=${resource.activityRank}`,
    )
    .join("\n");

  const discrepancyRows = snapshot.resources.flatMap((resource) =>
    resource.paymentOptions
      .filter((row) => row.discrepancies.length > 0)
      .map(
        (row) =>
          `${resource.resourceId} ${row.cdpPaymentOption.network}/${row.cdpPaymentOption.asset} ${row.cdpPaymentOption.payTo} -> ${row.discrepancies.length} discrepancy(s)`,
      ),
  );

  const scopedRows = snapshot.resources
    .flatMap((resource) =>
      resource.paymentOptions
        .filter((row) => row.inScope)
        .map(
          (row) =>
            `- ${resource.resourceId}/${row.cdpPaymentOption.payTo} tx=${row.bitqueryAggregate.transactionCount} active=${row.isActive}`,
        ),
    )
    .join("\n");

  return `# x402 market snapshot

Generated: ${snapshot.generatedAt}

## Scope

${snapshot.scope.network ? `- network: ${snapshot.scope.network}` : ""}
${snapshot.scope.asset ? `- asset: ${snapshot.scope.asset}` : ""}

## Summary

- resources: ${snapshot.summary.totalResources}
- scoped resources: ${snapshot.summary.scopedResources}
- payment options: ${snapshot.summary.totalPaymentOptions}
- scoped payment options: ${snapshot.summary.scopedPaymentOptions}
- active resources: ${snapshot.summary.activeResources}
- active payment options: ${snapshot.summary.activePaymentOptions}
- discrepancies: ${snapshot.summary.discrepancyCount}
- transactions (scoped): ${snapshot.summary.totalTransactions}
- unique senders (scoped): ${snapshot.summary.totalUniqueSenders}

## Top resources

${topResources || "No scoped resources"}

## Scoped payment options

${scopedRows || "No scoped payment options"}

## Discrepancy notes

${discrepancyRows.length > 0 ? discrepancyRows.join("\n") : "No discrepancies"}
`;
};
