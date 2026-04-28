import fs from "node:fs";
import path from "node:path";
import { BASE_CHAIN_ID, BASE_USDC_ADDRESS } from "../constants";
import type { ProviderEndpointClaimsSeed } from "../schema";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const getRecord = (value: unknown, key: string): Record<string, unknown> => {
  if (!isRecord(value)) return {};
  const nested = value[key];
  return isRecord(nested) ? nested : {};
};
const getString = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
const hostFromUrl = (value: string | null) => {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
};

export const buildProviderClaimsFromNormalizedProbes = (corpusPath: string): ProviderEndpointClaimsSeed => {
  const source = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as Record<string, unknown>;
  const probes = Array.isArray(source.probes) ? source.probes : [];
  const claims: ProviderEndpointClaimsSeed["claims"] = [];

  for (const probe of probes) {
    if (!isRecord(probe)) continue;
    const name = getString(probe.name);
    const request = getRecord(probe, "request");
    const payment = getRecord(probe, "payment");
    const response = getRecord(probe, "response");
    const decoded = getRecord(response, "decodedPaymentResponse");

    const status = getString(payment.status);
    const txHash = getString(decoded.transaction);
    const payTo = getString(payment.payTo);
    const requestUrl = getString(request.url);
    const resourceUrl = getString(payment.resource) ?? requestUrl;
    const asset = getString(payment.asset);
    const amountAtomic = getString(payment.amount);

    if (!name || status !== "paid" || !txHash || !payTo || !requestUrl || !asset || asset.toLowerCase() !== BASE_USDC_ADDRESS.toLowerCase()) {
      continue;
    }

    const requestHost = hostFromUrl(requestUrl);
    const isPaysponge = requestHost?.endsWith(".x402.paysponge.com") ?? false;

    claims.push({
      claimId: `normalized-probe-${name}`,
      entityId: isPaysponge ? "paysponge" : name.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
      providerName: name,
      serviceName: name,
      endpointUrl: requestUrl,
      resourceUrl,
      requestHost,
      payTo: payTo as ProviderEndpointClaimsSeed["claims"][number]["payTo"],
      network: getString(payment.network) ?? "base",
      asset: asset as ProviderEndpointClaimsSeed["claims"][number]["asset"],
      amountAtomic,
      txHash: txHash as ProviderEndpointClaimsSeed["claims"][number]["txHash"],
      evidenceClass: "paid_probe",
      roles: isPaysponge
        ? ["provider", "service", "endpoint", "middleman", "market", "facilitator", "settlement_operator"]
        : ["provider", "service", "endpoint"],
      confidence: 90,
      sourceName: "foxytanuki-x402-analysis",
      evidenceRefs: [`${path.relative(process.cwd(), corpusPath)}:${name}`],
      provenance: [
        {
          source: "foxytanuki-x402-analysis",
          sourceId: name,
          docPath: path.relative(process.cwd(), corpusPath),
          transaction: txHash,
          requestUrl,
        },
      ],
    });
  }

  return {
    schemaVersion: "1",
    chainId: BASE_CHAIN_ID,
    collectedAt: new Date(0).toISOString(),
    claims,
  };
};
