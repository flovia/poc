export const POSTGRES_LIVE_PROVIDER_QUERY = `
      WITH base_x402_payment_amounts AS (
        SELECT DISTINCT
          lower(po.pay_to_address) AS pay_to,
          po.amount_atomic::numeric AS amount_atomic
        FROM x402_payment_options po
        JOIN x402_resources r ON r.resource_id = po.resource_id
        WHERE lower(po.chain) = 'base'
          AND po.pay_to_address IS NOT NULL
          AND po.amount_atomic IS NOT NULL
          AND po.active
          AND r.active
      ),
      base_provider_grouped AS (
        SELECT
          'base' AS network,
          'USDC' AS asset,
          lower(g.to_owner_address) AS pay_to,
          CASE
            WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
              THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
            ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
          END AS service_id,
          CASE
            WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
              THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
            ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
          END AS service_name,
          COUNT(*)::int AS transaction_count,
          COUNT(DISTINCT lower(g.from_owner_address))::int AS unique_sender_count,
          COALESCE(SUM(g.amount), 0)::text AS total_volume_atomic,
          to_timestamp(MIN(g.block_timestamp)) AS first_seen_at,
          to_timestamp(MAX(g.block_timestamp)) AS last_seen_at
        FROM goldsky_webhook_transfers_x402_paytos g
        LEFT JOIN x402_provider_activity a
          ON lower(a.pay_to_address) = lower(g.to_owner_address)
        WHERE g.from_owner_address IS NOT NULL
          AND g.to_owner_address IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM base_x402_payment_amounts option_amount
            WHERE option_amount.pay_to = lower(g.to_owner_address)
              AND g.amount::numeric = option_amount.amount_atomic
          )
        GROUP BY lower(g.to_owner_address), service_id, service_name
      ),
      pay_sh_solana_offer_prices AS (
        SELECT DISTINCT
          o.provider_fqn,
          CASE
            WHEN lower(o.chain) IN ('solana', 'solana mainnet')
              AND lower(o.protocol) = 'mpp'
              THEN 'solana mainnet (mpp)'
            WHEN lower(o.chain) IN ('solana', 'solana mainnet') THEN 'solana mainnet'
            ELSE lower(o.chain)
          END AS network,
          CASE
            WHEN lower(o.asset) = 'usdc' THEN 'USDC'
            WHEN lower(o.asset) = 'usdt' THEN 'USDT'
            ELSE o.asset
          END AS asset,
          o.pay_to_address AS pay_to,
          ROUND((o.probe_price_usd::numeric * 1000000))::numeric AS amount_atomic
        FROM pay_sh_payment_offers o
        WHERE o.provider_fqn IS NOT NULL
          AND o.pay_to_address IS NOT NULL
          AND o.probe_price_usd IS NOT NULL
          AND o.probe_price_usd > 0
      ),
      solana_provider_grouped AS (
        SELECT
          CASE
            WHEN lower(s.chain) = 'solana'
              AND EXISTS (SELECT 1 FROM unnest(s.protocols) protocol WHERE lower(protocol) = 'mpp')
              THEN 'solana mainnet (mpp)'
            WHEN lower(s.chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(s.chain)
          END AS network,
          CASE
            WHEN lower(s.asset) = 'usdc' THEN 'USDC'
            WHEN lower(s.asset) = 'usdt' THEN 'USDT'
            ELSE s.asset
          END AS asset,
          s.pay_to_address AS pay_to,
          provider.provider_fqn AS service_id,
          provider.provider_fqn AS service_name,
          COUNT(*)::int AS transaction_count,
          COUNT(DISTINCT s.from_token_account)::int AS unique_sender_count,
          COALESCE(SUM(s.amount), 0)::text AS total_volume_atomic,
          MIN(s.block_timestamp) AS first_seen_at,
          MAX(s.block_timestamp) AS last_seen_at
        FROM payment_attributed_transfers_solana s
        CROSS JOIN LATERAL unnest(s.provider_fqns) AS provider(provider_fqn)
        JOIN pay_sh_solana_offer_prices offer_price
          ON provider.provider_fqn = offer_price.provider_fqn
         AND offer_price.network = CASE
            WHEN lower(s.chain) = 'solana'
              AND EXISTS (SELECT 1 FROM unnest(s.protocols) protocol WHERE lower(protocol) = 'mpp')
              THEN 'solana mainnet (mpp)'
            WHEN lower(s.chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(s.chain)
          END
         AND offer_price.asset = CASE
            WHEN lower(s.asset) = 'usdc' THEN 'USDC'
            WHEN lower(s.asset) = 'usdt' THEN 'USDT'
            ELSE s.asset
          END
         AND offer_price.pay_to = s.pay_to_address
        WHERE s.provider_fqns IS NOT NULL
          AND array_length(s.provider_fqns, 1) >= 1
          AND s.from_token_account IS NOT NULL
          AND s.pay_to_address IS NOT NULL
          AND (
            s.amount::numeric = offer_price.amount_atomic
            OR s.amount::numeric <= 10000000
          )
        GROUP BY 1, 2, 3, 4, 5
      ),
      provider_grouped AS (
        SELECT * FROM base_provider_grouped
        UNION ALL
        SELECT * FROM solana_provider_grouped
      ),
      pay_sh_provider_catalog AS (
        SELECT
          p.provider_fqn,
          min(lower(o.pay_to_address)) FILTER (WHERE o.pay_to_address IS NOT NULL) AS pay_to,
          p.provider_fqn AS service_id,
          COALESCE(NULLIF(p.title, ''), p.provider_fqn) AS service_name,
          p.title,
          p.description,
          p.use_case,
          p.category,
          p.service_url,
          max(to_jsonb(p) ->> 'has_metering') AS has_metering,
          max(to_jsonb(p) ->> 'has_free_tier') AS has_free_tier,
          max(to_jsonb(p) ->> 'provider_sha') AS provider_sha,
          max(to_jsonb(p) ->> 'registry_version') AS registry_version,
          max(to_jsonb(p) ->> 'registry_generated_at') AS registry_generated_at,
          max(to_jsonb(p) ->> 'registry_source_url') AS registry_source_url,
          p.endpoint_count,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'protocol', o.protocol,
                'chain', o.chain,
                'asset', o.asset,
                'payToAddress', o.pay_to_address,
                'probePriceUsd', o.probe_price_usd
              ) ORDER BY o.chain, o.asset, o.pay_to_address
            ) FILTER (WHERE o.provider_fqn IS NOT NULL),
            '[]'::jsonb
          ) AS offers,
          min(o.protocol) AS protocol,
          min(o.chain) AS offer_chain,
          min(o.asset) AS asset_symbol,
          p.price_range_min_usd,
          p.price_range_max_usd
        FROM pay_sh_providers p
        LEFT JOIN pay_sh_payment_offers o ON o.provider_fqn = p.provider_fqn
        GROUP BY
          p.provider_fqn,
          p.title,
          p.description,
          p.use_case,
          p.category,
          p.service_url,
          p.endpoint_count,
          p.price_range_min_usd,
          p.price_range_max_usd
      ),
      provider_pay_tos AS (
        SELECT DISTINCT
          provider_fqn,
          CASE
            WHEN lower(chain) = 'solana' AND lower(protocol) = 'mpp' THEN 'solana mainnet (mpp)'
            WHEN lower(chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(chain)
          END AS network,
          CASE
            WHEN lower(asset) = 'usdc' THEN 'USDC'
            WHEN lower(asset) = 'usdt' THEN 'USDT'
            ELSE asset
          END AS asset,
          chain AS display_chain,
          CASE
            WHEN lower(chain) = 'base' THEN lower(pay_to_address)
            ELSE pay_to_address
          END AS pay_to,
          protocol
        FROM pay_sh_payment_offers
        WHERE pay_to_address IS NOT NULL
      ),
      provider_metrics AS (
        SELECT
          pc.provider_fqn,
          ppt.network,
          ppt.asset,
          min(ppt.display_chain) AS display_chain,
          ppt.pay_to,
          min(ppt.protocol) AS protocol,
          COALESCE(SUM(pg.transaction_count), 0)::int AS transaction_count,
          COALESCE(SUM(pg.unique_sender_count), 0)::int AS unique_sender_count,
          COALESCE(SUM(pg.total_volume_atomic::numeric), 0)::text AS total_volume_atomic,
          MIN(pg.first_seen_at) AS first_seen_at,
          MAX(pg.last_seen_at) AS last_seen_at
        FROM pay_sh_provider_catalog pc
        JOIN provider_pay_tos ppt ON ppt.provider_fqn = pc.provider_fqn
        LEFT JOIN provider_grouped pg
          ON pg.pay_to = ppt.pay_to
         AND pg.network = ppt.network
         AND pg.asset = ppt.asset
         AND (pg.network = 'base' OR pg.service_id = ppt.provider_fqn)
        GROUP BY pc.provider_fqn, ppt.network, ppt.asset, ppt.pay_to
      )
      SELECT
        pg.network,
        pg.asset,
        pg.pay_to,
        pg.service_id,
        pg.service_name,
        NULL AS title,
        NULL AS description,
        NULL AS use_case,
        NULL AS category,
        NULL AS service_url,
        NULL AS has_metering,
        NULL AS has_free_tier,
        NULL AS provider_sha,
        NULL AS registry_version,
        NULL AS registry_generated_at,
        NULL AS registry_source_url,
        NULL AS endpoint_count,
        '[]'::jsonb AS offers,
        NULL AS protocol,
        NULL AS offer_chain,
        NULL AS asset_symbol,
        NULL AS price_range_min_usd,
        NULL AS price_range_max_usd,
        NULL AS pay_sh_provider_fqn,
        COALESCE(resources.resources, '[]'::jsonb) AS resources,
        pg.transaction_count,
        pg.unique_sender_count,
        pg.total_volume_atomic,
        pg.first_seen_at,
        pg.last_seen_at
      FROM provider_grouped pg
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'resource', r.resource_url,
            'network', po.chain,
            'asset', CASE
              WHEN lower(po.token_address) = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' THEN 'USDC'
              ELSE po.token_address
            END,
            'amountAtomic', po.amount_atomic::text,
            'description', r.raw ->> 'description',
            'method', r.raw #>> '{extensions,bazaar,info,input,method}',
            'inputSchema', r.raw #> '{extensions,bazaar,schema}',
            'lastUpdated', r.raw ->> 'lastUpdated',
            'x402Version', r.raw -> 'x402Version',
            'l30DaysTotalCalls', r.raw #> '{quality,l30DaysTotalCalls}',
            'l30DaysUniquePayers', r.raw #> '{quality,l30DaysUniquePayers}'
          ) ORDER BY r.resource_url
        ) AS resources
        FROM x402_payment_options po
        JOIN x402_resources r ON r.resource_id = po.resource_id
        WHERE lower(po.pay_to_address) = pg.pay_to
          AND po.active
          AND r.active
      ) resources ON true
      WHERE lower(pg.service_id) IN ('pro-api.coingecko.com', 'coingecko', 'api.nansen.ai', 'nansen')
      UNION ALL
      SELECT
        pm.network,
        pm.asset,
        pm.pay_to,
        pc.service_id,
        pc.service_name,
        pc.title,
        pc.description,
        pc.use_case,
        pc.category,
        pc.service_url,
        pc.has_metering,
        pc.has_free_tier,
        pc.provider_sha,
        pc.registry_version,
        pc.registry_generated_at,
        pc.registry_source_url,
        pc.endpoint_count,
        pc.offers,
        pm.protocol,
        pm.display_chain AS offer_chain,
        pm.asset AS asset_symbol,
        pc.price_range_min_usd,
        pc.price_range_max_usd,
        pc.provider_fqn AS pay_sh_provider_fqn,
        COALESCE(resources.resources, '[]'::jsonb) AS resources,
        pm.transaction_count,
        pm.unique_sender_count,
        pm.total_volume_atomic,
        COALESCE(pm.first_seen_at, to_timestamp(0)) AS first_seen_at,
        COALESCE(pm.last_seen_at, to_timestamp(0)) AS last_seen_at
      FROM pay_sh_provider_catalog pc
      JOIN provider_metrics pm ON pm.provider_fqn = pc.provider_fqn
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(resource ORDER BY resource ->> 'resource') AS resources
        FROM (
          SELECT jsonb_build_object(
            'resource', r.resource_url,
            'network', po.chain,
            'asset', CASE
              WHEN lower(po.token_address) = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' THEN 'USDC'
              ELSE po.token_address
            END,
            'amountAtomic', po.amount_atomic::text,
            'description', r.raw ->> 'description',
            'method', r.raw #>> '{extensions,bazaar,info,input,method}',
            'inputSchema', r.raw #> '{extensions,bazaar,schema}',
            'lastUpdated', r.raw ->> 'lastUpdated',
            'x402Version', r.raw -> 'x402Version',
            'l30DaysTotalCalls', r.raw #> '{quality,l30DaysTotalCalls}',
            'l30DaysUniquePayers', r.raw #> '{quality,l30DaysUniquePayers}'
          ) AS resource
          FROM x402_payment_options po
          JOIN x402_resources r ON r.resource_id = po.resource_id
          WHERE CASE
              WHEN lower(po.chain) = 'base' THEN lower(po.pay_to_address)
              ELSE po.pay_to_address
            END = pm.pay_to
            AND po.active
            AND r.active
          UNION ALL
          SELECT jsonb_build_object(
            'resource', CASE
              WHEN pr.resource_url ~ '^https?://' THEN pr.resource_url
              WHEN pc.service_url IS NOT NULL AND pc.service_url <> ''
                THEN regexp_replace(pc.service_url, '/+$', '') || '/' || regexp_replace(pr.resource_url, '^/+', '')
              ELSE pr.resource_url
            END,
            'network', pm.network,
            'asset', pm.asset,
            'amountAtomic', pr.observed_spend_atomic::text,
            'description', pr.description,
            'method', pr.method,
            'transactionCount', pr.transaction_count,
            'totalAmountAtomic', pr.observed_spend_atomic::text
          ) AS resource
          FROM pay_sh_provider_resources pr
          WHERE pr.provider_fqn = pc.provider_fqn
        ) resource_rows
      ) resources ON true
      WHERE pm.pay_to IS NOT NULL
      ORDER BY transaction_count DESC, pay_to ASC
`;

export const POSTGRES_LIVE_CUSTOMER_QUERY = `
      WITH base_x402_payment_amounts AS (
        SELECT DISTINCT
          lower(po.pay_to_address) AS pay_to,
          po.amount_atomic::numeric AS amount_atomic
        FROM x402_payment_options po
        JOIN x402_resources r ON r.resource_id = po.resource_id
        WHERE lower(po.chain) = 'base'
          AND po.pay_to_address IS NOT NULL
          AND po.amount_atomic IS NOT NULL
          AND po.active
          AND r.active
      ),
      base_attributed_grouped AS (
        SELECT
          'base' AS network,
          'USDC' AS asset,
          lower(g.from_owner_address) AS payer,
          lower(g.to_owner_address) AS pay_to,
          CASE
            WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
              THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
            ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
          END AS service_id,
          CASE
            WHEN lower(g.to_owner_address) = '0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'
              THEN COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), 'pro-api.coingecko.com')
            ELSE COALESCE(NULLIF(a.service, ''), NULLIF(a.provider, ''), NULLIF(a.domain, ''), lower(g.to_owner_address))
          END AS service_name,
          COUNT(*)::int AS transaction_count,
          COALESCE(SUM(g.amount), 0)::text AS total_volume_atomic,
          to_timestamp(MIN(g.block_timestamp)) AS first_seen_at,
          to_timestamp(MAX(g.block_timestamp)) AS last_seen_at,
          jsonb_agg(
            jsonb_build_object(
              'at', to_timestamp(g.block_timestamp),
              'amountAtomic', g.amount::text,
              'transactionId', g.transaction_hash
            ) ORDER BY g.block_timestamp DESC, g.transaction_hash DESC
          ) AS timeline_events
        FROM goldsky_webhook_transfers_x402_paytos g
        LEFT JOIN x402_provider_activity a
          ON lower(a.pay_to_address) = lower(g.to_owner_address)
        WHERE g.from_owner_address IS NOT NULL
          AND g.to_owner_address IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM base_x402_payment_amounts option_amount
            WHERE option_amount.pay_to = lower(g.to_owner_address)
              AND g.amount::numeric = option_amount.amount_atomic
          )
        GROUP BY lower(g.from_owner_address), lower(g.to_owner_address), service_id, service_name
      ),
      pay_sh_solana_offer_prices AS (
        SELECT DISTINCT
          o.provider_fqn,
          CASE
            WHEN lower(o.chain) IN ('solana', 'solana mainnet')
              AND lower(o.protocol) = 'mpp'
              THEN 'solana mainnet (mpp)'
            WHEN lower(o.chain) IN ('solana', 'solana mainnet') THEN 'solana mainnet'
            ELSE lower(o.chain)
          END AS network,
          CASE
            WHEN lower(o.asset) = 'usdc' THEN 'USDC'
            WHEN lower(o.asset) = 'usdt' THEN 'USDT'
            ELSE o.asset
          END AS asset,
          o.pay_to_address AS pay_to,
          ROUND((o.probe_price_usd::numeric * 1000000))::numeric AS amount_atomic
        FROM pay_sh_payment_offers o
        WHERE o.provider_fqn IS NOT NULL
          AND o.pay_to_address IS NOT NULL
          AND o.probe_price_usd IS NOT NULL
          AND o.probe_price_usd > 0
      ),
      solana_attributed_grouped AS (
        SELECT
          CASE
            WHEN lower(s.chain) = 'solana'
              AND EXISTS (SELECT 1 FROM unnest(s.protocols) protocol WHERE lower(protocol) = 'mpp')
              THEN 'solana mainnet (mpp)'
            WHEN lower(s.chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(s.chain)
          END AS network,
          CASE
            WHEN lower(s.asset) = 'usdc' THEN 'USDC'
            WHEN lower(s.asset) = 'usdt' THEN 'USDT'
            ELSE s.asset
          END AS asset,
          s.from_token_account AS payer,
          s.pay_to_address AS pay_to,
          provider.provider_fqn AS service_id,
          provider.provider_fqn AS service_name,
          COUNT(*)::int AS transaction_count,
          COALESCE(SUM(s.amount), 0)::text AS total_volume_atomic,
          MIN(s.block_timestamp) AS first_seen_at,
          MAX(s.block_timestamp) AS last_seen_at,
          jsonb_agg(
            jsonb_build_object(
              'at', s.block_timestamp,
              'amountAtomic', s.amount::text,
              'transactionId', s.signature
            ) ORDER BY s.block_timestamp DESC, s.signature DESC
          ) AS timeline_events
        FROM payment_attributed_transfers_solana s
        CROSS JOIN LATERAL unnest(s.provider_fqns) AS provider(provider_fqn)
        JOIN pay_sh_solana_offer_prices offer_price
          ON provider.provider_fqn = offer_price.provider_fqn
         AND offer_price.network = CASE
            WHEN lower(s.chain) = 'solana'
              AND EXISTS (SELECT 1 FROM unnest(s.protocols) protocol WHERE lower(protocol) = 'mpp')
              THEN 'solana mainnet (mpp)'
            WHEN lower(s.chain) = 'solana' THEN 'solana mainnet'
            ELSE lower(s.chain)
          END
         AND offer_price.asset = CASE
            WHEN lower(s.asset) = 'usdc' THEN 'USDC'
            WHEN lower(s.asset) = 'usdt' THEN 'USDT'
            ELSE s.asset
          END
         AND offer_price.pay_to = s.pay_to_address
        WHERE s.provider_fqns IS NOT NULL
          AND array_length(s.provider_fqns, 1) >= 1
          AND s.from_token_account IS NOT NULL
          AND s.pay_to_address IS NOT NULL
          AND (
            s.amount::numeric = offer_price.amount_atomic
            OR s.amount::numeric <= 10000000
          )
        GROUP BY 1, 2, 3, 4, 5, 6
      ),
      attributed_grouped AS (
        SELECT * FROM base_attributed_grouped
        UNION ALL
        SELECT * FROM solana_attributed_grouped
      )
      SELECT
        network,
        asset,
        payer,
        pay_to,
        service_id,
        service_name,
        transaction_count,
        total_volume_atomic,
        first_seen_at,
        last_seen_at,
        timeline_events
      FROM attributed_grouped
      ORDER BY total_volume_atomic::numeric DESC, transaction_count DESC
`;
