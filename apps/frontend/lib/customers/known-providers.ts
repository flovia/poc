// Address → known x402 provider name lookup.
//
// Populate this map as we identify which real on-chain pay_to addresses
// belong to which API providers. When a candidate's payToWallet is in this
// table, the aggregated table will show the resolved name instead of the
// raw fallback string from the BFF projection.
//
// Keys MUST be lowercase EVM addresses.
//
// TODO(shared-catalog): the BFF seed in
// apps/bff/src/data/projection-builder.ts (EXTERNAL_PROVIDER_CATALOG) holds
// the same address↔name pairs. Move both to a shared package once the real
// address-to-provider mapping is settled, to avoid drift.
const KNOWN_PROVIDER_NAMES: Record<string, string> = {
  // Example seeded entries — replace `payToWallet` values with real addresses
  // and update names once we confirm them on-chain.
  "0xa1b2c3d4e5f6071829304152637485960a0b0c0d": "Token Price API",
  "0xb2c3d4e5f60718293041526374859607a1b2c3d4": "DEX Quote API",
  "0xc3d4e5f60718293041526374859607a1b2c3d4e5": "NFT Floor API",
  "0xd4e5f60718293041526374859607a1b2c3d4e5f6": "Onchain Search API",
  "0xe5f60718293041526374859607a1b2c3d4e5f607": "Gas Oracle API",
};

export function resolveKnownProviderName(payToWallet: string): string | null {
  return KNOWN_PROVIDER_NAMES[payToWallet.toLowerCase()] ?? null;
}
