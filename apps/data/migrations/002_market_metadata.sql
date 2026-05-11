CREATE TABLE IF NOT EXISTS capture_runs (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  error jsonb
);

CREATE TABLE IF NOT EXISTS x402_resources (
  resource_id text PRIMARY KEY,
  resource_url text NOT NULL,
  domain text NOT NULL,
  provider text,
  service text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb NOT NULL,
  source_run_id bigint REFERENCES capture_runs(id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_run_id bigint REFERENCES capture_runs(id),
  active boolean NOT NULL DEFAULT true,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS x402_payment_options (
  option_key text PRIMARY KEY,
  resource_id text NOT NULL REFERENCES x402_resources(resource_id) ON DELETE CASCADE,
  chain text NOT NULL,
  token_address text NOT NULL,
  pay_to_address text NOT NULL,
  amount_atomic numeric(78, 0),
  scheme text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb NOT NULL,
  source_run_id bigint REFERENCES capture_runs(id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_run_id bigint REFERENCES capture_runs(id),
  active boolean NOT NULL DEFAULT true,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT x402_payment_options_chain_check CHECK (chain = 'base'),
  CONSTRAINT x402_payment_options_token_check CHECK (token_address = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'),
  CONSTRAINT x402_payment_options_amount_check CHECK (amount_atomic IS NULL OR amount_atomic >= 0)
);

CREATE INDEX IF NOT EXISTS x402_payment_options_payto_idx
  ON x402_payment_options (chain, token_address, pay_to_address);

CREATE INDEX IF NOT EXISTS x402_payment_options_payto_amount_idx
  ON x402_payment_options (chain, token_address, pay_to_address, amount_atomic);

CREATE INDEX IF NOT EXISTS x402_payment_options_resource_idx
  ON x402_payment_options (resource_id);

CREATE INDEX IF NOT EXISTS x402_payment_options_active_payto_idx
  ON x402_payment_options (chain, token_address, pay_to_address)
  WHERE active;

CREATE TABLE IF NOT EXISTS payment_sinks (
  sink_key text PRIMARY KEY,
  chain text NOT NULL,
  token_address text NOT NULL,
  pay_to_address text NOT NULL,
  resource_count integer NOT NULL,
  service_count integer NOT NULL,
  mapping_pattern text NOT NULL,
  endpoint_attribution_status text NOT NULL,
  confidence double precision NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain, token_address, pay_to_address)
);
