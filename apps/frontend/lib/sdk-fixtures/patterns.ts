// SDK preview 用 observations / summary fixture.

import type { PaymentObservationDto, ReportSummaryDto } from "@/lib/api/types";
import { PROTAGONIST_ADDRESS, PROVIDER_PAY_TO, T0 } from "./shared";
import { SECONDARIES } from "./secondaries";

// 14 日のスパンを得るため過去側に first-seen を伸ばす.
const ONE_DAY_SEC = 86400;
const FIRST_SEEN_OFFSET = 16 * ONE_DAY_SEC; // 主役/副役の初回観測は T0 - 16 days.

function buildObservation(
  i: number,
  ts: number,
  payer: string,
  recipient: string,
  amountUsd: number,
): PaymentObservationDto {
  const USDC_DECIMALS = 1_000_000;
  return {
    observationId: i,
    chainId: 8453,
    txHash: `0xobs${String(i).padStart(4, "0")}`,
    blockNumber: 100_000 + i,
    blockTimestamp: ts,
    relayerWallet: "0xrelayer...sdk",
    payerWallet: payer,
    recipientWallet: recipient,
    tokenAddress: "0xtoken...usdc",
    amountAtomic: Math.round(amountUsd * USDC_DECIMALS).toString(),
    method: "transferWithAuthorization",
    topLevelSelector: "0xa9059cbb",
    caseId: `case-sdk-${i}`,
    stableHash: `hash-sdk-${i}`,
  };
}

// 主役の 12 行 + 過去側 (T0 - 16 days) に 1 行 = retention 14 日成立.
function protagonistObservations(): PaymentObservationDto[] {
  const out: PaymentObservationDto[] = [];
  let id = 1;
  // 古い 1 件で first-seen を 16 日前に置く (retained 判定用).
  out.push(
    buildObservation(
      id++,
      T0 - FIRST_SEEN_OFFSET,
      PROTAGONIST_ADDRESS,
      PROVIDER_PAY_TO["northwind-price"],
      0.018,
    ),
  );
  // 直近 3 サイクル.
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const base = T0 + cycle * 3600;
    out.push(
      buildObservation(
        id++,
        base + 0,
        PROTAGONIST_ADDRESS,
        PROVIDER_PAY_TO["northwind-price"],
        0.02,
      ),
      buildObservation(id++, base + 60, PROTAGONIST_ADDRESS, PROVIDER_PAY_TO.vectormind, 0.035),
      buildObservation(id++, base + 120, PROTAGONIST_ADDRESS, PROVIDER_PAY_TO.routezero, 0.17),
      buildObservation(id++, base + 180, PROTAGONIST_ADDRESS, PROVIDER_PAY_TO.signalport, 0.004),
    );
  }
  return out;
}

function secondaryObservations(): PaymentObservationDto[] {
  const out: PaymentObservationDto[] = [];
  let id = 1000;
  for (const s of SECONDARIES) {
    // 16 日前の 1 件 (retained = true).
    out.push(
      buildObservation(
        id++,
        T0 - FIRST_SEEN_OFFSET,
        s.address,
        PROVIDER_PAY_TO["northwind-price"],
        0.01,
      ),
    );
    // 直近 1 件.
    out.push(
      buildObservation(
        id++,
        T0 - 3 * ONE_DAY_SEC,
        s.address,
        PROVIDER_PAY_TO["northwind-price"],
        0.02,
      ),
    );
  }
  return out;
}

export function buildSdkObservations(): PaymentObservationDto[] {
  return [...protagonistObservations(), ...secondaryObservations()];
}

export function buildSdkSummary(): ReportSummaryDto {
  const observations = buildSdkObservations();
  return {
    generatedAt: new Date(T0 * 1000).toISOString(),
    counts: {
      observations: observations.length,
      attributionCandidates: 0,
      dailyMetrics: 0,
      payerWalletProfiles: 5,
      recipientSummaries: 4,
      relayerSummaries: 1,
      walletUsageGraphProviderWallets: 4,
    },
    scopeNote: "SDK preview (mock data).",
    observations,
    dailyMetrics: [],
  };
}
