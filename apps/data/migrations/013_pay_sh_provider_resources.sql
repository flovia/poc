CREATE TABLE IF NOT EXISTS pay_sh_provider_resources (
  id bigserial PRIMARY KEY,
  provider_fqn text NOT NULL REFERENCES pay_sh_providers(provider_fqn) ON DELETE CASCADE,
  resource_url text NOT NULL,
  resource_index integer NOT NULL DEFAULT 0,
  description text,
  method text,
  networks jsonb NOT NULL DEFAULT '[]'::jsonb,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  transaction_count integer NOT NULL DEFAULT 0,
  observed_spend_atomic numeric NOT NULL DEFAULT 0,
  source_document text NOT NULL,
  raw_resource jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_fqn, resource_url)
);

CREATE INDEX IF NOT EXISTS pay_sh_provider_resources_provider_idx
  ON pay_sh_provider_resources (provider_fqn);

CREATE INDEX IF NOT EXISTS pay_sh_provider_resources_resource_idx
  ON pay_sh_provider_resources (resource_url);
