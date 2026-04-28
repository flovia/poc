import fs from "node:fs";
import path from "node:path";
import { db, env, nowIso, type AppDatabase } from "../db";
import {
  validateProviderEndpointClaimsSeed,
  type ProviderEndpointClaim,
  type ProviderEndpointClaimsSeed,
} from "../schema";

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

export const seedProviderEndpointClaims = (
  seed: ProviderEndpointClaimsSeed,
  database: AppDatabase = db,
) => {
  const now = nowIso();
  const upsert = database.prepare(`
    INSERT INTO provider_endpoint_claims (
      claim_id,
      entity_id,
      provider_name,
      service_name,
      endpoint_url,
      resource_url,
      request_host,
      pay_to_wallet,
      network,
      asset_address,
      amount_atomic,
      tx_hash,
      evidence_class,
      roles_json,
      confidence,
      source_name,
      evidence_refs_json,
      provenance_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(claim_id) DO UPDATE SET
      entity_id = excluded.entity_id,
      provider_name = excluded.provider_name,
      service_name = excluded.service_name,
      endpoint_url = excluded.endpoint_url,
      resource_url = excluded.resource_url,
      request_host = excluded.request_host,
      pay_to_wallet = excluded.pay_to_wallet,
      network = excluded.network,
      asset_address = excluded.asset_address,
      amount_atomic = excluded.amount_atomic,
      tx_hash = excluded.tx_hash,
      evidence_class = excluded.evidence_class,
      roles_json = excluded.roles_json,
      confidence = excluded.confidence,
      source_name = excluded.source_name,
      evidence_refs_json = excluded.evidence_refs_json,
      provenance_json = excluded.provenance_json,
      updated_at = excluded.updated_at
  `);

  const store = database.transaction((claims: ProviderEndpointClaim[]) => {
    for (const claim of claims) {
      upsert.run(
        claim.claimId,
        claim.entityId,
        claim.providerName ?? null,
        claim.serviceName ?? null,
        claim.endpointUrl ?? null,
        claim.resourceUrl ?? null,
        claim.requestHost ?? null,
        claim.payTo,
        claim.network,
        claim.asset,
        claim.amountAtomic ?? null,
        claim.txHash ?? null,
        claim.evidenceClass,
        JSON.stringify(claim.roles),
        claim.confidence,
        claim.sourceName,
        JSON.stringify(claim.evidenceRefs),
        JSON.stringify(claim.provenance),
        now,
        now,
      );
    }
  });

  store(seed.claims);
  return seed.claims.length;
};

export const seedProviderEndpointClaimsFromFile = (
  seedPath = path.join(env.fixturesDir, "knowledge", "provider_endpoint_claims.json"),
  database: AppDatabase = db,
) => {
  const absolutePath = path.isAbsolute(seedPath) ? seedPath : path.resolve(process.cwd(), seedPath);
  const seed = validateProviderEndpointClaimsSeed(readJson<Record<string, unknown>>(absolutePath));
  return seedProviderEndpointClaims(seed, database);
};

export const listProviderEndpointClaims = (database: AppDatabase = db) =>
  database
    .prepare(
      `
      SELECT
        claim_id,
        entity_id,
        provider_name,
        service_name,
        endpoint_url,
        resource_url,
        request_host,
        pay_to_wallet,
        network,
        asset_address,
        amount_atomic,
        tx_hash,
        evidence_class,
        roles_json,
        confidence,
        source_name,
        evidence_refs_json,
        provenance_json
      FROM provider_endpoint_claims
      ORDER BY claim_id
    `,
    )
    .all() as Array<{
    claim_id: string;
    entity_id: string;
    provider_name: string | null;
    service_name: string | null;
    endpoint_url: string | null;
    resource_url: string | null;
    request_host: string | null;
    pay_to_wallet: string;
    network: string;
    asset_address: string;
    amount_atomic: string | null;
    tx_hash: string | null;
    evidence_class: ProviderEndpointClaim["evidenceClass"];
    roles_json: string;
    confidence: number;
    source_name: string;
    evidence_refs_json: string;
    provenance_json: string;
  }>;
