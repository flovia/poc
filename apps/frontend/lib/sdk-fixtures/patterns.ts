// Phase 7 C4a + C4b: Patterns 画面用 fixture (live 互換 DTO + SDK 専用 extras).

import type { PaymentObservationDto, ReportSummaryDto, WalletUsageGraphDto } from "@/lib/api/types";
import type { SdkRetentionByAgentRow, SdkWorkflowCluster } from "./types";
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
      PROVIDER_PAY_TO["acme-price"],
      0.018,
    ),
  );
  // 直近 3 サイクル.
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const base = T0 + cycle * 3600;
    out.push(
      buildObservation(id++, base + 0, PROTAGONIST_ADDRESS, PROVIDER_PAY_TO["acme-price"], 0.02),
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
        PROVIDER_PAY_TO["acme-price"],
        0.01,
      ),
    );
    // 直近 1 件.
    out.push(
      buildObservation(id++, T0 - 3 * ONE_DAY_SEC, s.address, PROVIDER_PAY_TO["acme-price"], 0.02),
    );
  }
  return out;
}

export function buildSdkObservations(): PaymentObservationDto[] {
  return [...protagonistObservations(), ...secondaryObservations()];
}

export function buildSdkWalletUsageGraph(): WalletUsageGraphDto {
  const observations = buildSdkObservations();
  // recipient ごとに payer の集合を作って providerWallets を組み立てる.
  const byRecipient = new Map<string, Map<string, PaymentObservationDto[]>>();
  for (const obs of observations) {
    const rec = obs.recipientWallet;
    const payer = obs.payerWallet;
    if (!byRecipient.has(rec)) byRecipient.set(rec, new Map());
    const inner = byRecipient.get(rec)!;
    if (!inner.has(payer)) inner.set(payer, []);
    inner.get(payer)!.push(obs);
  }

  return {
    generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates",
    payerWalletLanguage: true,
    identityFieldsExcluded: ["payer_wallet.user_id", "payer_wallet.email"],
    providerWallets: [...byRecipient.entries()].map(([recipient, payerMap]) => {
      const providerId = Object.entries(PROVIDER_PAY_TO).find(
        ([, payTo]) => payTo === recipient,
      )?.[0];
      return {
        payTo: recipient,
        claimIds: providerId ? [providerId] : [],
        payerWallets: [...payerMap.entries()].map(([wallet, obsList]) => ({
          wallet,
          observations: obsList.map((o) => ({
            caseId: o.caseId,
            txHash: o.txHash,
            evidenceRefs: [],
          })),
          otherServiceCandidates: [],
        })),
      };
    }),
  };
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
    scopeNote: "SDK preview (mock data). Not derived from BFF.",
    observations,
    dailyMetrics: [],
  };
}

// C4b: Workflow Clusters / Retention by Agent (SDK preview 専用追加 UI 用).
export const SDK_WORKFLOW_CLUSTERS: SdkWorkflowCluster[] = [
  {
    clusterId: 1,
    label: "Hourly trading loop",
    sequence: ["Acme Price", "VectorMind AI", "RouteZero DEX", "SignalPort"],
    walletPercentage: 52,
  },
  {
    clusterId: 2,
    label: "Image gen → Storage → Notify",
    sequence: ["VectorMind AI", "Acme Price", "SignalPort"],
    walletPercentage: 28,
  },
  {
    clusterId: 3,
    label: "Single-call price lookup",
    sequence: ["Acme Price"],
    walletPercentage: 15,
  },
];

export const SDK_RETENTION_BY_AGENT: SdkRetentionByAgentRow[] = [
  { agentType: "Self-hosted DeFi Trading Bot", retainedPercentage: 92, walletCount: 1 },
  { agentType: "Claude Code", retainedPercentage: 86, walletCount: 24 },
  { agentType: "Cursor", retainedPercentage: 59, walletCount: 18 },
  { agentType: "n8n / workflow", retainedPercentage: 41, walletCount: 9 },
  { agentType: "curl / unknown", retainedPercentage: 14, walletCount: 4 },
];
