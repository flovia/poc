CREATE TABLE IF NOT EXISTS payment_collection_targets (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  protocol text NOT NULL DEFAULT 'unknown',
  provider_fqn text NOT NULL DEFAULT '',
  chain text NOT NULL,
  asset text NOT NULL,
  pay_to_address text NOT NULL,
  resolved_receive_address text NOT NULL,
  resolved_receive_address_type text NOT NULL,
  token_mint_address text,
  token_contract_address text,
  resolution_method text NOT NULL,
  shared_payto boolean NOT NULL DEFAULT false,
  probe_price_usd numeric,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (
    source,
    protocol,
    provider_fqn,
    chain,
    asset,
    pay_to_address,
    resolved_receive_address
  )
);

UPDATE payment_collection_targets
SET
  protocol = COALESCE(protocol, 'unknown'),
  provider_fqn = COALESCE(provider_fqn, '')
WHERE protocol IS NULL OR provider_fqn IS NULL;

ALTER TABLE payment_collection_targets
  ALTER COLUMN protocol SET DEFAULT 'unknown',
  ALTER COLUMN protocol SET NOT NULL,
  ALTER COLUMN provider_fqn SET DEFAULT '',
  ALTER COLUMN provider_fqn SET NOT NULL;

CREATE INDEX IF NOT EXISTS payment_collection_targets_receive_idx
  ON payment_collection_targets (chain, asset, resolved_receive_address);

CREATE INDEX IF NOT EXISTS payment_collection_targets_solana_mint_idx
  ON payment_collection_targets (token_mint_address, resolved_receive_address)
  WHERE resolved_receive_address_type = 'solana_token_account';

CREATE TABLE IF NOT EXISTS goldsky_webhook_token_transfers_solana (
  id text PRIMARY KEY,
  signature text NOT NULL,
  block_slot bigint NOT NULL,
  block_timestamp timestamptz,
  token_mint_address text NOT NULL,
  from_token_account text,
  to_token_account text NOT NULL,
  amount numeric NOT NULL,
  decimals integer,
  gs_op text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goldsky_solana_transfers_to_token_account_idx
  ON goldsky_webhook_token_transfers_solana (to_token_account);

CREATE INDEX IF NOT EXISTS goldsky_solana_transfers_mint_idx
  ON goldsky_webhook_token_transfers_solana (token_mint_address);

CREATE INDEX IF NOT EXISTS goldsky_solana_transfers_slot_idx
  ON goldsky_webhook_token_transfers_solana (block_slot);

CREATE INDEX IF NOT EXISTS goldsky_solana_transfers_signature_idx
  ON goldsky_webhook_token_transfers_solana (signature);

CREATE OR REPLACE VIEW payment_attributed_transfers_solana AS
WITH target_groups AS (
  SELECT
    chain,
    asset,
    pay_to_address,
    resolved_receive_address,
    resolved_receive_address_type,
    token_mint_address,
    array_agg(DISTINCT source ORDER BY source) AS sources,
    array_agg(DISTINCT protocol ORDER BY protocol) AS protocols,
    array_agg(DISTINCT provider_fqn ORDER BY provider_fqn) FILTER (WHERE provider_fqn <> '') AS provider_fqns,
    bool_or(shared_payto) AS shared_payto,
    min(probe_price_usd) AS min_probe_price_usd,
    max(probe_price_usd) AS max_probe_price_usd,
    count(*)::integer AS target_row_count
  FROM payment_collection_targets
  WHERE resolved_receive_address_type = 'solana_token_account'
  GROUP BY
    chain,
    asset,
    pay_to_address,
    resolved_receive_address,
    resolved_receive_address_type,
    token_mint_address
)
SELECT
  t.id,
  t.signature,
  t.block_slot,
  t.block_timestamp,
  t.token_mint_address,
  t.from_token_account,
  t.to_token_account,
  t.amount,
  t.decimals,
  target.sources,
  target.protocols,
  target.provider_fqns,
  target.chain,
  target.asset,
  target.pay_to_address,
  target.resolved_receive_address,
  target.resolved_receive_address_type,
  target.shared_payto,
  target.min_probe_price_usd,
  target.max_probe_price_usd,
  target.target_row_count
FROM goldsky_webhook_token_transfers_solana t
JOIN target_groups target
  ON target.resolved_receive_address = t.to_token_account
 AND target.token_mint_address = t.token_mint_address;
