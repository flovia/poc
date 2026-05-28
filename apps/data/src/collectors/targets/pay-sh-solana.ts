import { paymentCollectionTargetToCollectorTarget } from "./types.js";
import type { PaymentCollectionTarget } from "./types.js";

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const QUICKNODE_SOLANA_PAY_TO = "2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57";
export const QUICKNODE_SOLANA_USDC_TOKEN_ACCOUNT = "6bMZDGaWLoJEVCwS6RCNaqfS3UipqG2d6mUNEqp6KQZ5";

const payShSolanaUsdcResolutions = [
  ["Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP", "3m3xS513PgjPwnLbmGbgL4Nk62QEtwzuoXphVN3kfMNh"],
  ["9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ", "Ftr3CrXQZF8nvGptDcSsDjZxZEKHiaZedgu5qGawY9q4"],
  ["2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57", "6bMZDGaWLoJEVCwS6RCNaqfS3UipqG2d6mUNEqp6KQZ5"],
  ["29XqFRpqRrXs8UjSsZnscqW3cTxNdY84qfaa9BGo3y4j", "ChTBpkGCiRmtTD5CGkn9d7Hho4V2Hz4nz8zH6UcyYKUy"],
  ["2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W", "EEpo7PSxMiQtUXPCtYw97aWUwRSURVhcBzpLQWr2c8SU"],
  ["6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC", "8knTotqNv9Q7PFoBmqeGLgj7oaii58ubC8ksEE9VmMtY"],
  ["7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw", "UXva6DWoRiNmwWtXHAmXXqjtpS1cnwfFPk1KSEnCDyS"],
  ["8LiXrHC61irY8qwj6qevoiRXxYfrTgSaHVbm8rav6HT2", "Gwjd1YLUVUJGFsDZ3srQUhpxZhVExd9T2R7AH1DURJ1w"],
  ["8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm", "2fXHfuJvXbJRS2ZH4zAQ21Ao12TLEYy6WsKeMoEiQkiv"],
  ["Ab4tooTiV5tWj5tiYHnw2t2p4QHcYjEMd4ZboB8JpF5q", "Dfeop3ZT3J89um2fMR9kw1jcwnHnG9Nh4w5PH5ZHSwBE"],
  ["BX1v9we4BCt28GM3hWwfXwnXDXpYHKWMFcWaHNytnbNL", "4aG3NAZwGYBGhHctNuHbut3yoAw3AT6i1hRfx7qEE86s"],
  ["HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz", "2RAVVmZKQqSe2yCxhNbbjJcEAsQH5QwtqM84ciXX8quU"],
] as const;

export const PAY_SH_SOLANA_USDC_COLLECTION_TARGETS = payShSolanaUsdcResolutions.map(
  ([payToAddress, resolvedReceiveAddress]) =>
    ({
      source: "pay_sh",
      protocol: "mpp",
      providerFqn: `pay_sh:mpp:${payToAddress}`,
      chain: "solana",
      asset: "usdc",
      payToAddress,
      resolvedReceiveAddress,
      resolvedReceiveAddressType: "solana_token_account",
      tokenMintAddress: SOLANA_USDC_MINT,
      resolutionMethod: "manual_token_account_mapping",
      sharedPayto: false,
    }) satisfies PaymentCollectionTarget,
);

export const QUICKNODE_SOLANA_USDC_COLLECTION_TARGET = {
  source: "pay_sh",
  protocol: "x402",
  providerFqn: "quicknode/rpc",
  chain: "solana",
  asset: "usdc",
  payToAddress: QUICKNODE_SOLANA_PAY_TO,
  resolvedReceiveAddress: QUICKNODE_SOLANA_USDC_TOKEN_ACCOUNT,
  resolvedReceiveAddressType: "solana_token_account",
  tokenMintAddress: SOLANA_USDC_MINT,
  resolutionMethod: "manual_token_account_mapping",
  sharedPayto: false,
} satisfies PaymentCollectionTarget;

export function toCollectorTargets(targets: readonly PaymentCollectionTarget[]) {
  return targets.map(paymentCollectionTargetToCollectorTarget);
}
