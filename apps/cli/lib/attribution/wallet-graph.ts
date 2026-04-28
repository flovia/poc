import { listAttributionCandidates, listPaymentObservations } from "../aggregates/summaries";
import type { AppDatabase } from "../db";
import { listProviderEndpointClaims } from "./provider-claims";

export type WalletUsageGraph = {
  generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates";
  payerWalletLanguage: true;
  identityFieldsExcluded: string[];
  providerWallets: Array<{
    payTo: string;
    claimIds: string[];
    payerWallets: Array<{
      wallet: string;
      observations: Array<{ caseId: string; txHash: string; evidenceRefs: string[] }>;
      otherServiceCandidates: Array<{
        caseId: string;
        candidateType: string;
        entityId: string | null;
        confidence: number;
        reasons: string[];
        evidenceRefs: string[];
      }>;
    }>;
  }>;
};

const parseJsonArray = (value: string): string[] => JSON.parse(value) as string[];

export const buildWalletUsageGraph = (database?: AppDatabase): WalletUsageGraph => {
  const observations = listPaymentObservations(database);
  const claims = listProviderEndpointClaims(database);
  const candidates = listAttributionCandidates(database);
  const observationsById = new Map(
    observations.map((observation) => [observation.observation_id, observation]),
  );

  const claimGroups = new Map<string, typeof claims>();
  for (const claim of claims) {
    const key = claim.pay_to_wallet.toLowerCase();
    claimGroups.set(key, [...(claimGroups.get(key) ?? []), claim]);
  }

  const providerWallets = [...claimGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([payTo, payToClaims]) => {
      const matchingObservations = observations.filter(
        (observation) => observation.recipient_wallet.toLowerCase() === payTo,
      );
      const payerWallets = [
        ...new Set(
          matchingObservations.map((observation) => observation.payer_wallet.toLowerCase()),
        ),
      ]
        .sort()
        .map((wallet) => {
          const payerObservations = observations.filter(
            (observation) => observation.payer_wallet.toLowerCase() === wallet,
          );
          const payerObservationIds = new Set(
            payerObservations.map((observation) => observation.observation_id),
          );
          return {
            wallet,
            observations: matchingObservations
              .filter((observation) => observation.payer_wallet.toLowerCase() === wallet)
              .map((observation) => ({
                caseId: observation.case_id,
                txHash: observation.tx_hash,
                evidenceRefs: [
                  `observation:${observation.observation_id}`,
                  `tx:${observation.tx_hash}`,
                ],
              })),
            otherServiceCandidates: candidates
              .filter((candidate) => payerObservationIds.has(candidate.observation_id))
              .filter((candidate) =>
                [
                  "provider_candidate",
                  "service_candidate",
                  "endpoint_candidate",
                  "middleman_candidate",
                  "market_candidate",
                ].includes(candidate.candidate_type),
              )
              .filter(
                (candidate) =>
                  observationsById.get(candidate.observation_id)?.recipient_wallet.toLowerCase() !==
                  payTo,
              )
              .map((candidate) => {
                const observation = observationsById.get(candidate.observation_id);
                return {
                  caseId: observation?.case_id ?? "unknown",
                  candidateType: candidate.candidate_type,
                  entityId: candidate.entity_id,
                  confidence: candidate.confidence,
                  reasons: parseJsonArray(candidate.reasons_json),
                  evidenceRefs: parseJsonArray(candidate.evidence_refs_json),
                };
              })
              .sort(
                (left, right) =>
                  left.caseId.localeCompare(right.caseId) ||
                  left.candidateType.localeCompare(right.candidateType),
              ),
          };
        });

      return {
        payTo,
        claimIds: payToClaims.map((claim) => claim.claim_id).sort(),
        payerWallets,
      };
    });

  return {
    generatedFrom: "payment_observations+provider_endpoint_claims+attribution_candidates",
    payerWalletLanguage: true,
    identityFieldsExcluded: ["human_user", "ens", "social", "kyc", "email", "ip_address"],
    providerWallets,
  };
};
