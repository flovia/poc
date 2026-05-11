ALTER TABLE token_transfers
  DROP CONSTRAINT IF EXISTS token_transfers_source_check;

ALTER TABLE token_transfers
  ADD CONSTRAINT token_transfers_source_check
    CHECK (source IN ('cdp-sql', 'goldsky', 'fixture'));
