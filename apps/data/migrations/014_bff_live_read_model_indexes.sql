CREATE INDEX IF NOT EXISTS goldsky_x402_paytos_lower_to_amount_idx
  ON goldsky_webhook_transfers_x402_paytos (lower(to_owner_address), amount);

CREATE INDEX IF NOT EXISTS goldsky_x402_paytos_lower_from_to_amount_idx
  ON goldsky_webhook_transfers_x402_paytos (lower(from_owner_address), lower(to_owner_address), amount);

CREATE INDEX IF NOT EXISTS x402_payment_options_lower_payto_amount_active_idx
  ON x402_payment_options (lower(pay_to_address), amount_atomic)
  WHERE active;
