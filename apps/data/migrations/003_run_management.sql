CREATE TABLE IF NOT EXISTS collection_checkpoints (
  id bigserial PRIMARY KEY,
  job_kind text NOT NULL,
  chain text NOT NULL,
  token_address text NOT NULL,
  owner_address text NOT NULL DEFAULT '',
  direction text NOT NULL DEFAULT '',
  from_block numeric(78, 0),
  to_block numeric(78, 0),
  last_cursor text,
  last_completed_block numeric(78, 0),
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_kind, chain, token_address, owner_address, direction)
);

CREATE TABLE IF NOT EXISTS collection_windows (
  id bigserial PRIMARY KEY,
  run_id bigint,
  owner_address text,
  direction text,
  from_block numeric(78, 0),
  to_block numeric(78, 0),
  status text NOT NULL,
  fetched integer NOT NULL DEFAULT 0,
  upserted integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  cursor text,
  error jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
