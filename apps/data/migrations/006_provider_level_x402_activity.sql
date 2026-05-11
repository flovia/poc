CREATE OR REPLACE VIEW x402_provider_activity AS
WITH active_payto_metadata AS (
  SELECT
    po.chain,
    po.token_address,
    po.pay_to_address,
    COALESCE(min(r.provider) FILTER (WHERE r.provider IS NOT NULL), min(r.domain)) AS provider,
    CASE
      WHEN count(DISTINCT COALESCE(r.service, r.provider, r.domain)) = 1
        THEN min(COALESCE(r.service, r.provider, r.domain))
      ELSE null
    END AS service,
    CASE
      WHEN count(DISTINCT r.domain) = 1 THEN min(r.domain)
      ELSE null
    END AS domain,
    count(DISTINCT r.resource_id)::integer AS resource_count,
    count(DISTINCT po.option_key)::integer AS option_count,
    count(DISTINCT COALESCE(r.service, r.provider, r.domain))::integer AS service_count,
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'resourceId', r.resource_id,
        'url', r.resource_url,
        'provider', r.provider,
        'service', r.service,
        'domain', r.domain
      )
    ) AS possible_resources,
    min(LEAST(po.first_seen_at, r.first_seen_at)) AS first_seen_at,
    max(GREATEST(po.last_seen_at, r.last_seen_at)) AS last_seen_at
  FROM x402_payment_options po
  JOIN x402_resources r ON r.resource_id = po.resource_id AND r.active
  WHERE po.active
  GROUP BY po.chain, po.token_address, po.pay_to_address
), transfer_activity AS (
  SELECT
    at.chain,
    at.token_address,
    at.pay_to_address,
    count(*)::bigint AS transfer_count,
    count(DISTINCT at.from_owner_address)::bigint AS unique_payer_count,
    COALESCE(sum(at.amount_atomic), 0)::text AS total_amount_atomic,
    min(at.block_number) AS first_block,
    max(at.block_number) AS last_block,
    min(at.block_timestamp) AS first_transfer_at,
    max(at.block_timestamp) AS latest_transfer_at,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM x402_payment_options po
        WHERE po.chain = at.chain
          AND po.token_address = at.token_address
          AND po.pay_to_address = at.pay_to_address
          AND po.active
          AND po.amount_atomic = at.amount_atomic
      )
    )::bigint AS matched_option_transfer_count
  FROM x402_attributed_transfers at
  GROUP BY at.chain, at.token_address, at.pay_to_address
)
SELECT
  md.chain,
  md.token_address,
  md.provider,
  md.service,
  md.domain,
  md.pay_to_address,
  COALESCE(ta.transfer_count, 0)::bigint AS transfer_count,
  COALESCE(ta.unique_payer_count, 0)::bigint AS unique_payer_count,
  COALESCE(ta.total_amount_atomic, '0') AS total_amount_atomic,
  ta.first_block,
  ta.last_block,
  ta.first_transfer_at,
  ta.latest_transfer_at,
  md.first_seen_at,
  md.last_seen_at,
  md.resource_count AS known_resource_count,
  md.option_count AS known_option_count,
  md.service_count AS known_service_count,
  COALESCE(ta.matched_option_transfer_count, 0)::bigint AS matched_option_transfer_count,
  (md.resource_count > 1 OR md.service_count > 1) AS shared_payto,
  CASE
    WHEN md.resource_count > 1 OR md.service_count > 1 THEN 'shared_payto'
    WHEN COALESCE(ta.matched_option_transfer_count, 0) > 0 THEN 'amount_matched'
    ELSE 'provider_payto'
  END AS endpoint_attribution_mode,
  md.possible_resources
FROM active_payto_metadata md
LEFT JOIN transfer_activity ta
  ON ta.chain = md.chain
 AND ta.token_address = md.token_address
 AND ta.pay_to_address = md.pay_to_address;
