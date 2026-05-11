ALTER TABLE pay_sh_providers
  ADD COLUMN IF NOT EXISTS has_metering boolean,
  ADD COLUMN IF NOT EXISTS has_free_tier boolean,
  ADD COLUMN IF NOT EXISTS provider_sha text,
  ADD COLUMN IF NOT EXISTS registry_version text,
  ADD COLUMN IF NOT EXISTS registry_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS registry_source_url text,
  ADD COLUMN IF NOT EXISTS raw_provider jsonb;

DROP MATERIALIZED VIEW IF EXISTS pay_sh_provider_catalog;

CREATE MATERIALIZED VIEW pay_sh_provider_catalog AS
SELECT
  p.provider_fqn,
  p.title,
  p.category,
  p.service_url,
  p.description,
  p.use_case,
  p.endpoint_count,
  p.has_metering,
  p.has_free_tier,
  p.price_range_min_usd,
  p.price_range_max_usd,
  p.provider_sha,
  p.registry_version,
  p.registry_generated_at,
  p.registry_source_url,
  p.raw_provider,
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
  p.has_metering,
  p.has_free_tier,
  p.price_range_min_usd,
  p.price_range_max_usd,
  p.provider_sha,
  p.registry_version,
  p.registry_generated_at,
  p.registry_source_url,
  p.raw_provider;

CREATE UNIQUE INDEX pay_sh_provider_catalog_fqn_idx
  ON pay_sh_provider_catalog (provider_fqn);
