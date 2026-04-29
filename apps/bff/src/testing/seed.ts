import { createBffDatabaseContext } from "../db/context";
import { type BffReadService, createBffReadService } from "../services/read-service";

export type SeededBffContext = {
  service: BffReadService;
  close: () => void;
};

export const createSeededBffService = (): SeededBffContext => {
  const context = createBffDatabaseContext({ databasePath: ":memory:" });
  seedBffRows(context.database);

  return {
    service: createBffReadService(context.database),
    close: context.close,
  };
};

const seedBffRows = (database: Parameters<typeof createBffReadService>[0]) => {
  const now = "2026-04-28T00:00:00.000Z";

  database
    .prepare(
      `
      INSERT INTO payment_observations (
        observation_id,
        chain_id,
        tx_hash,
        block_number,
        block_timestamp,
        relayer_wallet,
        payer_wallet,
        recipient_wallet,
        token_address,
        amount_atomic,
        method,
        top_level_selector,
        case_id,
        stable_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      1,
      8453,
      "0xtx1",
      123,
      1_777_333_000,
      "0xrelayer",
      "0xpayer",
      "0xrecipient",
      "0xusdc",
      "1000000",
      "transferWithAuthorization",
      "0xe3ee160e",
      "case-1",
      "stable-1",
      now,
      now,
    );

  database
    .prepare(
      `
      INSERT INTO payment_observations (
        observation_id,
        chain_id,
        tx_hash,
        block_number,
        block_timestamp,
        relayer_wallet,
        payer_wallet,
        recipient_wallet,
        token_address,
        amount_atomic,
        method,
        top_level_selector,
        case_id,
        stable_hash,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      2,
      8453,
      "0xtx2",
      124,
      1_777_333_060,
      "0xrelayer",
      "0xpayer",
      "0xotherrecipient",
      "0xusdc",
      "2000000",
      "transferWithAuthorization",
      "0xe3ee160e",
      "case-2",
      "stable-2",
      now,
      now,
    );

  database
    .prepare(
      `
      INSERT INTO attribution_candidates (
        candidate_id,
        observation_id,
        candidate_type,
        matched_fingerprint_type,
        matched_fingerprint_value,
        matched_claim_id,
        matched_settlement_fingerprint_id,
        entity_id,
        role,
        confidence,
        reasons_json,
        evidence_refs_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      1,
      2,
      "provider_candidate",
      "recipient_wallet",
      "0xotherrecipient",
      "claim-2",
      null,
      "provider-other",
      "provider",
      70,
      JSON.stringify(["matched recipient wallet"]),
      JSON.stringify(["observation:2"]),
      now,
      now,
    );

  database
    .prepare(
      `
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
    `,
    )
    .run(
      "claim-1",
      "provider-main",
      "Main Provider",
      "Main Service",
      null,
      null,
      null,
      "0xrecipient",
      "base",
      "0xusdc",
      null,
      null,
      "catalog",
      JSON.stringify(["provider"]),
      80,
      "test",
      JSON.stringify(["claim:1"]),
      JSON.stringify([]),
      now,
      now,
    );

  database
    .prepare(
      `
      INSERT INTO daily_metrics (
        day,
        observation_count,
        candidate_count,
        unique_payers,
        unique_recipients,
        unique_relayers,
        total_amount_atomic,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run("2026-04-28", 2, 1, 1, 2, 1, "3000000", now, now);

  database
    .prepare(
      `
      INSERT INTO payer_wallet_profiles (
        wallet,
        observation_count,
        total_amount_atomic,
        unique_recipients,
        unique_relayers,
        first_seen_at,
        last_seen_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run("0xpayer", 2, "3000000", 2, 1, 1_777_333_000, 1_777_333_060, now);

  database
    .prepare(
      `
      INSERT INTO recipient_summaries (
        wallet,
        observation_count,
        total_amount_atomic,
        unique_payers,
        unique_relayers,
        first_seen_at,
        last_seen_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run("0xrecipient", 1, "1000000", 1, 1, 1_777_333_000, 1_777_333_000, now);

  database
    .prepare(
      `
      INSERT INTO relayer_summaries (
        wallet,
        observation_count,
        total_amount_atomic,
        unique_payers,
        unique_recipients,
        first_seen_at,
        last_seen_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run("0xrelayer", 2, "3000000", 1, 2, 1_777_333_000, 1_777_333_060, now);
};
