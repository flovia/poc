CREATE TABLE IF NOT EXISTS goldsky_webhook_transfers_x402_paytos (
  id text PRIMARY KEY,
  token_address text NOT NULL,
  from_owner_address text NOT NULL,
  to_owner_address text NOT NULL,
  amount numeric NOT NULL,
  block_number bigint NOT NULL,
  block_timestamp bigint NOT NULL,
  transaction_hash text NOT NULL,
  gs_op text NOT NULL,
  received_at timestamptz NOT NULL,
  raw_payload jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goldsky_webhook_transfers_x402_paytos_to_owner_block_idx
  ON goldsky_webhook_transfers_x402_paytos (to_owner_address, block_number);

CREATE INDEX IF NOT EXISTS goldsky_webhook_transfers_x402_paytos_from_owner_block_idx
  ON goldsky_webhook_transfers_x402_paytos (from_owner_address, block_number);

CREATE INDEX IF NOT EXISTS goldsky_webhook_transfers_x402_paytos_token_block_idx
  ON goldsky_webhook_transfers_x402_paytos (token_address, block_number);

CREATE OR REPLACE VIEW x402_wallet_provider_edges AS
SELECT
  lower(gw.from_owner_address) AS wallet_address,
  pa.provider,
  pa.service,
  pa.domain,
  lower(gw.to_owner_address) AS pay_to_address,
  count(*)::bigint AS transfer_count,
  COALESCE(sum(gw.amount), 0)::text AS total_amount_atomic,
  min(gw.block_number)::text AS first_block,
  max(gw.block_number)::text AS last_block,
  min(to_timestamp(gw.block_timestamp)) AS first_seen_at,
  max(to_timestamp(gw.block_timestamp)) AS last_seen_at,
  'goldsky_webhook_x402_paytos'::text AS coverage_source,
  pa.shared_payto,
  pa.endpoint_attribution_mode
FROM goldsky_webhook_transfers_x402_paytos gw
LEFT JOIN x402_provider_activity pa
  ON pa.chain = 'base'
 AND pa.token_address = lower(gw.token_address)
 AND pa.pay_to_address = lower(gw.to_owner_address)
WHERE lower(gw.token_address) = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
GROUP BY
  lower(gw.from_owner_address),
  pa.provider,
  pa.service,
  pa.domain,
  lower(gw.to_owner_address),
  pa.shared_payto,
  pa.endpoint_attribution_mode;
