export function required<T>(value: T | null | undefined, label: string): T {
  if (value === undefined || value === null || value === "") throw new Error(`Missing ${label}`);
  return value;
}

export function sameAddress(left: string | undefined, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
