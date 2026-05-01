import type { WalletUsageGraphDto } from "@/lib/api/types";
import { PROTAGONIST_ADDRESS } from "./shared";
import { PROVIDER_NAME, PROVIDER_PAY_TO } from "./shared";
import { SECONDARIES } from "./secondaries";

// Synthesize a wallet-usage graph for SDK connected mode so the
// "Other Service Candidates" view has data to render. The shape mirrors
// the live BFF projection: providerWallets[] containing the active
// provider, with each payer wallet listing otherServiceCandidates that
// point to other known SDK providers.
//
// "Northwind Price API" is treated as the active provider for the demo.

const ACTIVE_PROVIDER_ID = "northwind-price";
const ACTIVE_PAY_TO = PROVIDER_PAY_TO[ACTIVE_PROVIDER_ID];
const ACTIVE_NAME = PROVIDER_NAME[ACTIVE_PROVIDER_ID];

const EXTERNAL_PROVIDER_IDS = Object.keys(PROVIDER_PAY_TO).filter(
  (id) => id !== ACTIVE_PROVIDER_ID,
);

// Endpoint catalog per external provider (realistic-sounding paths
// so the table's "Top endpoints" column shows meaningful URLs).
const EXTERNAL_PROVIDER_ENDPOINTS: Record<string, string[]> = {
  vectormind: [
    "https://api.vectormind.ai/v1/embeddings",
    "https://api.vectormind.ai/v1/similarity",
  ],
  routezero: ["https://routezero.xyz/api/quote", "https://routezero.xyz/api/swap"],
  signalport: ["https://signalport.io/api/v1/signals"],
  vaultlayer: ["https://vaultlayer.com/api/v1/positions", "https://vaultlayer.com/api/v1/yield"],
  streamdelta: ["https://streamdelta.network/api/stream"],
  ledgerlake: ["https://ledgerlake.app/api/v1/ledger", "https://ledgerlake.app/api/v1/reports"],
};

const hashToInt = (input: string): number => {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

type Candidate =
  WalletUsageGraphDto["providerWallets"][number]["payerWallets"][number]["otherServiceCandidates"][number];

const buildCandidatesForPayer = (payerAddress: string, txBudget: number): Candidate[] => {
  // Pick 2-3 external providers per payer, deterministically.
  const seed = hashToInt(payerAddress);
  const count = 2 + (seed % 2);
  const start = seed % EXTERNAL_PROVIDER_IDS.length;
  const candidates: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const providerId = EXTERNAL_PROVIDER_IDS[(start + i) % EXTERNAL_PROVIDER_IDS.length];
    const endpoints = EXTERNAL_PROVIDER_ENDPOINTS[providerId] ?? [];
    const endpointIndex = (seed + i) % Math.max(1, endpoints.length);
    const endpointName = endpoints[endpointIndex] ?? `https://${providerId}.example.com/api`;
    const txCount = Math.max(1, Math.floor((txBudget * (count - i)) / (count * 2)));
    const confidence = 0.6 + ((seed + i * 7) % 30) / 100; // 0.60-0.89
    candidates.push({
      caseId: providerId,
      candidateType: endpointName,
      entityId: PROVIDER_PAY_TO[providerId] ?? null,
      confidence,
      reasons: ["SDK preview synthetic candidate"],
      evidenceRefs: [],
      providerId: `sdk:${providerId}:${endpointIndex}`,
      providerName: PROVIDER_NAME[providerId] ?? providerId,
      serviceName: endpointName,
      coUsageCount: txCount,
      payToWallet: PROVIDER_PAY_TO[providerId] ?? null,
    });
  }
  return candidates;
};

export function buildSdkWalletUsageGraph(): WalletUsageGraphDto {
  const payerWallets: WalletUsageGraphDto["providerWallets"][number]["payerWallets"] = [];

  // Protagonist: heavier external usage (richer demo).
  payerWallets.push({
    wallet: PROTAGONIST_ADDRESS,
    observations: [],
    otherServiceCandidates: buildCandidatesForPayer(PROTAGONIST_ADDRESS, 24),
  });

  // Secondaries: one candidate set per wallet, scaled by their observation count.
  for (const s of SECONDARIES) {
    const txBudget = Math.max(2, s.observationCount * 2);
    payerWallets.push({
      wallet: s.address,
      observations: [],
      otherServiceCandidates: buildCandidatesForPayer(s.address, txBudget),
    });
  }

  return {
    generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates",
    payerWalletLanguage: true,
    identityFieldsExcluded: [],
    providerWallets: [
      {
        payTo: ACTIVE_PAY_TO ?? "",
        claimIds: [ACTIVE_NAME ?? ACTIVE_PROVIDER_ID],
        payerWallets,
      },
    ],
  };
}
