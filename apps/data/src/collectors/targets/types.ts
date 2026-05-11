import type { CollectorTarget } from "../types.js";

export type PaymentCollectionTarget = {
  source: "pay_sh";
  protocol: "mpp";
  providerFqn: string;
  chain: "solana";
  asset: "usdc";
  payToAddress: string;
  resolvedReceiveAddress: string;
  resolvedReceiveAddressType: "solana_token_account";
  tokenMintAddress: string;
  resolutionMethod: "manual_token_account_mapping";
  sharedPayto: boolean;
};

export function paymentCollectionTargetToCollectorTarget(
  target: PaymentCollectionTarget,
): CollectorTarget {
  return {
    chain: target.chain,
    address: target.resolvedReceiveAddress,
    assetAddress: target.tokenMintAddress,
    providerId: target.providerFqn,
  };
}
