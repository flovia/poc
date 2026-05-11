import type { BalanceCollector, TransferCollector } from "../collectors/types.js";
import {
  PAY_SH_SOLANA_USDC_COLLECTION_TARGETS,
  toCollectorTargets,
} from "../collectors/targets/pay-sh-solana.js";
import { buildProviderEnrichmentSnapshot } from "./provider-snapshot.js";
import type { ProviderEnrichmentSnapshot } from "./provider-snapshot.js";

export type EnrichPayShSolanaTargetOptions = {
  targetIndex?: number;
  transferCollector: TransferCollector;
  balanceCollectors: readonly BalanceCollector[];
  enrichedAt?: string;
};

export async function enrichPayShSolanaTarget(
  options: EnrichPayShSolanaTargetOptions,
): Promise<ProviderEnrichmentSnapshot> {
  const target = PAY_SH_SOLANA_USDC_COLLECTION_TARGETS[options.targetIndex ?? 0];
  if (!target) throw new Error(`Unknown Pay.sh Solana target index: ${options.targetIndex ?? 0}`);

  const [transferTarget] = toCollectorTargets([target]);
  if (!transferTarget) throw new Error("Failed to build transfer target");
  const balanceTarget = {
    chain: "solana" as const,
    address: target.payToAddress,
    assetAddress: target.tokenMintAddress,
    providerId: target.providerFqn,
  };

  const [transferResult, ...balanceResults] = await Promise.all([
    options.transferCollector.collectTransfers({
      targets: [transferTarget],
      window: { chain: "solana" },
      limit: 1,
    }),
    ...options.balanceCollectors.map((collector) =>
      collector.collectBalances({ targets: [balanceTarget], limit: 100 }),
    ),
  ]);

  return buildProviderEnrichmentSnapshot({
    target: {
      providerId: target.providerFqn,
      chain: target.chain,
      asset: target.asset.toUpperCase(),
      payToAddress: target.payToAddress,
      receiveTokenAccount: target.resolvedReceiveAddress,
      tokenMintAddress: target.tokenMintAddress,
    },
    latestTransfer: transferResult.transfers[0],
    balances: balanceResults.flatMap((result) => result.balances),
    enrichedAt: options.enrichedAt,
  });
}
