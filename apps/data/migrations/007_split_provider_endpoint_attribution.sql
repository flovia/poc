ALTER TABLE x402_attributed_transfers
  ADD COLUMN IF NOT EXISTS provider_attribution_status text NOT NULL DEFAULT 'unknown_or_non_x402',
  ADD COLUMN IF NOT EXISTS endpoint_attribution_status text NOT NULL DEFAULT 'unknown_endpoint',
  ADD COLUMN IF NOT EXISTS provider_confidence double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS endpoint_confidence double precision NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE x402_attributed_transfers
    ADD CONSTRAINT x402_attributed_transfers_provider_status_check CHECK (
      provider_attribution_status IN (
        'known_provider_payto',
        'known_provider_shared_payto',
        'known_provider_amount_matched',
        'candidate_provider_payto',
        'unknown_or_non_x402'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE x402_attributed_transfers
    ADD CONSTRAINT x402_attributed_transfers_endpoint_status_check CHECK (
      endpoint_attribution_status IN (
        'direct_endpoint',
        'amount_inferred_endpoint',
        'unresolved_shared_payto',
        'unresolved_known_payto',
        'candidate_unknown_endpoint',
        'unknown_endpoint'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS x402_attributed_transfers_provider_status_idx
  ON x402_attributed_transfers (provider_attribution_status, block_number DESC, log_index DESC);

CREATE INDEX IF NOT EXISTS x402_attributed_transfers_endpoint_status_idx
  ON x402_attributed_transfers (endpoint_attribution_status, block_number DESC, log_index DESC);

UPDATE x402_attributed_transfers
SET
  provider_attribution_status = CASE
    WHEN attribution_status IN ('direct_payto_endpoint', 'amount_inferred_endpoint', 'bundled_payto_unknown_endpoint')
      THEN 'known_provider_payto'
    WHEN attribution_status = 'candidate_x402_payto' THEN 'candidate_provider_payto'
    ELSE 'unknown_or_non_x402'
  END,
  endpoint_attribution_status = CASE
    WHEN attribution_status = 'direct_payto_endpoint' THEN 'direct_endpoint'
    WHEN attribution_status = 'amount_inferred_endpoint' THEN 'amount_inferred_endpoint'
    WHEN attribution_status = 'bundled_payto_unknown_endpoint' THEN 'unresolved_shared_payto'
    WHEN attribution_status = 'candidate_x402_payto' THEN 'candidate_unknown_endpoint'
    ELSE 'unknown_endpoint'
  END,
  provider_confidence = CASE
    WHEN attribution_status IN ('direct_payto_endpoint', 'amount_inferred_endpoint', 'bundled_payto_unknown_endpoint') THEN 0.8
    WHEN attribution_status = 'candidate_x402_payto' THEN LEAST(confidence, 0.65)
    ELSE 0
  END,
  endpoint_confidence = CASE
    WHEN attribution_status = 'direct_payto_endpoint' THEN 1.0
    WHEN attribution_status = 'amount_inferred_endpoint' THEN 0.75
    WHEN attribution_status = 'bundled_payto_unknown_endpoint' THEN 0.2
    WHEN attribution_status = 'candidate_x402_payto' THEN 0.1
    ELSE 0
  END;
