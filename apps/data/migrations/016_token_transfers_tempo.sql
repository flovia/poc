ALTER TABLE token_transfers DROP CONSTRAINT IF EXISTS token_transfers_chain_check;
ALTER TABLE token_transfers DROP CONSTRAINT IF EXISTS token_transfers_token_address_check;

ALTER TABLE token_transfers
  ADD CONSTRAINT token_transfers_chain_check CHECK (chain IN ('base', 'tempo'));

ALTER TABLE token_transfers
  ADD CONSTRAINT token_transfers_token_address_check CHECK (
    token_address IN (
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      '0x20c000000000000000000000b9537d11c60e8b50'
    )
  );
