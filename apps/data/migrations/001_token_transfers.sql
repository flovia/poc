CREATE TABLE IF NOT EXISTS token_transfers (
  chain text NOT NULL,
  token_address text NOT NULL,
  tx_id text NOT NULL,
  log_index integer NOT NULL,
  block_number numeric(78, 0) NOT NULL,
  block_timestamp timestamptz NOT NULL,
  from_owner_address text NOT NULL,
  to_owner_address text NOT NULL,
  amount_atomic numeric(78, 0) NOT NULL,
  decimals integer NOT NULL,
  source text NOT NULL,
  transaction_from text,
  transaction_to text,
  fetched_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, token_address, tx_id, log_index),
  CONSTRAINT token_transfers_chain_check CHECK (chain = 'base'),
  CONSTRAINT token_transfers_token_address_check CHECK (token_address = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'),
  CONSTRAINT token_transfers_amount_non_negative_check CHECK (amount_atomic >= 0),
  CONSTRAINT token_transfers_block_non_negative_check CHECK (block_number >= 0),
  CONSTRAINT token_transfers_log_index_non_negative_check CHECK (log_index >= 0),
  CONSTRAINT token_transfers_decimals_check CHECK (decimals = 6),
  CONSTRAINT token_transfers_source_check CHECK (source IN ('cdp-sql', 'goldsky', 'fixture'))
);

CREATE INDEX IF NOT EXISTS token_transfers_incoming_idx
  ON token_transfers (chain, token_address, to_owner_address, block_number DESC, log_index DESC, tx_id DESC);

CREATE INDEX IF NOT EXISTS token_transfers_outgoing_idx
  ON token_transfers (chain, token_address, from_owner_address, block_number DESC, log_index DESC, tx_id DESC);
