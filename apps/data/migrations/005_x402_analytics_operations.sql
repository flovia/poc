CREATE TABLE IF NOT EXISTS indexed_block_ranges (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  chain text NOT NULL,
  token_address text NOT NULL,
  owner_address text,
  direction text,
  from_block numeric(78, 0) NOT NULL,
  to_block numeric(78, 0) NOT NULL,
  status text NOT NULL,
  event_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indexed_block_ranges_bounds_check CHECK (from_block >= 0 AND to_block >= from_block),
  CONSTRAINT indexed_block_ranges_status_check CHECK (status IN ('running', 'success', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS indexed_block_ranges_identity_idx
  ON indexed_block_ranges (
    source,
    chain,
    token_address,
    COALESCE(owner_address, ''),
    COALESCE(direction, ''),
    from_block,
    to_block
  );

CREATE TABLE IF NOT EXISTS x402_attributed_transfers (
  chain text NOT NULL,
  token_address text NOT NULL,
  tx_id text NOT NULL,
  log_index integer NOT NULL,
  block_number numeric(78, 0) NOT NULL,
  block_timestamp timestamptz NOT NULL,
  from_owner_address text NOT NULL,
  to_owner_address text NOT NULL,
  amount_atomic numeric(78, 0) NOT NULL,
  pay_to_address text NOT NULL,
  resource_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_option_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  attribution_status text NOT NULL,
  confidence double precision NOT NULL,
  reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, token_address, tx_id, log_index),
  CONSTRAINT x402_attributed_transfers_status_check CHECK (
    attribution_status IN (
      'direct_payto_endpoint',
      'amount_inferred_endpoint',
      'bundled_payto_unknown_endpoint',
      'candidate_x402_payto',
      'unresolved_payto'
    )
  )
);

CREATE INDEX IF NOT EXISTS x402_attributed_transfers_customer_idx
  ON x402_attributed_transfers (from_owner_address, block_number DESC, log_index DESC);

CREATE INDEX IF NOT EXISTS x402_attributed_transfers_payto_idx
  ON x402_attributed_transfers (pay_to_address, block_number DESC, log_index DESC);

CREATE TABLE IF NOT EXISTS x402_candidate_sinks (
  pay_to_address text PRIMARY KEY,
  score double precision NOT NULL,
  reason_codes text[] NOT NULL DEFAULT '{}'::text[],
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  promoted_to_known boolean NOT NULL DEFAULT false,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT x402_candidate_sinks_score_check CHECK (score >= 0 AND score <= 1)
);

CREATE OR REPLACE VIEW x402_customers AS
SELECT
  from_owner_address AS customer_address,
  min(block_timestamp) AS first_seen_at,
  max(block_timestamp) AS latest_seen_at,
  count(*) AS transfer_event_count,
  count(DISTINCT tx_id) AS distinct_transaction_count,
  count(DISTINCT pay_to_address) AS pay_to_count,
  COALESCE(sum(amount_atomic), 0)::text AS total_amount_atomic
FROM x402_attributed_transfers
GROUP BY from_owner_address;

CREATE OR REPLACE VIEW x402_payment_sinks AS
SELECT
  (chain || ':' || token_address || ':' || pay_to_address) AS sink_key,
  chain,
  token_address,
  pay_to_address,
  count(DISTINCT resource_id)::integer AS resource_count,
  count(DISTINCT service_key)::integer AS service_count,
  true AS active,
  min(first_seen_at) AS first_seen_at,
  max(last_seen_at) AS last_seen_at,
  CASE
    WHEN count(DISTINCT resource_id) = 1 AND count(DISTINCT service_key) = 1 THEN 'direct_payto_endpoint'
    ELSE 'bundled_payto_unknown_endpoint'
  END AS attribution_status,
  CASE
    WHEN count(DISTINCT resource_id) = 1 AND count(DISTINCT service_key) = 1 THEN 1.0
    ELSE 0.5
  END AS confidence
FROM (
  SELECT po.chain, po.token_address, po.pay_to_address, po.resource_id,
    COALESCE(r.service, r.provider, r.domain) AS service_key,
    po.first_seen_at,
    po.last_seen_at
  FROM x402_payment_options po
  JOIN x402_resources r ON r.resource_id = po.resource_id
  WHERE po.active AND r.active
) active_sinks
GROUP BY chain, token_address, pay_to_address;
