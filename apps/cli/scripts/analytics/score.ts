import { buildAttributionCandidates } from "../../lib/attribution/score";

const result = buildAttributionCandidates();

console.log(
  JSON.stringify(
    {
      candidates: result.candidateCount,
      observations: result.observationCount,
    },
    null,
    2,
  ),
);
