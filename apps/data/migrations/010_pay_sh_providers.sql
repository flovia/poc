CREATE TABLE IF NOT EXISTS pay_sh_providers (
  provider_fqn text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  service_url text NOT NULL,
  description text NOT NULL,
  use_case text NOT NULL,
  endpoint_count integer NOT NULL DEFAULT 0,
  price_range_min_usd numeric,
  price_range_max_usd numeric,
  source_document text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pay_sh_payment_offers (
  id bigserial PRIMARY KEY,
  provider_fqn text NOT NULL REFERENCES pay_sh_providers(provider_fqn) ON DELETE CASCADE,
  protocol text NOT NULL,
  chain text NOT NULL,
  asset text NOT NULL,
  pay_to_address text NOT NULL,
  probe_price_usd numeric,
  source_document text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_fqn, protocol, chain, asset, pay_to_address, probe_price_usd)
);

CREATE INDEX IF NOT EXISTS pay_sh_payment_offers_chain_asset_idx
  ON pay_sh_payment_offers (chain, asset);

CREATE INDEX IF NOT EXISTS pay_sh_payment_offers_pay_to_idx
  ON pay_sh_payment_offers (pay_to_address);

CREATE MATERIALIZED VIEW IF NOT EXISTS pay_sh_provider_catalog AS
SELECT
  p.provider_fqn,
  p.title,
  p.category,
  p.service_url,
  p.description,
  p.use_case,
  p.endpoint_count,
  p.price_range_min_usd,
  p.price_range_max_usd,
  count(o.id)::integer AS offer_count,
  count(o.id) FILTER (
    WHERE lower(o.chain) LIKE '%solana%' AND lower(o.asset) = 'usdc'
  )::integer AS solana_usdc_offer_count,
  jsonb_agg(
    jsonb_build_object(
      'protocol', o.protocol,
      'chain', o.chain,
      'asset', o.asset,
      'payToAddress', o.pay_to_address,
      'probePriceUsd', o.probe_price_usd
    ) ORDER BY o.chain, o.asset, o.pay_to_address
  ) FILTER (WHERE o.id IS NOT NULL) AS offers,
  max(GREATEST(p.updated_at, COALESCE(o.updated_at, p.updated_at))) AS updated_at
FROM pay_sh_providers p
LEFT JOIN pay_sh_payment_offers o ON o.provider_fqn = p.provider_fqn
GROUP BY
  p.provider_fqn,
  p.title,
  p.category,
  p.service_url,
  p.description,
  p.use_case,
  p.endpoint_count,
  p.price_range_min_usd,
  p.price_range_max_usd;

CREATE UNIQUE INDEX IF NOT EXISTS pay_sh_provider_catalog_fqn_idx
  ON pay_sh_provider_catalog (provider_fqn);
