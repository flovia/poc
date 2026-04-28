import fs from "node:fs";
import {
  loadDryRunProbeResultsFromFile,
  loadEndpointManifestFromFile,
  validateEndpointManifest,
  type DryRunProbeResult,
  type EndpointCase,
  type LastDryRun,
  type X402PaymentOption,
} from "../../lib/endpoint-manifest";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const numberValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;

const paymentOptionsFromChallenge = (challenge: unknown): X402PaymentOption[] => {
  if (!isRecord(challenge) || !Array.isArray(challenge.accepts)) return [];

  return challenge.accepts.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const network = stringValue(entry.network);
    const amount = stringValue(entry.amount);
    const asset = stringValue(entry.asset);
    const payTo = stringValue(entry.payTo);
    if (!network || !amount || !/^\d+$/.test(amount) || !asset || !payTo) return [];

    return [
      {
        ...(stringValue(entry.scheme) ? { scheme: stringValue(entry.scheme) } : {}),
        network,
        amount,
        asset,
        payTo,
        ...(numberValue(entry.maxTimeoutSeconds)
          ? { maxTimeoutSeconds: numberValue(entry.maxTimeoutSeconds) }
          : {}),
      },
    ];
  });
};

const bodyTemplateFromChallenge = (challenge: unknown): Record<string, unknown> | null => {
  if (!isRecord(challenge)) return null;
  const extensions = challenge.extensions;
  if (!isRecord(extensions)) return null;
  const bazaar = extensions.bazaar;
  if (!isRecord(bazaar)) return null;
  const info = bazaar.info;
  if (!isRecord(info)) return null;
  const input = info.input;
  if (!isRecord(input)) return null;
  const body = input.body;
  return isRecord(body) ? body : null;
};

const challengeFromPaymentRequiredHeader = (result: DryRunProbeResult): unknown => {
  const encoded = result.responseHeaders?.["payment-required"];
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
  } catch {
    try {
      return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as unknown;
    } catch {
      return null;
    }
  }
};

const challengeFromResult = (result: DryRunProbeResult): unknown => {
  const headerChallenge = challengeFromPaymentRequiredHeader(result);
  if (isRecord(headerChallenge) && Array.isArray(headerChallenge.accepts)) return headerChallenge;
  return result.parsedChallenge;
};

const lastDryRunFromResult = (result: DryRunProbeResult): LastDryRun => {
  const challenge = challengeFromResult(result);
  const paymentOptions = paymentOptionsFromChallenge(challenge);
  return {
    status: result.status,
    attemptedAt: result.attemptedAt,
    url: result.url,
    ...(result.httpStatus === undefined ? {} : { httpStatus: result.httpStatus }),
    ...(result.noChallengeReason === undefined ? {} : { noChallengeReason: result.noChallengeReason }),
    ...(result.responseBodySha256 === undefined ? {} : { responseBodySha256: result.responseBodySha256 }),
    ...(paymentOptions.length > 0 ? { paymentOptions } : {}),
    ...(bodyTemplateFromChallenge(challenge) !== null
      ? { requestBodyTemplateSource: "x402_bazaar_challenge" as const }
      : {}),
  };
};

export const mergeDryRunIntoEndpointManifest = (
  manifestPath = "fixtures/acquisition/endpoint_manifest.json",
  dryRunPath = "fixtures/acquisition/dry_run_probe_results.json",
) => {
  const manifest = loadEndpointManifestFromFile(manifestPath);
  const dryRun = loadDryRunProbeResultsFromFile(dryRunPath);
  const resultsByCaseId = new Map(dryRun.results.map((result) => [result.caseId, result]));
  let mergedCount = 0;
  let challengeCount = 0;
  let requestBodyTemplateMergedCount = 0;

  const cases = manifest.cases.map((endpointCase): EndpointCase => {
    const result = resultsByCaseId.get(endpointCase.caseId);
    if (!result) return endpointCase;

    mergedCount += 1;
    if (result.status === "challenge") challengeCount += 1;

    const bodyTemplate = bodyTemplateFromChallenge(challengeFromResult(result));
    const shouldMergeBodyTemplate =
      endpointCase.requestBodyTemplate === undefined &&
      bodyTemplate !== null &&
      (endpointCase.method === "POST" || endpointCase.method === "PATCH" || endpointCase.method === "PUT");
    if (shouldMergeBodyTemplate) requestBodyTemplateMergedCount += 1;

    return {
      ...endpointCase,
      ...(shouldMergeBodyTemplate ? { requestBodyTemplate: bodyTemplate } : {}),
      lastDryRun: lastDryRunFromResult(result),
    };
  });

  const nextManifest = validateEndpointManifest({
    schemaVersion: manifest.schemaVersion,
    cases,
  });
  fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

  return {
    status: "ok",
    manifestPath,
    dryRunPath,
    mergedCount,
    challengeCount,
    requestBodyTemplateMergedCount,
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(mergeDryRunIntoEndpointManifest(), null, 2));
}
