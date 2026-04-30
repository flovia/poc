// Phase 7 C1: 共通の定数 / canonical map.

// 2026-04-28T09:00:00Z に固定. design.md §4.2.
//   Date.UTC(2026, 3, 28, 9, 0, 0) / 1000 === 1777366800
export const T0 = 1777366800;

// 主役 wallet の正規アドレス. data-source.ts の SDK_PROTAGONIST_ADDRESS と同値.
export const PROTAGONIST_ADDRESS = "0x7A91...C4E8";

// providerId -> canonical name (live と同じラベル).
export const PROVIDER_NAME: Record<string, string> = {
  "acme-price": "Acme Price API",
  vectormind: "VectorMind AI",
  routezero: "RouteZero DEX",
  signalport: "SignalPort",
  vaultlayer: "VaultLayer",
  streamdelta: "StreamDelta",
  ledgerlake: "LedgerLake",
};

// providerId -> 仮想 pay_to wallet (live seed には存在しないアドレス).
export const PROVIDER_PAY_TO: Record<string, string> = {
  "acme-price": "0xprovider...price",
  vectormind: "0xprovider...vector",
  routezero: "0xprovider...route",
  signalport: "0xprovider...signal",
  vaultlayer: "0xprovider...vault",
  streamdelta: "0xprovider...stream",
  ledgerlake: "0xprovider...ledger",
};

// Phase 9: SDK connected モード時に localStorage の pay_to が無くても
// サイドバー / URL に出すための placeholder. これは leaf 定数なので
// `lib/sdk-fixtures/index.ts` には re-export しない (UI 側は shared 直 import).
export const SDK_DEMO_PROVIDER_ID = "sdk-demo";
export const SDK_DEMO_PROVIDER_NAME = "Acme Price API";
